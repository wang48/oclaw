/**
 * Cron command handler
 */
import { GatewayManager } from '../../../gateway/manager';
import { parseJsonObject, parseBoolean } from '../parse';
import { formatTable, Spinner } from '../output';
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult } from '../types';

interface GatewayCronJob {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: { kind: string; expr?: string; everyMs?: number; at?: string; tz?: string };
  payload: { kind: string; message?: string; text?: string };
  delivery?: { mode: string; channel?: string; to?: string };
  state: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastError?: string;
    lastDurationMs?: number;
  };
}

function transformCronJob(job: GatewayCronJob) {
  const message = job.payload?.message || job.payload?.text || '';
  const channelType = job.delivery?.channel || 'unknown';
  const target = {
    channelType,
    channelId: channelType,
    channelName: channelType,
  };

  const lastRun = job.state?.lastRunAtMs
    ? {
      time: new Date(job.state.lastRunAtMs).toISOString(),
      success: job.state.lastStatus === 'ok',
      error: job.state.lastError,
      duration: job.state.lastDurationMs,
    }
    : undefined;

  const nextRun = job.state?.nextRunAtMs
    ? new Date(job.state.nextRunAtMs).toISOString()
    : undefined;

  return {
    id: job.id,
    name: job.name,
    message,
    schedule: job.schedule,
    target,
    enabled: job.enabled,
    createdAt: new Date(job.createdAtMs).toISOString(),
    updatedAt: new Date(job.updatedAtMs).toISOString(),
    lastRun,
    nextRun,
  };
}

export async function handleCron(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const [subcommand, ...rest] = ctx.args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printCommandHelp('cron');
    return { data: undefined };
  }

  await gateway.start();

  switch (subcommand) {
    case 'list': {
      const result = await gateway.rpc('cron.list', { includeDisabled: true }) as { jobs?: GatewayCronJob[] };
      const data = (result.jobs ?? []).map(transformCronJob);
      return {
        data,
        humanFormatter: formatCronListHuman,
      };
    }
    case 'create': {
      if (!rest[0]) throw new Error('Usage: cron create <inputJson>');
      const input = parseJsonObject(rest[0], 'cron create input');

      const name = String(input.name ?? '').trim();
      const message = String(input.message ?? '').trim();
      const schedule = String(input.schedule ?? '').trim();
      const target = input.target as Record<string, unknown> | undefined;

      if (!name || !message || !schedule || !target) {
        throw new Error('cron create requires name, message, schedule, and target');
      }

      const channelType = String(target.channelType ?? '').trim();
      const channelId = String(target.channelId ?? '').trim();
      const enabled = input.enabled == null ? true : Boolean(input.enabled);

      if (!channelType || !channelId) {
        throw new Error('cron create target requires channelType and channelId');
      }

      const deliveryTo = channelType === 'discord' ? `channel:${channelId}` : channelId;
      const gatewayInput = {
        name,
        schedule: { kind: 'cron', expr: schedule },
        payload: { kind: 'agentTurn', message },
        enabled,
        wakeMode: 'next-heartbeat',
        sessionTarget: 'isolated',
        delivery: {
          mode: 'announce',
          channel: channelType,
          to: deliveryTo,
        },
      };

      const created = await gateway.rpc('cron.add', gatewayInput) as GatewayCronJob;
      return { data: transformCronJob(created) };
    }
    case 'update': {
      if (!rest[0] || !rest[1]) {
        throw new Error('Usage: cron update <id> <patchJson>');
      }
      const id = rest[0];
      const patch = parseJsonObject(rest[1], 'cron patch');

      if (typeof patch.schedule === 'string') {
        patch.schedule = { kind: 'cron', expr: patch.schedule };
      }
      if (typeof patch.message === 'string') {
        patch.payload = { kind: 'agentTurn', message: patch.message };
        delete patch.message;
      }

      return { data: await gateway.rpc('cron.update', { id, patch }) };
    }
    case 'delete': {
      if (!rest[0]) throw new Error('Usage: cron delete <id>');
      return { data: await gateway.rpc('cron.remove', { id: rest[0] }) };
    }
    case 'toggle': {
      if (!rest[0] || !rest[1]) throw new Error('Usage: cron toggle <id> <true|false>');
      const enabled = parseBoolean(rest[1], 'enabled');
      return { data: await gateway.rpc('cron.update', { id: rest[0], patch: { enabled } }) };
    }
    case 'trigger': {
      const spinner = new Spinner();
      if (!rest[0]) throw new Error('Usage: cron trigger <id>');
      if (!ctx.json && !ctx.quiet) spinner.start('Triggering cron job...');
      try {
        const data = await gateway.rpc('cron.run', { id: rest[0], mode: 'force' });
        if (!ctx.json && !ctx.quiet) spinner.succeed('Cron job triggered');
        return { data };
      } catch (error) {
        if (!ctx.json && !ctx.quiet) spinner.fail('Failed to trigger cron job');
        throw error;
      }
    }
    default:
      throw new Error('Usage: cron <list|create|update|delete|toggle|trigger>');
  }
}

function formatCronListHuman(value: unknown): string {
  const jobs = value as Array<{
    id?: string;
    name?: string;
    schedule?: { expr?: string; kind?: string };
    enabled?: boolean;
    nextRun?: string;
    lastRun?: { time?: string; success?: boolean };
  }>;

  if (!Array.isArray(jobs) || jobs.length === 0) return 'No cron jobs\n';

  const rows = jobs.map((j) => ({
    id: j.id ? j.id.slice(0, 8) : '-',
    name: j.name || '-',
    schedule: j.schedule?.expr || j.schedule?.kind || '-',
    enabled: j.enabled ? 'yes' : 'no',
    'next run': j.nextRun ? new Date(j.nextRun).toLocaleString() : '-',
    'last run': j.lastRun?.time ? new Date(j.lastRun.time).toLocaleString() : '-',
    'last ok': j.lastRun ? (j.lastRun.success ? 'yes' : 'no') : '-',
  }));

  return formatTable(rows);
}
