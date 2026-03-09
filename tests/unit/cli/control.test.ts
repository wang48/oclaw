import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandContext } from '../../../electron/main/cli/types';

const managerState = {
  openControlUi: vi.fn(),
};

vi.mock('../../../electron/main/cli/services/instance-manager', () => ({
  OpenClawInstanceManager: class {
    openControlUi = managerState.openControlUi;
  },
}));

import { handleControl } from '../../../electron/main/cli/commands/control';

function createCtx(args: string[]): CommandContext {
  return { args, options: {}, json: true, verbose: false, quiet: false };
}

describe('control command', () => {
  beforeEach(() => {
    managerState.openControlUi.mockReset();
    managerState.openControlUi.mockResolvedValue({
      success: true,
      target: 'control',
      appStarted: false,
      url: 'http://127.0.0.1:18789/?token=test',
    });
  });

  it('opens control ui', async () => {
    const result = await handleControl(createCtx([]), {} as never);
    expect(managerState.openControlUi).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ target: 'control' });
  });
});
