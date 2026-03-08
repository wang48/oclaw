import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext } from '../../../electron/main/cli/types';

const managerState = {
  start: vi.fn(),
  status: vi.fn(),
  restart: vi.fn(),
  stop: vi.fn(),
  ps: vi.fn(),
  logs: vi.fn(),
};

vi.mock('../../../electron/main/cli/services/instance-manager', () => {
  return {
    OpenClawInstanceManager: class {
      start = managerState.start;
      status = managerState.status;
      restart = managerState.restart;
      stop = managerState.stop;
      ps = managerState.ps;
      logs = managerState.logs;
    },
  };
});

import { handleLogs, handlePs, handleServer, handleStop } from '../../../electron/main/cli/commands/server';

function createCtx(args: string[]): CommandContext {
  return {
    args,
    options: {},
    json: true,
    verbose: false,
    quiet: false,
  };
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

describe('server command', () => {
  beforeEach(() => {
    Object.values(managerState).forEach((fn) => fn.mockReset());
    managerState.start.mockResolvedValue(sampleInstance);
    managerState.status.mockResolvedValue(sampleInstance);
    managerState.restart.mockResolvedValue(sampleInstance);
    managerState.stop.mockResolvedValue({ ...sampleInstance, status: 'stopped', pid: null });
    managerState.ps.mockResolvedValue([sampleInstance]);
    managerState.logs.mockResolvedValue('hello');
  });

  it('defaults to start action', async () => {
    const result = await handleServer(createCtx([]), {} as never);
    expect(managerState.start).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ success: true });
  });

  it('supports server status subcommand', async () => {
    const result = await handleServer(createCtx(['status']), {} as never);
    expect(managerState.status).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ success: true });
  });

  it('supports ps command', async () => {
    const result = await handlePs(createCtx([]), {} as never);
    expect(managerState.ps).toHaveBeenCalledTimes(1);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('supports stop command', async () => {
    const result = await handleStop(createCtx([]), {} as never);
    expect(managerState.stop).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ success: true });
  });

  it('supports logs command with --lines', async () => {
    const result = await handleLogs(createCtx(['--lines', '20']), {} as never);
    expect(managerState.logs).toHaveBeenCalledWith({ lines: 20, follow: false });
    expect(result.data).toBe('hello');
  });
});
