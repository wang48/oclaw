import { exec, spawn, spawnSync } from 'child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { tmpdir } from 'os';
import { shell } from 'electron';
import { GatewayManager } from '../../../gateway/manager';
import { logger } from '../../../utils/logger';
import { PORTS } from '../../../utils/config';
import {
  getOpenClawDir,
  getOpenClawEntryPath,
  getOpenClawStatus,
} from '../../../utils/paths';
import { getSetting } from '../../../utils/store';
import { buildServiceArgs } from '../../service-flags';
import {
  defaultServiceState,
  isPidRunning,
  probeGatewayPort,
  readServiceState,
  updateServiceState,
} from '../../service-state';
import {
  CliError,
  type ClientState,
  type InstanceState,
  type RuntimeState,
  type ServiceStatus,
  type WebOpenResult,
} from '../types';

const START_TIMEOUT_MS = 60000;

export interface LogsOptions {
  lines?: number;
  follow?: boolean;
}

export interface ExecOptions {
  inheritStdio?: boolean;
}

function isOpenClawRuntimeBuilt(runtimeDir: string): boolean {
  const entryPath = getOpenClawEntryPath();
  if (!existsSync(entryPath)) return false;
  const distEntryCandidates = [
    join(runtimeDir, 'dist', 'entry.js'),
    join(runtimeDir, 'dist', 'entry.mjs'),
    join(runtimeDir, 'dist', 'entry.cjs'),
  ];
  return distEntryCandidates.some((candidate) => existsSync(candidate));
}

function getOfflineArchiveCandidates(): string[] {
  const candidates = [
    join(process.resourcesPath, 'resources', 'openclaw-offline.tgz'),
    join(process.resourcesPath, 'runtime', 'openclaw-offline.tgz'),
    join(process.cwd(), 'resources', 'openclaw-offline.tgz'),
    join(process.cwd(), 'runtime', 'openclaw-offline.tgz'),
    join(process.cwd(), 'build', 'openclaw-offline.tgz'),
  ];
  return [...new Set(candidates)];
}

function getRuntimeDirectoryCandidates(): string[] {
  const candidates = [
    join(process.resourcesPath, 'openclaw'),
    join(process.resourcesPath, 'resources', 'openclaw'),
    join(process.cwd(), 'build', 'openclaw'),
    join(process.cwd(), 'resources', 'openclaw'),
    join(process.cwd(), 'node_modules', 'openclaw'),
  ];
  return [...new Set(candidates)];
}

async function findExtractedRuntimeDir(root: string): Promise<string | null> {
  const directEntry = join(root, 'openclaw.mjs');
  if (existsSync(directEntry)) return root;

  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = join(root, entry.name);
    if (existsSync(join(candidate, 'openclaw.mjs'))) {
      return candidate;
    }
  }
  return null;
}

async function copyRuntime(sourceDir: string, targetDir: string): Promise<void> {
  const src = resolve(sourceDir);
  const dst = resolve(targetDir);
  if (src === dst) return;
  await mkdir(dirname(dst), { recursive: true }).catch(() => undefined);
  await rm(dst, { recursive: true, force: true }).catch(() => undefined);
  await cp(src, dst, { recursive: true, force: true, errorOnExist: false });
}

async function tryRepairFromArchive(targetDir: string): Promise<string | null> {
  for (const archive of getOfflineArchiveCandidates()) {
    if (!existsSync(archive)) continue;
    const tempDir = await mkdtemp(join(tmpdir(), 'oclaw-runtime-'));
    try {
      const extract = spawnSync('tar', ['-xzf', archive, '-C', tempDir], { stdio: 'pipe' });
      if (extract.status !== 0) continue;
      const runtimeDir = await findExtractedRuntimeDir(tempDir);
      if (!runtimeDir) continue;
      await copyRuntime(runtimeDir, targetDir);
      if (isOpenClawRuntimeBuilt(targetDir)) {
        return `archive:${archive}`;
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
  return null;
}

async function tryRepairFromDirectory(targetDir: string): Promise<string | null> {
  for (const sourceDir of getRuntimeDirectoryCandidates()) {
    if (!existsSync(sourceDir)) continue;
    if (!isOpenClawRuntimeBuilt(sourceDir)) continue;
    await copyRuntime(sourceDir, targetDir);
    if (isOpenClawRuntimeBuilt(targetDir)) {
      return `dir:${sourceDir}`;
    }
  }
  return null;
}

async function* followLogFile(filePath: string): AsyncIterable<string> {
  let cursor = 0;
  try {
    const s = await stat(filePath);
    cursor = s.size;
  } catch {
    cursor = 0;
  }

  while (true) {
    const s = await stat(filePath).catch(() => null);
    if (!s) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 800));
      continue;
    }
    if (s.size > cursor) {
      const content = await readFile(filePath, 'utf-8').catch(() => '');
      const nextChunk = content.slice(cursor);
      cursor = s.size;
      if (nextChunk) {
        yield nextChunk;
      }
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 800));
  }
}

