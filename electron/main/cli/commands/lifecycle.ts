import { GatewayManager } from '../../../gateway/manager';
import { getOpenClawConfigDir, getOpenClawSkillsDir } from '../../../utils/paths';
import { PORTS } from '../../../utils/config';
import { parseArgs, parseNumber, getOptionBoolean, getOptionString } from '../parse';
import { Spinner } from '../output';
import type { CommandContext, CommandResult, ServiceStatus } from '../types';
import { OpenClawInstanceManager } from '../services/instance-manager';

function formatServiceHuman(title: string, service: ServiceStatus): string {
  return [
    title,
    `client: ${service.app.status} (pid: ${service.app.pid ?? '-'})`,
    `status: ${service.instance.status}`,
    `pid: ${service.instance.pid ?? '-'}`,
    `port: ${service.instance.port ?? '-'}`,
    `runtime: ${service.instance.runtimePath}`,
    `config: ${getOpenClawConfigDir()}`,
    `skills: ${getOpenClawSkillsDir()}`,
    `control: http://127.0.0.1:${service.instance.port ?? PORTS.OPENCLAW_GATEWAY}/`,
    '',
  ].join('\n');
}

export async function handleStart(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const spinner = new Spinner();
  const manager = new OpenClawInstanceManager(gateway);
  if (!ctx.json && !ctx.quiet) spinner.start('Starting OpenClaw...');
  const service = await manager.start();
  if (!ctx.json && !ctx.quiet) spinner.succeed('OpenClaw started');
  return {
    data: { success: true, ...service },
    humanFormatter: (payload) => formatServiceHuman('OpenClaw started', payload as ServiceStatus),
  };
}

export async function handleStop(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const spinner = new Spinner();
  const manager = new OpenClawInstanceManager(gateway);
  if (!ctx.json && !ctx.quiet) spinner.start('Stopping OpenClaw...');
  const service = await manager.stop();
  if (!ctx.json && !ctx.quiet) spinner.succeed('OpenClaw stopped');
  return {
    data: { success: true, ...service },
    humanFormatter: (payload) => formatServiceHuman('OpenClaw stopped', payload as ServiceStatus),
  };
}

export async function handleRestart(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const spinner = new Spinner();
  const manager = new OpenClawInstanceManager(gateway);
  if (!ctx.json && !ctx.quiet) spinner.start('Restarting OpenClaw...');
  const service = await manager.restart();
  if (!ctx.json && !ctx.quiet) spinner.succeed('OpenClaw restarted');
  return {
    data: { success: true, ...service },
    humanFormatter: (payload) => formatServiceHuman('OpenClaw restarted', payload as ServiceStatus),
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
