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
export type ClientStatus = 'starting' | 'running-hidden' | 'running-visible' | 'stopped' | 'error';

export interface ClientState {
  pid: number | null;
  status: ClientStatus;
  trayReady: boolean;
  windowVisible: boolean;
  startedAt: string | null;
}

export interface InstanceState {
  name: 'openclaw';
  type: 'server';
  status: InstanceStatus;
  pid: number | null;
  port: number | null;
  startedAt: string | null;
  runtimePath: string;
}

export interface ServiceStatus {
  app: ClientState;
  instance: InstanceState;
}

export interface WebOpenResult {
  success: boolean;
  target: 'control';
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
