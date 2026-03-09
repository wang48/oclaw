/**
 * CLI help system with per-command documentation
 */
import { COMMAND_ALIASES } from './args';

interface SubcommandHelp {
  name: string;
  description: string;
}

interface FlagHelp {
  name: string;
  description: string;
}

interface ExampleHelp {
  command: string;
  description: string;
}

interface CommandHelp {
  name: string;
  aliases: string[];
  summary: string;
  usage: string;
  compat?: boolean;
  subcommands?: SubcommandHelp[];
  flags?: FlagHelp[];
  examples?: ExampleHelp[];
}

function getAliasesFor(command: string): string[] {
  return Object.entries(COMMAND_ALIASES)
    .filter(([, target]) => target === command)
    .map(([alias]) => alias);
}

const COMMANDS: Record<string, CommandHelp> = {
  start: {
    name: 'start',
    aliases: [],
    summary: 'Start Oclaw in background tray mode and ensure OpenClaw gateway is running',
    usage: 'oclaw start [flags]',
    examples: [
      { command: 'oclaw start', description: 'Start the background Oclaw client without opening the main window' },
    ],
  },
  stop: {
    name: 'stop',
    aliases: [],
    summary: 'Stop OpenClaw gateway and quit the background Oclaw client',
    usage: 'oclaw stop [flags]',
    examples: [
      { command: 'oclaw stop', description: 'Stop OpenClaw and exit the background client' },
    ],
  },
  restart: {
    name: 'restart',
    aliases: [],
    summary: 'Restart the background Oclaw client and its OpenClaw gateway',
    usage: 'oclaw restart [flags]',
    examples: [
      { command: 'oclaw restart', description: 'Restart the background client and print fresh status' },
    ],
  },
  logs: {
    name: 'logs',
    aliases: [],
    summary: 'Show OpenClaw service logs',
    usage: 'oclaw logs [--lines <n>] [--follow]',
    flags: [
      { name: '--lines <n>', description: 'Show last n log lines (default 200)' },
      { name: '--follow', description: 'Follow log output continuously' },
    ],
    examples: [
      { command: 'oclaw logs --lines 50', description: 'Show the latest 50 lines' },
      { command: 'oclaw logs --follow', description: 'Stream new log output' },
    ],
  },
  status: {
    name: 'status',
    aliases: getAliasesFor('status'),
    summary: 'Show runtime, gateway, provider, channel, and skill status',
    usage: 'oclaw status [flags]',
    flags: [
      { name: '--json', description: 'Output as JSON' },
      { name: '--quiet', description: 'Minimal output' },
    ],
    examples: [
      { command: 'oclaw status', description: 'Show the OpenClaw summary view' },
      { command: 'oclaw st --json', description: 'Status as JSON' },
    ],
  },
  control: {
    name: 'control',
    aliases: [],
    summary: 'Open the OpenClaw control UI in your browser',
    usage: 'oclaw control',
    examples: [
      { command: 'oclaw control', description: 'Ensure gateway is running and open the OpenClaw control UI' },
    ],
  },
  web: {
    name: 'web',
    aliases: [],
    compat: true,
    summary: 'Compatibility alias for oclaw control',
    usage: 'oclaw web [control]',
    subcommands: [
      { name: 'control', description: 'Equivalent to oclaw control' },
    ],
    examples: [
      { command: 'oclaw web', description: 'Compatibility alias for oclaw control' },
      { command: 'oclaw web control', description: 'Compatibility alias for oclaw control' },
    ],
  },
  repair: {
    name: 'repair',
    aliases: getAliasesFor('repair'),
    summary: 'Repair the embedded OpenClaw runtime',
    usage: 'oclaw repair [flags]',
    examples: [
      { command: 'oclaw repair', description: 'Repair bundled OpenClaw files if missing or broken' },
      { command: 'oclaw fix', description: 'Alias for repair' },
    ],
  },
  runtime: {
    name: 'runtime',
    aliases: getAliasesFor('runtime'),
    summary: 'Operate the embedded OpenClaw runtime directly',
    usage: 'oclaw runtime <status|repair|version|paths|logs|exec> [flags]',
    subcommands: [
      { name: 'status', description: 'Show embedded runtime status' },
      { name: 'repair', description: 'Repair the embedded runtime' },
      { name: 'version', description: 'Show embedded OpenClaw version' },
      { name: 'paths', description: 'Show runtime, config, and skills directories' },
      { name: 'logs', description: 'Show Oclaw/OpenClaw log output' },
      { name: 'exec -- <args...>', description: 'Run the embedded OpenClaw CLI directly' },
    ],
    examples: [
      { command: 'oclaw runtime status', description: 'Check runtime health and paths' },
      { command: 'oclaw runtime repair', description: 'Repair the embedded runtime' },
      { command: 'oclaw rt exec -- doctor --fix --yes', description: 'Run the embedded OpenClaw CLI' },
    ],
  },
  provider: {
    name: 'provider',
    aliases: getAliasesFor('provider'),
    summary: 'Manage model providers',
    usage: 'oclaw provider <subcommand> [options]',
    subcommands: [
      { name: 'list', description: 'List configured providers' },
      { name: 'get <id>', description: 'Get one provider' },
      { name: 'add <json>', description: 'Create a provider' },
      { name: 'update <id> <json>', description: 'Update a provider' },
      { name: 'remove <id>', description: 'Delete a provider' },
      { name: 'set-key <id> <key>', description: 'Set provider API key' },
      { name: 'remove-key <id>', description: 'Delete provider API key' },
      { name: 'default <id>', description: 'Set the default provider' },
      { name: 'current', description: 'Show the default provider' },
    ],
    flags: [
      { name: '--api-key <key>', description: 'API key for add/update' },
      { name: '--json', description: 'Output as JSON' },
    ],
    examples: [
      { command: 'oclaw provider list', description: 'List providers' },
      { command: 'oclaw provider add \'{"id":"my-openai","name":"OpenAI","type":"openai"}\' --api-key sk-xxx', description: 'Create a provider with API key' },
      { command: 'oclaw provider default my-openai', description: 'Set the default provider' },
    ],
  },
  channel: {
    name: 'channel',
    aliases: getAliasesFor('channel'),
    summary: 'Manage channel configuration',
    usage: 'oclaw channel <subcommand> [options]',
    subcommands: [
      { name: 'list', description: 'List configured channels' },
      { name: 'get <type>', description: 'Get channel config' },
      { name: 'add <type> <json>', description: 'Create or save channel config' },
      { name: 'update <type> <json>', description: 'Update channel config' },
      { name: 'remove <type>', description: 'Delete channel config' },
      { name: 'enable <type>', description: 'Enable a channel' },
      { name: 'disable <type>', description: 'Disable a channel' },
      { name: 'validate <type>', description: 'Validate channel config' },
    ],
    examples: [
      { command: 'oclaw channel list', description: 'List channels' },
      { command: 'oclaw ch enable telegram', description: 'Enable Telegram' },
    ],
  },
  skill: {
    name: 'skill',
    aliases: getAliasesFor('skill'),
    summary: 'Manage installed skills and their config',
    usage: 'oclaw skill <subcommand> [options]',
    subcommands: [
      { name: 'list', description: 'List installed skills and status' },
      { name: 'status', description: 'Show skill runtime status' },
      { name: 'enable <key>', description: 'Enable a skill' },
      { name: 'disable <key>', description: 'Disable a skill' },
      { name: 'config <key>', description: 'Show skill config' },
      { name: 'set <key> <json>', description: 'Update skill config' },
    ],
    examples: [
      { command: 'oclaw skill list', description: 'List skill status' },
      { command: 'oclaw skill enable web-search', description: 'Enable a skill' },
      { command: 'oclaw skill set web-search \'{"env":{"SERPAPI_API_KEY":"..."}}\'', description: 'Update skill config' },
    ],
  },
  server: {
    name: 'server',
    aliases: getAliasesFor('server'),
    compat: true,
    summary: 'Compatibility entry for start/status/restart',
    usage: 'oclaw server [start|status|restart] [flags]',
    subcommands: [
      { name: 'start', description: 'Equivalent to oclaw start' },
      { name: 'status', description: 'Equivalent to oclaw status' },
      { name: 'restart', description: 'Equivalent to oclaw restart' },
    ],
  },
  ps: {
    name: 'ps',
    aliases: [],
    compat: true,
    summary: 'Compatibility entry for listing managed instances',
    usage: 'oclaw ps [flags]',
  },
  openclaw: {
    name: 'openclaw',
    aliases: getAliasesFor('openclaw'),
    compat: true,
    summary: 'Compatibility entry for runtime operations',
    usage: 'oclaw openclaw <subcommand|embedded-command> [flags]',
    subcommands: [
      { name: 'status', description: 'Equivalent to oclaw runtime status' },
      { name: 'repair', description: 'Equivalent to oclaw runtime repair' },
      { name: 'version', description: 'Equivalent to oclaw runtime version' },
      { name: 'paths', description: 'Equivalent to oclaw runtime paths' },
      { name: 'exec -- <args...>', description: 'Equivalent to oclaw runtime exec -- <args...>' },
    ],
  },
  gateway: {
    name: 'gateway',
    aliases: getAliasesFor('gateway'),
    compat: true,
    summary: 'Legacy gateway controls for script compatibility',
    usage: 'oclaw gateway <subcommand> [flags]',
    subcommands: [
      { name: 'status', description: 'Show gateway status and health' },
      { name: 'start', description: 'Start the gateway process' },
      { name: 'stop', description: 'Stop the gateway process' },
      { name: 'restart', description: 'Restart the gateway process' },
      { name: 'health', description: 'Check gateway health' },
      { name: 'rpc', description: 'Send a raw RPC call to the gateway' },
    ],
  },
  cron: {
    name: 'cron',
    aliases: getAliasesFor('cron'),
    summary: 'Manage scheduled jobs',
    usage: 'oclaw cron <subcommand> [options]',
    subcommands: [
      { name: 'list', description: 'List all cron jobs' },
      { name: 'create <json>', description: 'Create a cron job' },
      { name: 'update <id> <json>', description: 'Update a cron job' },
      { name: 'delete <id>', description: 'Delete a cron job' },
      { name: 'toggle <id> <bool>', description: 'Enable or disable a cron job' },
      { name: 'trigger <id>', description: 'Trigger a cron job immediately' },
    ],
  },
  chat: {
    name: 'chat',
    aliases: getAliasesFor('chat'),
    summary: 'Chat sessions and messages',
    usage: 'oclaw chat <subcommand> [options]',
    subcommands: [
      { name: 'sessions', description: 'List chat sessions' },
      { name: 'history <key>', description: 'Get chat history for a session' },
      { name: 'send <key> <msg>', description: 'Send a message to a session' },
      { name: 'abort <key>', description: 'Abort an active chat session' },
    ],
  },
  clawhub: {
    name: 'clawhub',
    aliases: getAliasesFor('clawhub'),
    compat: true,
    summary: 'Legacy skill marketplace commands',
    usage: 'oclaw clawhub <subcommand> [options]',
    subcommands: [
      { name: 'search <query>', description: 'Search for skills' },
      { name: 'explore', description: 'Browse available skills' },
      { name: 'install <slug>', description: 'Install a skill' },
      { name: 'uninstall <slug>', description: 'Uninstall a skill' },
      { name: 'list', description: 'List installed skills' },
    ],
  },
  uv: {
    name: 'uv',
    aliases: [],
    summary: 'Check/install uv and Python',
    usage: 'oclaw uv <subcommand>',
    subcommands: [
      { name: 'check', description: 'Check if uv is installed' },
      { name: 'install-all', description: 'Install uv and set up managed Python' },
    ],
  },
  completion: {
    name: 'completion',
    aliases: [],
    summary: 'Generate shell completion scripts',
    usage: 'oclaw completion <shell>',
    subcommands: [
      { name: 'bash', description: 'Generate bash completion script' },
      { name: 'zsh', description: 'Generate zsh completion script' },
    ],
  },
};

