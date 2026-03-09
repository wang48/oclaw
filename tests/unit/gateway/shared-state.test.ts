import { existsSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getGatewayStateFilePath,
  isPidRunning,
  readGatewayRuntimeState,
  writeGatewayRuntimeState,
} from '../../../electron/gateway/shared-state';

describe('gateway shared state', () => {
  beforeEach(async () => {
    process.env.OCLAW_GATEWAY_STATE_FILE = join(process.cwd(), '.tmp-test', 'gateway-state.json');
    const file = getGatewayStateFilePath();
    if (existsSync(file)) {
      await import('fs/promises').then((fs) => fs.rm(file, { force: true }));
    }
  });

  it('writes and reads gateway state', async () => {
    await writeGatewayRuntimeState({
      version: 1,
      pid: 123,
      port: 18789,
      runtimePath: '/tmp/openclaw',
      startedAt: '2026-03-09T00:00:00.000Z',
      state: 'running',
      source: 'cli',
      lastError: null,
    });

    expect(readGatewayRuntimeState()).toMatchObject({
      pid: 123,
      port: 18789,
      state: 'running',
      source: 'cli',
    });
  });

  it('reports current process pid as running', () => {
    expect(isPidRunning(process.pid)).toBe(true);
  });
});
