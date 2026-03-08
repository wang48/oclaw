import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext } from '../../../electron/main/cli/types';

const { managerState, launchGuiActionMock } = vi.hoisted(() => ({
  managerState: {
    openDashboard: vi.fn(),
    openControlUi: vi.fn(),
  },
  launchGuiActionMock: vi.fn(),
}));

vi.mock('../../../electron/main/cli/services/instance-manager', () => ({
  OpenClawInstanceManager: class {
    openDashboard = managerState.openDashboard;
    openControlUi = managerState.openControlUi;
  },
}));

vi.mock('../../../electron/main/launch-actions', () => ({
  launchGuiAction: launchGuiActionMock,
}));

import { handleWeb } from '../../../electron/main/cli/commands/web';

function createCtx(args: string[]): CommandContext {
  return { args, options: {}, json: true, verbose: false, quiet: false };
}

describe('web command', () => {
  beforeEach(() => {
    Object.values(managerState).forEach((fn) => fn.mockReset());
    launchGuiActionMock.mockReset();
    managerState.openDashboard.mockResolvedValue({ success: true, target: 'dashboard', appStarted: true, url: null });
    managerState.openControlUi.mockResolvedValue({ success: true, target: 'control', appStarted: true, url: 'http://127.0.0.1:18789/' });
  });

  it('opens dashboard by default', async () => {
    const result = await handleWeb(createCtx([]), {} as never);
    expect(launchGuiActionMock).toHaveBeenCalledWith({ path: '/dashboard' });
    expect(managerState.openDashboard).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ target: 'dashboard' });
  });

  it('opens control UI', async () => {
    const result = await handleWeb(createCtx(['control']), {} as never);
    expect(managerState.openControlUi).toHaveBeenCalledTimes(1);
    expect(launchGuiActionMock).toHaveBeenCalledWith({ control: true });
    expect(result.data).toMatchObject({ target: 'control' });
  });
});
