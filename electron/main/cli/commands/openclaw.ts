/**
 * OpenClaw command handler
 */
import {
  getOpenClawStatus,
  getOpenClawDir,
  getOpenClawConfigDir,
  getOpenClawSkillsDir,
  ensureDir,
} from '../../../utils/paths';
import { getOpenClawCliCommand, installOpenClawCliMac } from '../../../utils/openclaw-cli';
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult } from '../types';

export async function handleOpenClaw(ctx: CommandContext): Promise<CommandResult> {
  const [subcommand] = ctx.args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printCommandHelp('openclaw');
    return { data: undefined };
  }

  switch (subcommand) {
    case 'status':
      return { data: getOpenClawStatus({ silent: true }) };
    case 'paths': {
      const skillsDir = getOpenClawSkillsDir();
      ensureDir(skillsDir);
      return {
        data: {
          dir: getOpenClawDir(),
          configDir: getOpenClawConfigDir(),
          skillsDir,
        },
      };
    }
    case 'cli-command':
      return { data: { command: getOpenClawCliCommand() } };
    case 'install-cli-mac':
      return { data: await installOpenClawCliMac() };
    default:
      throw new Error('Usage: openclaw <status|paths|cli-command|install-cli-mac>');
  }
}