export function getCommandHelp(command: string): CommandHelp | undefined {
  return COMMANDS[command];
}

export function getAllCommands(): CommandHelp[] {
  return Object.values(COMMANDS);
}

export function printCommandHelp(command: string): void {
  const help = COMMANDS[command];
  if (!help) {
    process.stderr.write(`Unknown command: ${command}\n`);
    return;
  }

  const lines: string[] = [];
  lines.push(`oclaw ${help.name} - ${help.summary}`);
  if (help.compat) {
    lines.push('');
    lines.push('Compatibility command. Prefer the newer top-level commands.');
  }
  lines.push('');
  lines.push('Usage:');
  lines.push(`  ${help.usage}`);

  if (help.subcommands && help.subcommands.length > 0) {
    lines.push('');
    lines.push('Subcommands:');
    const maxLen = Math.max(...help.subcommands.map((s) => s.name.length));
    for (const sub of help.subcommands) {
      lines.push(`  ${sub.name.padEnd(maxLen + 4)}${sub.description}`);
    }
  }

  if (help.flags && help.flags.length > 0) {
    lines.push('');
    lines.push('Flags:');
    const maxLen = Math.max(...help.flags.map((f) => f.name.length));
    for (const flag of help.flags) {
      lines.push(`  ${flag.name.padEnd(maxLen + 4)}${flag.description}`);
    }
  }

  if (help.examples && help.examples.length > 0) {
    lines.push('');
    lines.push('Examples:');
    for (const ex of help.examples) {
      lines.push(`  ${ex.command}`);
      lines.push(`      ${ex.description}`);
    }
  }

  if (help.aliases.length > 0) {
    lines.push('');
    lines.push(`Aliases: ${help.aliases.join(', ')}`);
  }

  lines.push('');
  process.stdout.write(lines.join('\n'));
}