function getSpawnTarget(): { command: string; args: string[] } {
  if (appIsPackaged()) {
    return { command: process.execPath, args: [] };
  }
  const entryArg = process.argv[1];
  if (!entryArg) {
    throw new Error('Unable to resolve Electron main entry');
  }
  return { command: process.execPath, args: [entryArg] };
}

function appIsPackaged(): boolean {
  return !process.defaultApp && !process.argv.some((arg) => arg.includes('electron'));
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs: number, errorMessage: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new CliError('CLI_ERROR', errorMessage);
}

async function getPidsListeningOnPort(port: number): Promise<number[]> {
  const command = process.platform === 'win32'
    ? `netstat -ano | findstr :${port}`
    : `lsof -i :${port} -sTCP:LISTEN -t`;

  return await new Promise((resolvePids) => {
    exec(command, { windowsHide: true, timeout: 5000 }, (_error, stdout) => {
      const output = stdout.trim();
      if (!output) {
        resolvePids([]);
        return;
      }
      if (process.platform === 'win32') {
        const pids = output
          .split(/\r?\n/)
          .map((line) => line.trim().split(/\s+/))
          .filter((parts) => parts.length >= 5 && parts[3] === 'LISTENING')
          .map((parts) => Number(parts[4]))
          .filter((value) => Number.isFinite(value));
        resolvePids([...new Set(pids)]);
        return;
      }
      const pids = output
        .split(/\r?\n/)
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value));
      resolvePids([...new Set(pids)]);
    });
  });
}

export class OpenClawInstanceManager {
  private readonly gateway: GatewayManager;
  private readonly runtimePath: string;

  constructor(gateway: GatewayManager) {
    this.gateway = gateway;
    this.runtimePath = getOpenClawDir();
  }

  async ensureRuntime(): Promise<RuntimeState> {
    const runtimeStatus = getOpenClawStatus();
    if (runtimeStatus.packageExists && runtimeStatus.isBuilt && isOpenClawRuntimeBuilt(this.runtimePath)) {
      return { ready: true, runtimePath: this.runtimePath, repaired: false };
    }

    const archiveSource = await tryRepairFromArchive(this.runtimePath);
    if (archiveSource) {
      logger.info(`OpenClaw runtime repaired from offline archive (${archiveSource})`);
      return { ready: true, runtimePath: this.runtimePath, repaired: true, source: archiveSource };
    }

    const dirSource = await tryRepairFromDirectory(this.runtimePath);
    if (dirSource) {
      logger.info(`OpenClaw runtime repaired from runtime directory (${dirSource})`);
      return { ready: true, runtimePath: this.runtimePath, repaired: true, source: dirSource };
    }

    throw new CliError('RUNTIME_REPAIR_FAILED', `OpenClaw runtime is missing or incomplete at ${this.runtimePath}.`);
  }

  getRuntimeInfo(): RuntimeState {
    const runtimeStatus = getOpenClawStatus();
    return {
      ready: runtimeStatus.packageExists && runtimeStatus.isBuilt && isOpenClawRuntimeBuilt(this.runtimePath),
      runtimePath: this.runtimePath,
      repaired: false,
    };
  }

  getPackageStatus() {
    return getOpenClawStatus();
  }

  async getVersion(): Promise<string | null> {
    return getOpenClawStatus().version ?? null;
  }

  async openControlUi(): Promise<WebOpenResult> {
    const service = await this.start();
    const token = await getSetting('gatewayToken');
    const url = `http://127.0.0.1:${service.instance.port ?? PORTS.OPENCLAW_GATEWAY}/?token=${encodeURIComponent(token || '')}`;
    await shell.openExternal(url);
    return {
      success: true,
      target: 'control',
      appStarted: service.app.status !== 'stopped',
      url,
    };
  }

  async start(): Promise<ServiceStatus> {
    await this.ensureRuntime();
    const current = await this.status();
    if (current.app.status !== 'stopped' && current.instance.status === 'running') {
      return current;
    }

    await this.launchBackgroundService('start-gateway');
    await waitFor(async () => {
      const next = await this.status();
      return next.app.status !== 'stopped' && next.instance.status === 'running';
    }, START_TIMEOUT_MS, 'Timed out waiting for background Oclaw service to become ready.');

    return await this.status();
  }

  async stop(): Promise<ServiceStatus> {
    const current = await this.status();
    if (current.app.status !== 'stopped') {
      await this.launchServiceCommand('stop-and-exit');
      await waitFor(async () => {
        const next = await this.status();
        return next.app.status === 'stopped' && next.instance.status === 'stopped';
      }, START_TIMEOUT_MS, 'Timed out waiting for background Oclaw service to stop.');
      return await this.status();
    }

    await this.emergencyStopGateway();
    await updateServiceState((state) => ({
      ...state,
      app: { ...state.app, pid: null, state: 'stopped', trayReady: false, windowVisible: false, startedAt: null },
      gateway: { ...state.gateway, pid: null, state: 'stopped', startedAt: null, lastError: null },
      source: 'cli',
    }));
    return await this.status();
  }

