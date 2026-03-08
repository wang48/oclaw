import { GatewayManager } from '../../../gateway/manager';
import { parseArgs, parseNumber, getOptionBoolean, getOptionString } from '../parse';
import { printCommandHelp } from '../help';
import { Spinner } from '../output';
import type { CommandContext, CommandResult } from '../types';
import { OpenClawInstanceManager, type InstanceState } from '../services/instance-manager';

function formatInstanceRow(instance: InstanceState): Record<string, string> {
  return {
    NAME: instance.name,
    TYPE: instance.type,
    STATUS: instance.status,
    PID: instance.pid == null ? '-' : String(instance.pid),
    PORT: instance.port == null ? '-' : String(instance.port),
    STARTED: instance.startedAt ?? '-',
    RUNTIME: instance.runtimePath,
  };
}

function formatPsHuman(value: unknown): string {
  const items = Array.isArray(value) ? (value as InstanceState[]) : [];
  const rows = items.map(formatInstanceRow);
  if (rows.length === 0) {
    return 'No managed instances\n';
  }
  const header = 'NAME      TYPE     STATUS    PID      PORT    STARTED                   RUNTIME';
  const lines = rows.map((row) =>
    `${row.NAME.padEnd(9)} ${row.TYPE.padEnd(8)} ${row.STATUS.padEnd(9)} ${row.PID.padEnd(8)} ${row.PORT.padEnd(7)} ${row.STARTED.padEnd(24)} ${row.RUNTIME}`
  );
  return `Managed Instances\n=================\n${header}\n${lines.join('\n')}\n`;
}

function formatServerHuman(value: unknown): string {
  const instance = value as InstanceState;
  return [
    'OpenClaw server status',
    '=====================',
    `name: ${instance.name}`,
    `type: ${instance.type}`,
    `status: ${instance.status}`,
    `pid: ${instance.pid ?? '-'}`,
    `port: ${instance.port ?? '-'}`,
    `started: ${instance.startedAt ?? '-'}`,
    `runtime: ${instance.runtimePath}`,
    '',
  ].join('\n');
}

export async function handleServer(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const [subcommand] = ctx.args;
  const manager = new OpenClawInstanceManager(gateway);

  const mode = !subcommand ? 'start' : subcommand;
  const spinner = new Spinner();

  switch (mode) {
    case 'help':
    case '--help':
    case '-h':
      printCommandHelp('server');
      return { data: undefined };
    case 'start': {
      if (!ctx.json && !ctx.quiet) spinner.start('Starting OpenClaw server...');
      const instance = await manager.start();
      if (!ctx.json && !ctx.quiet) spinner.succeed('OpenClaw server started');
      return {
        data: { success: true, instance },
        humanFormatter: (payload) => formatServerHuman((payload as { instance: InstanceState }).instance),
      };
    }
    case 'status': {
      const instance = await manager.status();
      return {
        data: { success: true, instance },
        humanFormatter: (payload) => formatServerHuman((payload as { instance: InstanceState }).instance),
      };
    }
    case 'restart': {
      if (!ctx.json && !ctx.quiet) spinner.start('Restarting OpenClaw server...');
      const instance = await manager.restart();
      if (!ctx.json && !ctx.quiet) spinner.succeed('OpenClaw server restarted');
      return {
        data: { success: true, instance },
        humanFormatter: (payload) => formatServerHuman((payload as { instance: InstanceState }).instance),
      };
    }
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

export async function handleStop(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const spinner = new Spinner();
  const manager = new OpenClawInstanceManager(gateway);
  if (!ctx.json && !ctx.quiet) spinner.start('Stopping OpenClaw server...');
  const instance = await manager.stop();
  if (!ctx.json && !ctx.quiet) spinner.succeed('OpenClaw server stopped');
  return {
    data: { success: true, instance },
    humanFormatter: (payload) => formatServerHuman((payload as { instance: InstanceState }).instance),
  };
}

export async function handleLogs(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const manager = new OpenClawInstanceManager(gateway);
  const parsed = parseArgs(ctx.args);
  const linesArg = getOptionString(parsed.options, 'lines');
  const follow = getOptionBoolean(parsed.options, 'follow');
  const lines = linesArg ? parseNumber(linesArg, 'lines') : 200;
  const result = await manager.logs({ lines, follow });

  if (follow) {
    if (ctx.json) {
      throw new Error('logs --follow does not support --json mode');
    }
    if (typeof result === 'string') {
      return { data: result };
    }
    for await (const chunk of result) {
      process.stdout.write(chunk);
    }
    return { data: undefined };
  }

  return { data: result };
}
