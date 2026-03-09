export type OclawServiceCommand = 'start-gateway' | 'stop-and-exit' | 'show-window' | 'open-control';

const BACKGROUND_FLAG = '--oclaw-background-service';
const COMMAND_PREFIX = '--oclaw-service-command=';

export interface ParsedServiceFlags {
  background: boolean;
  command: OclawServiceCommand | null;
}

export function parseServiceFlags(argv: string[]): ParsedServiceFlags {
  let background = false;
  let command: OclawServiceCommand | null = null;

  for (const token of argv) {
    if (token === BACKGROUND_FLAG) {
      background = true;
      continue;
    }
    if (token.startsWith(COMMAND_PREFIX)) {
      const value = token.slice(COMMAND_PREFIX.length) as OclawServiceCommand;
      if (value === 'start-gateway' || value === 'stop-and-exit' || value === 'show-window' || value === 'open-control') {
        command = value;
      }
    }
  }

  return { background, command };
}

export function buildServiceArgs(command: OclawServiceCommand, background = true): string[] {
  const args = [`${COMMAND_PREFIX}${command}`];
  if (background) {
    args.unshift(BACKGROUND_FLAG);
  }
  return args;
}