  async restart(): Promise<ServiceStatus> {
    await this.stop();
    return await this.start();
  }

  async status(): Promise<ServiceStatus> {
    const raw = readServiceState();
    const appAlive = isPidRunning(raw.app.pid);
    const gatewayAlive = raw.gateway.pid ? isPidRunning(raw.gateway.pid) : false;
    const gatewayHealthy = await probeGatewayPort(raw.gateway.port, 1200);

    const app: ClientState = {
      pid: appAlive ? raw.app.pid : null,
      status: appAlive ? raw.app.state : 'stopped',
      trayReady: appAlive ? raw.app.trayReady : false,
      windowVisible: appAlive ? raw.app.windowVisible : false,
      startedAt: appAlive ? raw.app.startedAt : null,
    };

    const instance: InstanceState = {
      name: 'openclaw',
      type: 'server',
      status: gatewayHealthy
        ? 'running'
        : (gatewayAlive && raw.gateway.state === 'starting' ? 'starting' : (raw.gateway.state === 'reconnecting' ? 'reconnecting' : 'stopped')),
      pid: gatewayHealthy || gatewayAlive ? raw.gateway.pid : null,
      port: raw.gateway.port ?? PORTS.OPENCLAW_GATEWAY,
      startedAt: gatewayHealthy || gatewayAlive ? raw.gateway.startedAt : null,
      runtimePath: raw.gateway.runtimePath || this.runtimePath,
    };

    if (!appAlive || !gatewayHealthy) {
      await updateServiceState((state) => ({
        ...state,
        app: {
          ...state.app,
          pid: app.pid,
          state: app.status,
          trayReady: app.trayReady,
          windowVisible: app.windowVisible,
          startedAt: app.startedAt,
        },
        gateway: {
          ...state.gateway,
          pid: instance.pid,
          state: instance.status === 'running' ? 'running' : 'stopped',
          startedAt: instance.startedAt,
          runtimePath: instance.runtimePath,
        },
        source: state.source,
      })).catch(() => undefined);
    }

    return { app, instance };
  }

  async ps(): Promise<InstanceState[]> {
    return [(await this.status()).instance];
  }

  async logs(options: LogsOptions): Promise<string | AsyncIterable<string>> {
    const lines = Math.max(1, options.lines ?? 200);
    if (options.follow) {
      const logFilePath = logger.getLogFilePath();
      if (!logFilePath || !existsSync(logFilePath)) {
        throw new CliError('INSTANCE_NOT_RUNNING', 'No log file available to follow.');
      }
      return followLogFile(logFilePath);
    }
    return logger.readLogFile(lines);
  }

  async execEmbeddedOpenClaw(args: string[], options: ExecOptions = {}): Promise<number> {
    await this.ensureRuntime();
    const entryScript = getOpenClawEntryPath();
    if (!existsSync(entryScript)) {
      throw new CliError('RUNTIME_MISSING', `OpenClaw entry script not found at ${entryScript}`);
    }
    return await new Promise<number>((resolveExec, rejectExec) => {
      const child = spawn(process.execPath, [entryScript, ...args], {
        cwd: this.runtimePath,
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          OPENCLAW_NO_RESPAWN: '1',
        } as NodeJS.ProcessEnv,
        windowsHide: true,
        stdio: options.inheritStdio === false ? 'ignore' : 'pipe',
      });

      child.on('error', (error) => {
        rejectExec(new CliError('OPENCLAW_EXEC_FAILED', `Failed to execute embedded OpenClaw: ${String(error)}`));
      });

      child.stdout?.on('data', (data) => {
        if (options.inheritStdio !== false) process.stdout.write(data);
      });
      child.stderr?.on('data', (data) => {
        if (options.inheritStdio !== false) process.stderr.write(data);
      });
      child.on('exit', (code) => resolveExec(code ?? 0));
    });
  }

  private async launchBackgroundService(command: 'start-gateway'): Promise<void> {
    await this.launchServiceCommand(command, true);
  }

  private async launchServiceCommand(command: 'start-gateway' | 'stop-and-exit', background = true): Promise<void> {
    const target = getSpawnTarget();
    const child = spawn(target.command, [...target.args, ...buildServiceArgs(command, background)], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
  }

  private async emergencyStopGateway(): Promise<void> {
    const state = readServiceState();
    const pids = new Set<number>();
    if (state.gateway.pid) pids.add(state.gateway.pid);
    for (const pid of await getPidsListeningOnPort(state.gateway.port || PORTS.OPENCLAW_GATEWAY)) {
      pids.add(pid);
    }

    for (const pid of pids) {
      if (!isPidRunning(pid)) continue;
      if (process.platform === 'win32') {
        await new Promise<void>((resolveKill) => {
          exec(`taskkill /F /PID ${pid} /T`, { windowsHide: true }, () => resolveKill());
        });
        continue;
      }
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        continue;
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
      if (isPidRunning(pid)) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // ignore
        }
      }
    }
  }
}
