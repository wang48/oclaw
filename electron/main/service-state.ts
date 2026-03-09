import { existsSync, readFileSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import WebSocket from 'ws';
import { getOclawConfigDir, getOpenClawDir } from '../utils/paths';
import { PORTS } from '../utils/config';

export type OclawAppState = 'starting' | 'running-hidden' | 'running-visible' | 'stopped' | 'error';
export type OclawGatewayState = 'starting' | 'running' | 'stopped' | 'error' | 'reconnecting';

export interface OclawServiceState {
  version: 1;
  app: {
    pid: number | null;
    state: OclawAppState;
    trayReady: boolean;
    windowVisible: boolean;
    startedAt: string | null;
  };
  gateway: {
    pid: number | null;
    state: OclawGatewayState;
    port: number;
    runtimePath: string;
    startedAt: string | null;
    lastError?: string | null;
  };
  source: 'gui' | 'cli';
  updatedAt: string;
}

const VERSION = 1;

export function getServiceStateFilePath(): string {
  if (process.env.OCLAW_SERVICE_STATE_FILE) {
    return process.env.OCLAW_SERVICE_STATE_FILE;
  }
  return join(getOclawConfigDir(), 'runtime', 'service-state.json');
}

export function defaultServiceState(): OclawServiceState {
  return {
    version: VERSION,
    app: {
      pid: null,
      state: 'stopped',
      trayReady: false,
      windowVisible: false,
      startedAt: null,
    },
    gateway: {
      pid: null,
      state: 'stopped',
      port: PORTS.OPENCLAW_GATEWAY,
      runtimePath: getOpenClawDir(),
      startedAt: null,
      lastError: null,
    },
    source: 'gui',
    updatedAt: new Date().toISOString(),
  };
}

export function readServiceState(): OclawServiceState {
  const filePath = getServiceStateFilePath();
  if (!existsSync(filePath)) return defaultServiceState();
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as Partial<OclawServiceState>;
    if (parsed.version !== VERSION) return defaultServiceState();
    return {
      ...defaultServiceState(),
      ...parsed,
      app: {
        ...defaultServiceState().app,
        ...parsed.app,
      },
      gateway: {
        ...defaultServiceState().gateway,
        ...parsed.gateway,
      },
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return defaultServiceState();
  }
}

export async function writeServiceState(state: OclawServiceState): Promise<void> {
  const filePath = getServiceStateFilePath();
  await mkdir(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}

export async function updateServiceState(
  updater: Partial<OclawServiceState> | ((current: OclawServiceState) => OclawServiceState)
): Promise<OclawServiceState> {
  const current = readServiceState();
  const next = typeof updater === 'function'
    ? updater(current)
    : {
        ...current,
        ...updater,
        app: {
          ...current.app,
          ...(updater.app || {}),
        },
        gateway: {
          ...current.gateway,
          ...(updater.gateway || {}),
        },
      };

  next.updatedAt = new Date().toISOString();
  await writeServiceState(next);
  return next;
}

export function isPidRunning(pid: number | null | undefined): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function probeGatewayPort(port: number, timeoutMs = 1500): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        // ignore
      }
      resolve(false);
    }, timeoutMs);

    ws.on('open', () => {
      clearTimeout(timer);
      ws.close();
      resolve(true);
    });

    ws.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
