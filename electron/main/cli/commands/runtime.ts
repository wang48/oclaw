import { GatewayManager } from '../../../gateway/manager';
import {
  getOpenClawDir,
  getOpenClawConfigDir,
  getOpenClawSkillsDir,
  ensureDir,
} from '../../../utils/paths';
import { printCommandHelp } from '../help';
import { parseArgs, parseNumber, getOptionString } from '../parse';
import { OpenClawInstanceManager } from '../services/instance-manager';
import type { CommandContext, CommandResult } from '../types';

export async function handleRuntime(ctx: CommandContext, gateway?: GatewayManager): Promise<CommandResult> {
  const [subcommand, ...rest] = ctx.args;
  const manager = new OpenClawInstanceManager((gateway ?? ({} as GatewayManager)));

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printCommandHelp('runtime');
    return { data: undefined };
  }

  switch (subcommand) {
    case 'status': {
      const status = manager.getPackageStatus();
      const runtime = manager.getRuntimeInfo();
      return {
        data: {
          ...status,
          ready: runtime.ready,
          runtimePath: runtime.runtimePath,
          configDir: getOpenClawConfigDir(),
          skillsDir: getOpenClawSkillsDir(),
        },
      };
    }
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
    case 'version':
      return { data: { version: await manager.getVersion() } };
    case 'repair':
      return { data: { success: true, runtime: await manager.ensureRuntime() } };
    case 'logs': {
      const parsed = parseArgs(rest);
      const linesArg = getOptionString(parsed.options, 'lines');
      const lines = linesArg ? parseNumber(linesArg, 'lines') : 200;
      return { data: await manager.logs({ lines, follow: false }) };
    }
    case 'exec': {
      const args = rest[0] === '--' ? rest.slice(1) : rest;
      const exitCode = await manager.execEmbeddedOpenClaw(args, { inheritStdio: true });
      return { data: { success: exitCode === 0, exitCode } };
    }
    default: {
      const args = ctx.args[0] === '--' ? ctx.args.slice(1) : ctx.args;
      const exitCode = await manager.execEmbeddedOpenClaw(args, { inheritStdio: true });
      return { data: { success: exitCode === 0, exitCode } };
    }
  }
}
