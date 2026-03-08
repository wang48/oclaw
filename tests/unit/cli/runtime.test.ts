import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext } from '../../../electron/main/cli/types';

const managerState = {
  getPackageStatus: vi.fn(),
  getRuntimeInfo: vi.fn(),
  getVersion: vi.fn(),
  ensureRuntime: vi.fn(),
  logs: vi.fn(),
  execEmbeddedOpenClaw: vi.fn(),
};

vi.mock('../../../electron/main/cli/services/instance-manager', () => ({
  OpenClawInstanceManager: class {
    getPackageStatus = managerState.getPackageStatus;
    getRuntimeInfo = managerState.getRuntimeInfo;
    getVersion = managerState.getVersion;
    ensureRuntime = managerState.ensureRuntime;
    logs = managerState.logs;
    execEmbeddedOpenClaw = managerState.execEmbeddedOpenClaw;
  },
}));

import { handleRuntime } from '../../../electron/main/cli/commands/runtime';

function createCtx(args: string[]): CommandContext {
  return { args, options: {}, json: true, verbose: false, quiet: false };
}

describe('runtime command', () => {
  beforeEach(() => {
    Object.values(managerState).forEach((fn) => fn.mockReset());
    managerState.getPackageStatus.mockReturnValue({ packageExists: true, isBuilt: true });
    managerState.getRuntimeInfo.mockReturnValue({ ready: true, runtimePath: '/tmp/openclaw', repaired: false });
    managerState.getVersion.mockResolvedValue('2026.3.1');
    managerState.ensureRuntime.mockResolvedValue({ ready: true, runtimePath: '/tmp/openclaw', repaired: true });
    managerState.logs.mockResolvedValue('hello');
    managerState.execEmbeddedOpenClaw.mockResolvedValue(0);
  });

  it('returns status', async () => {
    const result = await handleRuntime(createCtx(['status']), {} as never);
    expect(result.data).toMatchObject({ ready: true, runtimePath: '/tmp/openclaw' });
  });

  it('repairs runtime', async () => {
    const result = await handleRuntime(createCtx(['repair']), {} as never);
    expect(managerState.ensureRuntime).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ success: true });
  });

  it('returns version', async () => {
    const result = await handleRuntime(createCtx(['version']), {} as never);
    expect(result.data).toEqual({ version: '2026.3.1' });
  });

  it('passes through exec arguments after --', async () => {
    const result = await handleRuntime(createCtx(['exec', '--', 'doctor', '--help']), {} as never);
    expect(managerState.execEmbeddedOpenClaw).toHaveBeenCalledWith(['doctor', '--help'], { inheritStdio: true });
    expect(result.data).toEqual({ success: true, exitCode: 0 });
  });
});
