/**
 * CLI argument parsing utilities
 */

export type ParsedOptionValue = string | boolean | string[];

export interface ParsedArgs {
  positionals: string[];
  options: Record<string, ParsedOptionValue>;
}

/**
 * Parse command-line arguments into positionals and options
 */
export function parseArgs(args: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options: Record<string, ParsedOptionValue> = {};

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const eqIndex = token.indexOf('=');
    if (eqIndex > 2) {
      const key = token.slice(2, eqIndex);
      const value = token.slice(eqIndex + 1);
      options[key] = value;
      continue;
    }

    const key = token.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      i += 1;
      continue;
    }

    options[key] = true;
  }

  return { positionals, options };
}

/**
 * Get a string option value
 */
export function getOptionString(options: Record<string, ParsedOptionValue>, key: string): string | undefined {
  const value = options[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[value.length - 1];
  return undefined;
}

/**
 * Get a boolean option value
 */
export function getOptionBoolean(options: Record<string, ParsedOptionValue>, key: string): boolean {
  const value = options[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return !['false', '0', 'no', 'off'].includes(normalized);
  }
  if (Array.isArray(value) && value.length > 0) {
    return getOptionBoolean({ [key]: value[value.length - 1] }, key);
  }
  return false;
}

/**
 * Parse a boolean string value
 */
export function parseBoolean(value: string, label: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Invalid ${label}: ${value}. Use true/false.`);
}

/**
 * Parse an unknown value as boolean
 */
export function parseUnknownBoolean(value: unknown, label: string): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return parseBoolean(value, label);
  return Boolean(value);
}

/**
 * Parse a number string value
 */
export function parseNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

/**
 * Parse a JSON string value
 */
export function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid ${label} JSON: ${String(error)}`, { cause: error });
  }
}

/**
 * Parse a JSON object string value
 */
export function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const parsed = parseJson(value, label);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed;
}

/**
 * Convert a record to string values
 */
export function toStringRecord(input: Record<string, unknown>, label: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (typeof value === 'object') {
      throw new Error(`${label}.${key} must be a string`);
    }
    output[key] = String(value);
  }
  return output;
}
