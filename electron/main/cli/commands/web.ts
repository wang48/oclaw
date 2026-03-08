import { launchGuiAction } from '../../launch-actions';
import { GatewayManager } from '../../../gateway/manager';
import { printCommandHelp } from '../help';
import { OpenClawInstanceManager } from '../services/instance-manager';
import type { CommandContext, CommandResult } from '../types';

function formatWebHuman(value: unknown): string {
  const data = value as { success?: boolean; target?: string; url?: string | null };
  const lines = [`Opened ${data.target || 'dashboard'}`];
  if (data.url) {
    lines.push(`url: ${data.url}`);
  }
  return `${lines.join('\n')}\n`;
}

export async function handleWeb(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const [subcommand] = ctx.args;
  const manager = new OpenClawInstanceManager(gateway);
  const target = !subcommand || subcommand === 'dashboard' ? 'dashboard' : subcommand;

  if (target === '--help' || target === '-h' || target === 'help') {
    printCommandHelp('web');
    return { data: undefined };
  }

  switch (target) {
    case 'dashboard': {
      await launchGuiAction({ path: '/dashboard' });
      const result = await manager.openDashboard();
      return { data: result, humanFormatter: formatWebHuman };
    }
    case 'control': {
      const result = await manager.openControlUi();
      await launchGuiAction({ control: true });
      return { data: result, humanFormatter: formatWebHuman };
    }
    default:
      throw new Error('Usage: web [dashboard|control]');
  }
}
