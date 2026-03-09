import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext } from '../../../electron/main/cli/types';

const managerState = {
  start: vi.fn(),
  restart: vi.fn(),
  stop: vi.fn(),
  logs: vi.fn(),
};

vi.mock('../../../electron/main/cli/services/instance-manager', () => ({
  OpenClawInstanceManager: class {
    start = managerState.start;
    restart = managerState.restart;
    stop = managerState.stop;
    logs = managerState.logs;
  },
}));

import { handleLogs, handleRestart, handleStart, handleStop } from '../../../electron/main/cli/commands/lifecycle';

function createCtx(args: string[]): CommandContext {
  return { args, options: {}, json: true, verbose: false, quiet: false };
}

const sampleInstance = {
  name: 'openclaw',
  type: 'server',
  status: 'running',
  pid: 123,
  port: 18789,
  startedAt: '2026-03-08T00:00:00.000Z',
  runtimePath: '/tmp/openclaw',
};

const sampleService = {
  app: {
    pid: 321,
    status: 'running-hidden',
    trayReady: true,
    windowVisible: false,
    startedAt: '2026-03-08T00:00:00.000Z',
  },
  instance: sampleInstance,
};

describe('lifecycle commands', () => {
  beforeEach(() => {
    Object.values(managerState).forEach((fn) => fn.mockReset());
    managerState.start.mockResolvedValue(sampleService);
    managerState.restart.mockResolvedValue(sampleService);
    managerState.stop.mockResolvedValue({
      app: { ...sampleService.app, pid: null, status: 'stopped', trayReady: false, startedAt: null },
      instance: { ...sampleInstance, status: 'stopped', pid: null },
    });
    managerState.logs.mockResolvedValue('hello');
  });

  it('starts openclaw', async () => {
    const result = await handleStart(createCtx([]), {} as never);
    expect(managerState.start).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ success: true, app: sampleService.app, instance: sampleInstance });
  });

  it('restarts openclaw', async () => {
    const result = await handleRestart(createCtx([]), {} as never);
    expect(managerState.restart).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ success: true, app: sampleService.app, instance: sampleInstance });
  });

  it('stops openclaw', async () => {
    const result = await handleStop(createCtx([]), {} as never);
    expect(managerState.stop).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ success: true });
  });

  it('returns logs with lines option', async () => {
    const result = await handleLogs(createCtx(['--lines', '20']), {} as never);
    expect(managerState.logs).toHaveBeenCalledWith({ lines: 20, follow: false });
    expect(result.data).toBe('hello');
  });
});
