import { GatewayManager } from '../../../gateway/manager';
import { handleLogs as handleRootLogs, handleRestart, handleStart, handleStop } from './lifecycle';
import { handleStatus } from './status';
import { OpenClawInstanceManager } from '../services/instance-manager';
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult, InstanceState } from '../types';

function formatPsHuman(value: unknown): string {
  const items = Array.isArray(value) ? (value as InstanceState[]) : [];
  if (items.length === 0) {
    return 'No managed instances\n';
  }
  const header = 'NAME      TYPE     STATUS    PID      PORT    STARTED                   RUNTIME';
  const lines = items.map((instance) =>
    `${instance.name.padEnd(9)} ${instance.type.padEnd(8)} ${instance.status.padEnd(9)} ${String(instance.pid ?? '-').padEnd(8)} ${String(instance.port ?? '-').padEnd(7)} ${(instance.startedAt ?? '-').padEnd(24)} ${instance.runtimePath}`
  );
  return `Managed Instances\n=================\n${header}\n${lines.join('\n')}\n`;
}

export async function handleServer(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const [subcommand] = ctx.args;
  const mode = !subcommand ? 'start' : subcommand;

  switch (mode) {
    case 'help':
    case '--help':
    case '-h':
      printCommandHelp('server');
      return { data: undefined };
    case 'start':
      return handleStart({ ...ctx, args: [] }, gateway);
    case 'status':
      return handleStatus({ ...ctx, args: [] }, gateway);
    case 'restart':
      return handleRestart({ ...ctx, args: [] }, gateway);
    default:
      throw new Error('Usage: server [start|status|restart]');
  }
}

export async function handlePs(_ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const manager = new OpenClawInstanceManager(gateway);
  const items = await manager.ps();
  return {
    data: items,
    humanFormatter: formatPsHuman,
  };
}

export { handleRootLogs as handleLogs, handleStop };
