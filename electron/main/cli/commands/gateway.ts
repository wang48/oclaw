/**
 * Gateway command handler
 */
import { GatewayManager } from '../../../gateway/manager';
import { parseArgs, getOptionBoolean, parseJson, parseNumber } from '../parse';
import { printCommandHelp } from '../help';
import { Spinner } from '../output';
import type { CommandContext, CommandResult } from '../types';

export async function handleGateway(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const [subcommand, ...rest] = ctx.args;

  if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printCommandHelp('gateway');
    return { data: undefined };
  }

  switch (subcommand) {
    case 'status': {
      const parsed = parseArgs(rest);
      if (getOptionBoolean(parsed.options, 'connect')) {
        const spinner = new Spinner();
        if (!ctx.json && !ctx.quiet) spinner.start('Connecting to gateway...');
        try {
          await gateway.start();
          if (!ctx.json && !ctx.quiet) spinner.succeed('Connected to gateway');
        } catch (error) {
          if (!ctx.json && !ctx.quiet) spinner.fail('Failed to connect');
          throw error;
        }
      }
      const health = await gateway.checkHealth().catch((error) => ({ ok: false, error: String(error) }));
      const data = {
        status: gateway.getStatus(),
        connected: gateway.isConnected(),
        health,
      };
      return {
        data,
        humanFormatter: formatGatewayStatusHuman,
      };
    }

    case 'start': {
      const spinner = new Spinner();
      if (!ctx.json && !ctx.quiet) spinner.start('Starting gateway...');
      try {
        await gateway.start();
        if (!ctx.json && !ctx.quiet) spinner.succeed('Gateway started');
        return { data: { success: true, status: gateway.getStatus() } };
      } catch (error) {
        if (!ctx.json && !ctx.quiet) spinner.fail('Failed to start gateway');
        throw error;
      }
    }

    case 'stop': {
      const spinner = new Spinner();
      if (!ctx.json && !ctx.quiet) spinner.start('Stopping gateway...');
      try {
        await gateway.start();
        await gateway.stop();
        if (!ctx.json && !ctx.quiet) spinner.succeed('Gateway stopped');
        return { data: { success: true, status: gateway.getStatus() } };
      } catch (error) {
        if (!ctx.json && !ctx.quiet) spinner.fail('Failed to stop gateway');
        throw error;
      }
    }

    case 'restart': {
      const spinner = new Spinner();
      if (!ctx.json && !ctx.quiet) spinner.start('Restarting gateway...');
      try {
        await gateway.restart();
        if (!ctx.json && !ctx.quiet) spinner.succeed('Gateway restarted');
        return { data: { success: true, status: gateway.getStatus() } };
      } catch (error) {
        if (!ctx.json && !ctx.quiet) spinner.fail('Failed to restart gateway');
        throw error;
      }
    }

    case 'health':
      return { data: await gateway.checkHealth() };

    case 'rpc': {
      if (!rest[0]) {
        throw new Error('Usage: gateway rpc <method> [paramsJson] [timeoutMs]');
      }
      const method = rest[0];
      const params = rest[1] ? parseJson(rest[1], 'params') : undefined;
      const timeoutMs = rest[2] ? parseNumber(rest[2], 'timeoutMs') : 30000;

      const spinner = new Spinner();
      if (!ctx.json && !ctx.quiet) spinner.start(`Calling ${method}...`);
      try {
        await gateway.start();
        const result = await gateway.rpc(method, params, timeoutMs);
        if (!ctx.json && !ctx.quiet) spinner.succeed(`RPC call completed`);
        return { data: { success: true, result } };
      } catch (error) {
        if (!ctx.json && !ctx.quiet) spinner.fail(`RPC call failed`);
        throw error;
      }
    }

    default:
      throw new Error('Usage: gateway <status|start|stop|restart|health|rpc>');
  }
}

function formatGatewayStatusHuman(value: unknown): string {
  const data = value as {
    status?: { state?: string; port?: number };
    connected?: boolean;
    health?: { ok?: boolean; error?: string };
  };
  const lines = [
    `Gateway   ${data.status?.state || 'unknown'} (port: ${data.status?.port ?? '-'})`,
    `Socket    ${data.connected ? 'connected' : 'disconnected'}`,
    `Health    ${data.health?.ok ? 'ok' : `down${data.health?.error ? ` (${data.health.error})` : ''}`}`,
  ];
  return `${lines.join('\n')}\n`;
}
