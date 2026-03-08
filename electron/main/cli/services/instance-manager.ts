import { spawnSync } from 'child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { tmpdir } from 'os';
import { GatewayManager } from '../../../gateway/manager';
import { logger } from '../../../utils/logger';
import {
  getOpenClawDir,
  getOpenClawStatus,
  getOpenClawEntryPath,
} from '../../../utils/paths';
import { CliError } from '../types';

const DEFAULT_INSTANCE_NAME = 'openclaw';
const DEFAULT_INSTANCE_TYPE = 'server';

export interface RuntimeState {
  ready: boolean;
  runtimePath: string;
  repaired: boolean;
  source?: string;
}

export interface InstanceState {
  name: string;
  type: string;
  status: string;
  pid: number | null;
  port: number | null;
  startedAt: string | null;
  runtimePath: string;
}

export interface LogsOptions {
  lines?: number;
  follow?: boolean;
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

  const parent = dirname(dst);
  await mkdir(parent, { recursive: true });
  await rm(dst, { recursive: true, force: true }).catch(() => undefined);
  await cp(src, dst, { recursive: true, force: true, errorOnExist: false });
  if (!existsSync(parent)) {
    throw new Error(`Runtime target parent missing after copy: ${parent}`);
  }
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

    throw new CliError(
      'RUNTIME_REPAIR_FAILED',
      `OpenClaw runtime is missing or incomplete at ${this.runtimePath}, and automatic repair failed.`,
      {
        runtimePath: this.runtimePath,
        archiveCandidates: getOfflineArchiveCandidates(),
        directoryCandidates: getRuntimeDirectoryCandidates(),
      },
    );
  }

  async start(): Promise<InstanceState> {
    await this.ensureRuntime();
    try {
      await this.gateway.start();
      return await this.status();
    } catch (error) {
      throw new CliError('GATEWAY_START_FAILED', `Failed to start OpenClaw gateway: ${String(error)}`);
    }
  }

  async stop(): Promise<InstanceState> {
    const current = this.gateway.getStatus();
    if (current.state === 'stopped') {
      return this.toInstanceState(current);
    }
    try {
      await this.gateway.stop();
      return this.toInstanceState(this.gateway.getStatus());
    } catch (error) {
      throw new CliError('GATEWAY_STOP_FAILED', `Failed to stop OpenClaw gateway: ${String(error)}`);
    }
  }

  async restart(): Promise<InstanceState> {
    await this.ensureRuntime();
    try {
      await this.gateway.restart();
      return await this.status();
    } catch (error) {
      throw new CliError('GATEWAY_START_FAILED', `Failed to restart OpenClaw gateway: ${String(error)}`);
    }
  }

  async status(): Promise<InstanceState> {
    const gatewayStatus = this.gateway.getStatus();
    return this.toInstanceState(gatewayStatus);
  }

  async ps(): Promise<InstanceState[]> {
    return [await this.status()];
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

  private toInstanceState(gatewayStatus: ReturnType<GatewayManager['getStatus']>): InstanceState {
    return {
      name: DEFAULT_INSTANCE_NAME,
      type: DEFAULT_INSTANCE_TYPE,
      status: gatewayStatus.state,
      pid: gatewayStatus.pid ?? null,
      port: gatewayStatus.port ?? null,
      startedAt: gatewayStatus.connectedAt ? new Date(gatewayStatus.connectedAt).toISOString() : null,
      runtimePath: this.runtimePath,
    };
  }
}
