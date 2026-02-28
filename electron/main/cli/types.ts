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