export function printHelp(): void {
  const lines: string[] = [];
  const commands = getAllCommands();
  const primary = commands.filter((cmd) => !cmd.compat);
  const compat = commands.filter((cmd) => cmd.compat);
  const maxLen = Math.max(...commands.map((c) => c.name.length));

  lines.push('Oclaw CLI');
  lines.push('');
  lines.push('Desktop OpenClaw runtime and control plane.');
  lines.push('');
  lines.push('Usage:');
  lines.push('  oclaw [flags]');
  lines.push('  oclaw <command> [args]');
  lines.push('');
  lines.push('Primary Commands:');
  for (const cmd of primary) {
    const aliasStr = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
    lines.push(`  ${cmd.name.padEnd(maxLen + 4)}${cmd.summary}${aliasStr}`);
  }
  lines.push('');
  lines.push('Compatibility Commands:');
  for (const cmd of compat) {
    const aliasStr = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
    lines.push(`  ${cmd.name.padEnd(maxLen + 4)}${cmd.summary}${aliasStr}`);
  }
  lines.push('');
  lines.push('Flags:');
  lines.push('  -h, --help      Show help');
  lines.push('      --json      Output as JSON');
  lines.push('      --verbose   Show debug logs');
  lines.push('      --quiet     Minimal output for scripting');
  lines.push('  -v, --version   Show version');
  lines.push('');
  lines.push('Environment Variables:');
  lines.push('  OCLAW_OUTPUT=json    Equivalent to --json');
  lines.push('  OCLAW_VERBOSE=1      Equivalent to --verbose');
  lines.push('  OCLAW_QUIET=1        Equivalent to --quiet');
  lines.push('');
  lines.push('Use "oclaw <command> --help" for more information about a command.');
  lines.push('');

  process.stdout.write(lines.join('\n'));
}
