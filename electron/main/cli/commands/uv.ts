/**
 * UV command handler
 */
import { checkUvInstalled, installUv, setupManagedPython } from '../../../utils/uv-setup';
import { Spinner } from '../output';
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult } from '../types';

export async function handleUv(ctx: CommandContext): Promise<CommandResult> {
  const [subcommand] = ctx.args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printCommandHelp('uv');
    return { data: undefined };
  }

  switch (subcommand) {
    case 'check':
      return { data: { installed: await checkUvInstalled() } };
    case 'install-all': {
      const spinner = new Spinner();
      if (!ctx.json && !ctx.quiet) spinner.start('Checking uv installation...');

      const isInstalled = await checkUvInstalled();
      if (!isInstalled) {
        if (!ctx.json && !ctx.quiet) spinner.update('Installing uv...');
        await installUv();
      }

      if (!ctx.json && !ctx.quiet) spinner.update('Setting up managed Python...');
      await setupManagedPython();

      if (!ctx.json && !ctx.quiet) spinner.succeed('UV and Python setup complete');
      return { data: { success: true } };
    }
    default:
      throw new Error('Usage: uv <check|install-all>');
  }
}
