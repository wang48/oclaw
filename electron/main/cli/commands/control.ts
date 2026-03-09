import { GatewayManager } from '../../../gateway/manager';
import { printCommandHelp } from '../help';
import { OpenClawInstanceManager } from '../services/instance-manager';
import type { CommandContext, CommandResult } from '../types';

function formatControlHuman(value: unknown): string {
  const data = value as { success?: boolean; url?: string | null };
  const lines = ['Opened control'];
  if (data.url) {
    lines.push(`url: ${data.url}`);
  }
  return `${lines.join('\n')}\n`;
}

export async function handleControl(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const [subcommand] = ctx.args;
  if (subcommand === '--help' || subcommand === '-h' || subcommand === 'help') {
    printCommandHelp('control');
    return { data: undefined };
  }
  if (subcommand) {
    throw new Error('Usage: oclaw control');
  }

  const manager = new OpenClawInstanceManager(gateway);
  const result = await manager.openControlUi();
  return { data: result, humanFormatter: formatControlHuman };
}
