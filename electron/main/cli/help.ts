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
  status: {
    name: 'status',
    aliases: getAliasesFor('status'),
    summary: 'Show runtime summary',
    usage: 'oclaw status [flags]',
    flags: [
      { name: '--json', description: 'Output as JSON' },
      { name: '--quiet', description: 'Minimal output' },
    ],
    examples: [
      { command: 'oclaw status', description: 'Show full status overview' },
      { command: 'oclaw st --json', description: 'Status as JSON' },
    ],
  },
  openclaw: {
    name: 'openclaw',
    aliases: getAliasesFor('openclaw'),
    summary: 'OpenClaw package and paths',
    usage: 'oclaw openclaw <subcommand> [flags]',
    subcommands: [
      { name: 'status', description: 'Show OpenClaw package status' },
      { name: 'paths', description: 'Show OpenClaw directory paths' },
      { name: 'cli-command', description: 'Show the OpenClaw CLI command path' },
      { name: 'install-cli-mac', description: 'Install OpenClaw CLI symlink on macOS' },
    ],
    examples: [
      { command: 'oclaw openclaw status', description: 'Check if OpenClaw is ready' },
      { command: 'oclaw oc paths', description: 'Show config and skill directories' },
    ],
  },
  gateway: {
    name: 'gateway',
    aliases: getAliasesFor('gateway'),
    summary: 'Gateway status and controls',
    usage: 'oclaw gateway <subcommand> [flags]',
    subcommands: [
      { name: 'status', description: 'Show gateway status and health' },
      { name: 'start', description: 'Start the gateway process' },
      { name: 'stop', description: 'Stop the gateway process' },
      { name: 'restart', description: 'Restart the gateway process' },
      { name: 'health', description: 'Check gateway health' },
      { name: 'rpc', description: 'Send a raw RPC call to the gateway' },
    ],
    flags: [
      { name: '--connect', description: 'Connect to gateway before checking status' },
    ],
    examples: [
      { command: 'oclaw gateway status', description: 'Check gateway state' },
      { command: 'oclaw gw start', description: 'Start the gateway' },
      { command: 'oclaw gw rpc sessions.list \'{"limit":10}\'', description: 'Send RPC call' },
    ],
  },
  provider: {
    name: 'provider',
    aliases: getAliasesFor('provider'),
    summary: 'Manage AI providers',
    usage: 'oclaw provider <subcommand> [options]',
    subcommands: [
      { name: 'list', description: 'List all configured providers' },
      { name: 'get <id>', description: 'Get provider details' },
      { name: 'save <json>', description: 'Create or update a provider' },
      { name: 'update <id> <json>', description: 'Patch an existing provider' },
      { name: 'delete <id>', description: 'Delete a provider' },
      { name: 'set-key <id> <key>', description: 'Set API key for a provider' },
      { name: 'delete-key <id>', description: 'Delete API key for a provider' },
      { name: 'has-key <id>', description: 'Check if provider has an API key' },
      { name: 'get-key <id>', description: 'Get API key for a provider' },
      { name: 'set-default <id>', description: 'Set the default provider' },
      { name: 'get-default', description: 'Get the default provider ID' },
    ],
    flags: [
      { name: '--api-key <key>', description: 'API key (for save/update)' },
      { name: '--json', description: 'Output as JSON' },
    ],
    examples: [
      { command: 'oclaw provider list', description: 'List all providers' },
      { command: 'oclaw pv save \'{"id":"my-openai","name":"OpenAI","type":"openai"}\' --api-key sk-xxx', description: 'Create provider with key' },
      { command: 'oclaw pv set-default my-openai', description: 'Set default provider' },
    ],
  },
  channel: {
    name: 'channel',
    aliases: getAliasesFor('channel'),
    summary: 'Manage channel configs',
    usage: 'oclaw channel <subcommand> [options]',
    subcommands: [
      { name: 'list', description: 'List configured channels' },
      { name: 'get <type>', description: 'Get channel config' },
      { name: 'get-form <type>', description: 'Get channel form values' },
      { name: 'save <type> <json>', description: 'Save channel config' },
      { name: 'delete <type>', description: 'Delete channel config' },
      { name: 'enable <type>', description: 'Enable a channel' },
      { name: 'disable <type>', description: 'Disable a channel' },
      { name: 'validate <type>', description: 'Validate channel config' },
      { name: 'validate-credentials <type> <json>', description: 'Validate channel credentials' },
    ],
    examples: [
      { command: 'oclaw channel list', description: 'List all channels' },
      { command: 'oclaw ch enable telegram', description: 'Enable telegram channel' },
    ],
  },
  skill: {
    name: 'skill',
    aliases: getAliasesFor('skill'),
    summary: 'Manage skill settings',
    usage: 'oclaw skill <subcommand> [options]',
    subcommands: [
      { name: 'status', description: 'Show skill status from gateway' },
      { name: 'enable <key>', description: 'Enable a skill' },
      { name: 'disable <key>', description: 'Disable a skill' },
      { name: 'list-config', description: 'List all skill configs' },
      { name: 'get-config <key>', description: 'Get skill config' },
      { name: 'update-config <key> <json>', description: 'Update skill config' },
    ],
    examples: [
      { command: 'oclaw skill status', description: 'Show all skill statuses' },
      { command: 'oclaw sk enable web-search', description: 'Enable a skill' },
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
    examples: [
      { command: 'oclaw cron list', description: 'List all scheduled jobs' },
      { command: 'oclaw cr trigger abc123', description: 'Trigger a job now' },
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
    flags: [
      { name: '--limit <n>', description: 'Limit number of results' },
      { name: '--deliver', description: 'Deliver message to channel (for send)' },
      { name: '--idempotency-key <key>', description: 'Idempotency key (for send)' },
    ],
    examples: [
      { command: 'oclaw chat sessions --limit 10', description: 'List recent sessions' },
      { command: 'oclaw ct send my-session "Hello!"', description: 'Send a message' },
    ],
  },
  clawhub: {
    name: 'clawhub',
    aliases: getAliasesFor('clawhub'),
    summary: 'Explore and install skills',
    usage: 'oclaw clawhub <subcommand> [options]',
    subcommands: [
      { name: 'search <query>', description: 'Search for skills' },
      { name: 'explore', description: 'Browse available skills' },
      { name: 'install <slug>', description: 'Install a skill' },
      { name: 'uninstall <slug>', description: 'Uninstall a skill' },
      { name: 'list', description: 'List installed skills' },
    ],
    flags: [
      { name: '--limit <n>', description: 'Limit number of results' },
      { name: '--version <v>', description: 'Specific version to install' },
      { name: '--force', description: 'Force reinstall' },
    ],
    examples: [
      { command: 'oclaw clawhub search "web scraper"', description: 'Search for skills' },
      { command: 'oclaw hub install my-skill --version 1.0.0', description: 'Install specific version' },
      { command: 'oclaw hub list', description: 'List installed skills' },
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
    examples: [
      { command: 'oclaw uv check', description: 'Check uv installation' },
      { command: 'oclaw uv install-all', description: 'Install uv and Python' },
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
    examples: [
      { command: 'eval "$(oclaw completion bash)"', description: 'Enable bash completions' },
      { command: 'eval "$(oclaw completion zsh)"', description: 'Enable zsh completions' },
    ],
  },
};

export function getCommandHelp(command: string): CommandHelp | undefined {
  return COMMANDS[command];
}

export function getAllCommands(): CommandHelp[] {
  return Object.values(COMMANDS);
}

/**
 * Format and print help for a specific command
 */
export function printCommandHelp(command: string): void {
  const help = COMMANDS[command];
  if (!help) {
    process.stderr.write(`Unknown command: ${command}\n`);
    return;
  }

  const lines: string[] = [];
  lines.push(`oclaw ${help.name} - ${help.summary}`);
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

/**
 * Print the top-level help message
 */
export function printHelp(): void {
  const lines: string[] = [];
  lines.push('Oclaw CLI');
  lines.push('');
  lines.push('Desktop AI agent runtime and control plane.');
  lines.push('');
  lines.push('Usage:');
  lines.push('  oclaw [flags]');
  lines.push('  oclaw [command]');
  lines.push('');
  lines.push('Available Commands:');

  const allCommands = getAllCommands();
  const maxLen = Math.max(...allCommands.map((c) => c.name.length));
  for (const cmd of allCommands) {
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
