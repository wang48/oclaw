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

export interface RuntimeState {
  ready: boolean;
  runtimePath: string;
  manifestPath?: string | null;
  repaired?: boolean;
  source?: string;
}

export type InstanceStatus = 'stopped' | 'starting' | 'running' | 'error' | 'reconnecting';

export interface InstanceState {
  name: 'openclaw';
  type: 'server';
  status: InstanceStatus;
  pid: number | null;
  port: number | null;
  startedAt: string | null;
  runtimePath: string;
}

export interface WebOpenResult {
  success: boolean;
  target: 'dashboard' | 'control';
  appStarted: boolean;
  url?: string | null;
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
