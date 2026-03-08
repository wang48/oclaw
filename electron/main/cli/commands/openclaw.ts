/**
 * Compatibility wrapper for the legacy `oclaw openclaw ...` command family.
 * Prefer `oclaw runtime ...` for embedded runtime management.
 */
import { GatewayManager } from '../../../gateway/manager';
import { handleRuntime } from './runtime';
import type { CommandContext, CommandResult } from '../types';

export async function handleOpenClaw(ctx: CommandContext, gateway?: GatewayManager): Promise<CommandResult> {
  return handleRuntime(ctx, gateway);
}
