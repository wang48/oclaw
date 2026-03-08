/**
 * Shared CLI types
 */
import type { ParsedArgs } from './parse';

export interface CommandContext {
  args: string[];
  options: ParsedArgs['options'];
  json: boolean;
  verbose: boolean;
  quiet: boolean;
}

export interface CommandResult {
  data: unknown;
  humanFormatter?: (data: unknown) => string;
}

export class CliError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.details = details;
  }
}
