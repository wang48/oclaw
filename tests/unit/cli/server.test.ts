import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext } from '../../../electron/main/cli/types';

const { managerState, lifecycleMocks, statusMock } = vi.hoisted(() => ({
  managerState: {
    ps: vi.fn(),
  },
  lifecycleMocks: {
    handleStart: vi.fn(),
    handleRestart: vi.fn(),
    handleLogs: vi.fn(),
    handleStop: vi.fn(),
  },
  statusMock: vi.fn(),
}));

vi.mock('../../../electron/main/cli/services/instance-manager', () => ({
  OpenClawInstanceManager: class {
    ps = managerState.ps;
  },
}));

vi.mock('../../../electron/main/cli/commands/lifecycle', () => lifecycleMocks);
vi.mock('../../../electron/main/cli/commands/status', () => ({ handleStatus: statusMock }));

import { handlePs, handleServer } from '../../../electron/main/cli/commands/server';

function createCtx(args: string[]): CommandContext {
  return { args, options: {}, json: true, verbose: false, quiet: false };
}

describe('server compatibility command', () => {
  beforeEach(() => {
    managerState.ps.mockReset();
    lifecycleMocks.handleStart.mockReset();
    lifecycleMocks.handleRestart.mockReset();
    statusMock.mockReset();
    managerState.ps.mockResolvedValue([{ name: 'openclaw', type: 'server', status: 'running', pid: 1, port: 18789, startedAt: null, runtimePath: '/tmp/openclaw' }]);
    lifecycleMocks.handleStart.mockResolvedValue({ data: { success: true } });
    lifecycleMocks.handleRestart.mockResolvedValue({ data: { success: true } });
    statusMock.mockResolvedValue({ data: { app: { name: 'Oclaw' } } });
  });

  it('defaults to start action', async () => {
    const result = await handleServer(createCtx([]), {} as never);
    expect(lifecycleMocks.handleStart).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ success: true });
  });

  it('maps server status to top-level status', async () => {
    const result = await handleServer(createCtx(['status']), {} as never);
    expect(statusMock).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ app: { name: 'Oclaw' } });
  });

  it('supports restart mapping', async () => {
    const result = await handleServer(createCtx(['restart']), {} as never);
    expect(lifecycleMocks.handleRestart).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ success: true });
  });

  it('supports ps command', async () => {
    const result = await handlePs(createCtx([]), {} as never);
    expect(managerState.ps).toHaveBeenCalledTimes(1);
    expect(Array.isArray(result.data)).toBe(true);
  });
});
