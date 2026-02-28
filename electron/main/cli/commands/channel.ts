/**
 * Channel command handler
 */
import {
  saveChannelConfig,
  getChannelConfig,
  getChannelFormValues,
  deleteChannelConfig,
  listConfiguredChannels,
  setChannelEnabled,
  validateChannelConfig,
  validateChannelCredentials,
} from '../../../utils/channel-config';
import { parseJsonObject, toStringRecord } from '../parse';
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult } from '../types';

export async function handleChannel(ctx: CommandContext): Promise<CommandResult> {
  const [subcommand, ...rest] = ctx.args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printCommandHelp('channel');
    return { data: undefined };
  }

  switch (subcommand) {
    case 'list':
      return { data: listConfiguredChannels() };
    case 'get': {
      if (!rest[0]) throw new Error('Usage: channel get <channelType>');
      return { data: getChannelConfig(rest[0]) };
    }
    case 'get-form': {
      if (!rest[0]) throw new Error('Usage: channel get-form <channelType>');
      return { data: getChannelFormValues(rest[0]) };
    }
    case 'save': {
      if (!rest[0] || !rest[1]) {
        throw new Error('Usage: channel save <channelType> <configJson>');
      }
      const channelType = rest[0];
      const config = parseJsonObject(rest[1], 'channel config');
      saveChannelConfig(channelType, config);
      return { data: { success: true, channelType } };
    }
    case 'delete': {
      if (!rest[0]) throw new Error('Usage: channel delete <channelType>');
      deleteChannelConfig(rest[0]);
      return { data: { success: true, channelType: rest[0] } };
    }
    case 'enable': {
      if (!rest[0]) throw new Error('Usage: channel enable <channelType>');
      setChannelEnabled(rest[0], true);
      return { data: { success: true, channelType: rest[0], enabled: true } };
    }
    case 'disable': {
      if (!rest[0]) throw new Error('Usage: channel disable <channelType>');
      setChannelEnabled(rest[0], false);
      return { data: { success: true, channelType: rest[0], enabled: false } };
    }
    case 'validate': {
      if (!rest[0]) throw new Error('Usage: channel validate <channelType>');
      return { data: validateChannelConfig(rest[0]) };
    }
    case 'validate-credentials': {
      if (!rest[0] || !rest[1]) {
        throw new Error('Usage: channel validate-credentials <channelType> <configJson>');
      }
      const channelType = rest[0];
      const input = parseJsonObject(rest[1], 'channel credentials');
      const credentials = toStringRecord(input, 'channel credentials');
      return { data: validateChannelCredentials(channelType, credentials) };
    }
    default:
      throw new Error('Usage: channel <list|get|get-form|save|delete|enable|disable|validate|validate-credentials>');
  }
}
