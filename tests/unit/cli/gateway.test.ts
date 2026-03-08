import { describe, expect, it, vi } from 'vitest';
import { handleGateway } from '../../../electron/main/cli/commands/gateway';
import type { CommandContext } from '../../../electron/main/cli/types';

function createCtx(args: string[]): CommandContext {
  return {
    args,
    options: {},
    json: true,
    verbose: false,
    quiet: false,
  };
}

describe('gateway command', () => {
  it('stop does not start gateway before stopping', async () => {
    const gateway = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      restart: vi.fn(async () => undefined),
      checkHealth: vi.fn(async () => ({ ok: true })),
      isConnected: vi.fn(() => false),
      getStatus: vi.fn(() => ({ state: 'stopped', port: 18789 })),
      rpc: vi.fn(async () => ({})),
    };

    const result = await handleGateway(createCtx(['stop']), gateway as never);
    expect(result.data).toMatchObject({ success: true });
    expect(gateway.stop).toHaveBeenCalledTimes(1);
    expect(gateway.start).not.toHaveBeenCalled();
  });
});
