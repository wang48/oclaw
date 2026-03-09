import { existsSync, readFileSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import WebSocket from 'ws';
import { getOclawConfigDir } from '../utils/paths';

export type GatewayRuntimeSource = 'gui' | 'cli';

export interface GatewayRuntimeState {
  version: 1;
  pid: number | null;
  port: number;
  runtimePath: string;
  startedAt: string | null;
  state: 'starting' | 'running' | 'stopped' | 'error' | 'reconnecting';
  source: GatewayRuntimeSource;
  lastError?: string | null;
}

const STATE_VERSION = 1;

export function getGatewayStateFilePath(): string {
  if (process.env.OCLAW_GATEWAY_STATE_FILE) {
    return process.env.OCLAW_GATEWAY_STATE_FILE;
  }
  return join(getOclawConfigDir(), 'runtime', 'gateway-state.json');
}

export function readGatewayRuntimeState(): GatewayRuntimeState | null {
  const filePath = getGatewayStateFilePath();
  if (!existsSync(filePath)) return null;

  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as Partial<GatewayRuntimeState>;
    if (raw.version !== STATE_VERSION || typeof raw.port !== 'number' || typeof raw.runtimePath !== 'string' || typeof raw.state !== 'string') {
      return null;
    }
    return {
      version: STATE_VERSION,
      pid: typeof raw.pid === 'number' ? raw.pid : null,
      port: raw.port,
      runtimePath: raw.runtimePath,
      startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : null,
      state: raw.state,
      source: raw.source === 'gui' ? 'gui' : 'cli',
      lastError: typeof raw.lastError === 'string' ? raw.lastError : null,
    };
  } catch {
    return null;
  }
}

export async function writeGatewayRuntimeState(state: GatewayRuntimeState): Promise<void> {
  const filePath = getGatewayStateFilePath();
  await mkdir(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
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
