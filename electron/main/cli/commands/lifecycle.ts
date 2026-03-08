import { GatewayManager } from '../../../gateway/manager';
import { getOpenClawConfigDir, getOpenClawSkillsDir } from '../../../utils/paths';
import { parseArgs, parseNumber, getOptionBoolean, getOptionString } from '../parse';
import { Spinner } from '../output';
import type { CommandContext, CommandResult, InstanceState } from '../types';
import { OpenClawInstanceManager } from '../services/instance-manager';

function formatInstanceHuman(title: string, instance: InstanceState): string {
  return [
    title,
    `status: ${instance.status}`,
    `pid: ${instance.pid ?? '-'}`,
    `port: ${instance.port ?? '-'}`,
    `runtime: ${instance.runtimePath}`,
    `config: ${getOpenClawConfigDir()}`,
    `skills: ${getOpenClawSkillsDir()}`,
    'dashboard: app://dashboard',
    '',
  ].join('\n');
}

export async function handleStart(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const spinner = new Spinner();
  const manager = new OpenClawInstanceManager(gateway);
  if (!ctx.json && !ctx.quiet) spinner.start('Starting OpenClaw...');
  const instance = await manager.start();
  if (!ctx.json && !ctx.quiet) spinner.succeed('OpenClaw started');
  return {
    data: { success: true, instance },
    humanFormatter: (payload) => formatInstanceHuman('OpenClaw started', (payload as { instance: InstanceState }).instance),
  };
}

export async function handleStop(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const spinner = new Spinner();
  const manager = new OpenClawInstanceManager(gateway);
  if (!ctx.json && !ctx.quiet) spinner.start('Stopping OpenClaw...');
  const instance = await manager.stop();
  if (!ctx.json && !ctx.quiet) spinner.succeed('OpenClaw stopped');
  return {
    data: { success: true, instance },
    humanFormatter: (payload) => formatInstanceHuman('OpenClaw stopped', (payload as { instance: InstanceState }).instance),
  };
}

export async function handleRestart(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const spinner = new Spinner();
  const manager = new OpenClawInstanceManager(gateway);
  if (!ctx.json && !ctx.quiet) spinner.start('Restarting OpenClaw...');
  const instance = await manager.restart();
  if (!ctx.json && !ctx.quiet) spinner.succeed('OpenClaw restarted');
  return {
    data: { success: true, instance },
    humanFormatter: (payload) => formatInstanceHuman('OpenClaw restarted', (payload as { instance: InstanceState }).instance),
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
