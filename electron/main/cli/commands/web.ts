import { GatewayManager } from '../../../gateway/manager';
import { printCommandHelp } from '../help';
import { handleControl } from './control';
import type { CommandContext, CommandResult } from '../types';

export async function handleWeb(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const [subcommand] = ctx.args;
  if (!subcommand || subcommand === 'control') {
    return await handleControl({ ...ctx, args: [] }, gateway);
  }

  if (subcommand === '--help' || subcommand === '-h' || subcommand === 'help') {
    printCommandHelp('web');
    return { data: undefined };
  }

  if (subcommand === 'dashboard') {
    throw new Error('`oclaw web dashboard` has been removed. Use `oclaw control` to open the OpenClaw control UI.');
  }

  throw new Error('Usage: oclaw web [control]');
}
