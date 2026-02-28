/**
 * Chat command handler
 */
import { randomUUID } from 'node:crypto';
import { GatewayManager } from '../../../gateway/manager';
import { parseArgs, getOptionString, getOptionBoolean, parseNumber } from '../parse';
import { Spinner } from '../output';
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult } from '../types';

export async function handleChat(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const [subcommand, ...rest] = ctx.args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printCommandHelp('chat');
    return { data: undefined };
  }

  await gateway.start();

  switch (subcommand) {
    case 'sessions': {
      const parsed = parseArgs(rest);
      const limitRaw = getOptionString(parsed.options, 'limit');
      const limit = limitRaw ? parseNumber(limitRaw, 'limit') : 50;
      return { data: await gateway.rpc('sessions.list', { limit }) };
    }
    case 'history': {
      const parsed = parseArgs(rest);
      const sessionKey = parsed.positionals[0];
      if (!sessionKey) throw new Error('Usage: chat history <sessionKey> [--limit <n>]');
      const limitRaw = getOptionString(parsed.options, 'limit');
      const limit = limitRaw ? parseNumber(limitRaw, 'limit') : 200;
      return { data: await gateway.rpc('chat.history', { sessionKey, limit }) };
    }
    case 'send': {
      const parsed = parseArgs(rest);
      const sessionKey = parsed.positionals[0];
      const message = parsed.positionals[1];
      if (!sessionKey || !message) {
        throw new Error('Usage: chat send <sessionKey> <message> [--deliver] [--idempotency-key <key>]');
      }

      const deliver = getOptionBoolean(parsed.options, 'deliver');
      const idempotencyKey = getOptionString(parsed.options, 'idempotency-key') || randomUUID();

      const spinner = new Spinner();
      if (!ctx.json && !ctx.quiet) spinner.start('Sending message...');
      try {
        const data = await gateway.rpc('chat.send', {
          sessionKey,
          message,
          deliver,
          idempotencyKey,
        }, 120000);
        if (!ctx.json && !ctx.quiet) spinner.succeed('Message sent');
        return { data };
      } catch (error) {
        if (!ctx.json && !ctx.quiet) spinner.fail('Failed to send message');
        throw error;
      }
    }
    case 'abort': {
      if (!rest[0]) throw new Error('Usage: chat abort <sessionKey>');
      return { data: await gateway.rpc('chat.abort', { sessionKey: rest[0] }) };
    }
    default:
      throw new Error('Usage: chat <sessions|history|send|abort>');
  }
}
