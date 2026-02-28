/**
 * ClawHub command handler
 */
import { ClawHubService } from '../../../gateway/clawhub';
import { parseArgs, getOptionString, getOptionBoolean, parseNumber } from '../parse';
import { formatTable, Spinner } from '../output';
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult } from '../types';

export async function handleClawHub(ctx: CommandContext, service: ClawHubService): Promise<CommandResult> {
  const [subcommand, ...rest] = ctx.args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printCommandHelp('clawhub');
    return { data: undefined };
  }

  switch (subcommand) {
    case 'search': {
      const parsed = parseArgs(rest);
      const query = parsed.positionals.join(' ').trim();
      if (!query) throw new Error('Usage: clawhub search <query> [--limit <n>]');
      const limitRaw = getOptionString(parsed.options, 'limit');
      const limit = limitRaw ? parseNumber(limitRaw, 'limit') : undefined;
      return { data: await service.search({ query, limit }) };
    }
    case 'explore': {
      const parsed = parseArgs(rest);
      const limitRaw = getOptionString(parsed.options, 'limit');
      const limit = limitRaw ? parseNumber(limitRaw, 'limit') : undefined;
      return { data: await service.explore({ limit }) };
    }
    case 'install': {
      const parsed = parseArgs(rest);
      const slug = parsed.positionals[0];
      if (!slug) throw new Error('Usage: clawhub install <slug> [--version <v>] [--force]');
      const version = getOptionString(parsed.options, 'version');
      const force = getOptionBoolean(parsed.options, 'force');

      const spinner = new Spinner();
      if (!ctx.json && !ctx.quiet) spinner.start(`Installing ${slug}...`);
      try {
        await service.install({ slug, version, force });
        if (!ctx.json && !ctx.quiet) spinner.succeed(`Installed ${slug}`);
        return { data: { success: true, slug, version: version || null } };
      } catch (error) {
        if (!ctx.json && !ctx.quiet) spinner.fail(`Failed to install ${slug}`);
        throw error;
      }
    }
    case 'uninstall': {
      if (!rest[0]) throw new Error('Usage: clawhub uninstall <slug>');
      const spinner = new Spinner();
      if (!ctx.json && !ctx.quiet) spinner.start(`Uninstalling ${rest[0]}...`);
      try {
        await service.uninstall({ slug: rest[0] });
        if (!ctx.json && !ctx.quiet) spinner.succeed(`Uninstalled ${rest[0]}`);
        return { data: { success: true, slug: rest[0] } };
      } catch (error) {
        if (!ctx.json && !ctx.quiet) spinner.fail(`Failed to uninstall ${rest[0]}`);
        throw error;
      }
    }
    case 'list': {
      const data = await service.listInstalled();
      return {
        data,
        humanFormatter: formatClawHubListHuman,
      };
    }
    default:
      throw new Error('Usage: clawhub <search|explore|install|uninstall|list>');
  }
}

function formatClawHubListHuman(value: unknown): string {
  const skills = value as Array<{ slug?: string; name?: string; version?: string; installed?: boolean }>;

  if (!Array.isArray(skills) || skills.length === 0) return 'No skills installed\n';

  const rows = skills.map((s) => ({
    slug: s.slug || '-',
    name: s.name || '-',
    version: s.version || '-',
  }));

  return formatTable(rows);
}
