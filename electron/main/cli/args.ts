/**
 * CLI argument resolution and command alias mapping
 */

const ROOT_COMMANDS = new Set([
  'status',
  'openclaw',
  'gateway',
  'provider',
  'channel',
  'skill',
  'cron',
  'chat',
  'clawhub',
  'uv',
  'completion',
  'help',
  '--help',
  '-h',
]);

export const COMMAND_ALIASES: Record<string, string> = {
  st: 'status',
  gw: 'gateway',
  pv: 'provider',
  ch: 'channel',
  sk: 'skill',
  cr: 'cron',
  ct: 'chat',
  hub: 'clawhub',
  oc: 'openclaw',
};

const ALIAS_SET = new Set(Object.keys(COMMAND_ALIASES));

function normalizeArgs(args: string[]): string[] {
  return args
    .filter((arg) => arg !== '--cli')
    .filter((arg) => arg !== '--')
    .filter((arg) => !arg.startsWith('-psn_'));
}

function resolveAlias(token: string): string {
  return COMMAND_ALIASES[token] || token;
}

export function resolveCliArgs(args: string[]): string[] {
  const cleaned = normalizeArgs(args);
  if (cleaned.length === 0) return [];

  const firstCommandIdx = cleaned.findIndex(
    (arg) => ROOT_COMMANDS.has(arg) || ALIAS_SET.has(arg)
  );
  if (firstCommandIdx === -1) return [];

  const leadingGlobalOptions = cleaned
    .slice(0, firstCommandIdx)
    .filter((arg) => arg === '--json' || arg === '--verbose' || arg === '--quiet');

  const rest = cleaned.slice(firstCommandIdx);
  // Resolve alias on the command token only (first element)
  if (rest.length > 0) {
    rest[0] = resolveAlias(rest[0]);
  }

  return [...leadingGlobalOptions, ...rest];
}

export function isCliInvocationArgs(args: string[]): boolean {
  return resolveCliArgs(args).length > 0;
}
