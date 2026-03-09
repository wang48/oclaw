import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext } from '../../../electron/main/cli/types';

const { managerState } = vi.hoisted(() => ({
  managerState: {
    openControlUi: vi.fn(),
  },
}));

vi.mock('../../../electron/main/cli/services/instance-manager', () => ({
  OpenClawInstanceManager: class {
    openControlUi = managerState.openControlUi;
  },
}));

import { handleWeb } from '../../../electron/main/cli/commands/web';

function createCtx(args: string[]): CommandContext {
  return { args, options: {}, json: true, verbose: false, quiet: false };
}

describe('web command', () => {
  beforeEach(() => {
    Object.values(managerState).forEach((fn) => fn.mockReset());
    managerState.openControlUi.mockResolvedValue({ success: true, target: 'control', appStarted: false, url: 'http://127.0.0.1:18789/' });
  });

  it('maps default web command to control', async () => {
    const result = await handleWeb(createCtx([]), {} as never);
    expect(managerState.openControlUi).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ target: 'control' });
  });

  it('maps explicit control subcommand', async () => {
    const result = await handleWeb(createCtx(['control']), {} as never);
    expect(managerState.openControlUi).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ target: 'control' });
  });

  it('rejects dashboard subcommand', async () => {
    await expect(handleWeb(createCtx(['dashboard']), {} as never)).rejects.toThrow('`oclaw web dashboard` has been removed');
  });
});
