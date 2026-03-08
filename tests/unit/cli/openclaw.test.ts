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

vi.mock('../../../electron/main/cli/services/instance-manager', () => {
  return {
    OpenClawInstanceManager: class {
      getPackageStatus = managerState.getPackageStatus;
      getRuntimeInfo = managerState.getRuntimeInfo;
      getVersion = managerState.getVersion;
      ensureRuntime = managerState.ensureRuntime;
      logs = managerState.logs;
      execEmbeddedOpenClaw = managerState.execEmbeddedOpenClaw;
    },
  };
});

import { handleOpenClaw } from '../../../electron/main/cli/commands/openclaw';

function createCtx(args: string[]): CommandContext {
  return {
    args,
    options: {},
    json: true,
    verbose: false,
    quiet: false,
  };
}

describe('openclaw command', () => {
  beforeEach(() => {
    Object.values(managerState).forEach((fn) => fn.mockReset());
    managerState.getPackageStatus.mockReturnValue({
      packageExists: true,
      isBuilt: true,
      entryPath: '/tmp/openclaw/openclaw.mjs',
      dir: '/tmp/openclaw',
      version: '2026.3.1',
    });
    managerState.getRuntimeInfo.mockReturnValue({
      ready: true,
      runtimePath: '/tmp/openclaw',
      repaired: false,
    });
    managerState.getVersion.mockResolvedValue('2026.3.1');
    managerState.ensureRuntime.mockResolvedValue({
      ready: true,
      runtimePath: '/tmp/openclaw',
      repaired: true,
      source: 'archive:/tmp/openclaw.tgz',
    });
    managerState.logs.mockResolvedValue('hello');
    managerState.execEmbeddedOpenClaw.mockResolvedValue(0);
  });

  it('returns enriched runtime status', async () => {
    const result = await handleOpenClaw(createCtx(['status']), {} as never);
    expect(managerState.getPackageStatus).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({
      packageExists: true,
      ready: true,
      runtimePath: '/tmp/openclaw',
    });
  });

  it('supports version', async () => {
    const result = await handleOpenClaw(createCtx(['version']), {} as never);
    expect(managerState.getVersion).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual({ version: '2026.3.1' });
  });

  it('supports repair', async () => {
    const result = await handleOpenClaw(createCtx(['repair']), {} as never);
    expect(managerState.ensureRuntime).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ success: true });
  });

  it('supports logs', async () => {
    const result = await handleOpenClaw(createCtx(['logs', '--lines', '20']), {} as never);
    expect(managerState.logs).toHaveBeenCalledWith({ lines: 20, follow: false });
    expect(result.data).toBe('hello');
  });

  it('supports explicit exec', async () => {
    const result = await handleOpenClaw(createCtx(['exec', 'doctor', '--help']), {} as never);
    expect(managerState.execEmbeddedOpenClaw).toHaveBeenCalledWith(['doctor', '--help'], { inheritStdio: true });
    expect(result.data).toEqual({ success: true, exitCode: 0 });
  });

  it('passes unknown subcommands through to embedded openclaw', async () => {
    const result = await handleOpenClaw(createCtx(['gateway', 'status']), {} as never);
    expect(managerState.execEmbeddedOpenClaw).toHaveBeenCalledWith(['gateway', 'status'], { inheritStdio: true });
    expect(result.data).toEqual({ success: true, exitCode: 0 });
  });
});
