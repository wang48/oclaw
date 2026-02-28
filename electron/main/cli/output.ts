/**
 * CLI output formatting utilities
 */
import { inspect } from 'node:util';

/**
 * Print value as JSON
 */
export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Print value in human-readable format
 */
export function printHuman(value: unknown): void {
  if (value == null) return;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    process.stdout.write(`${String(value)}\n`);
    return;
  }
  if (Array.isArray(value) && value.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
    process.stdout.write(formatTable(value as Array<Record<string, unknown>>));
    return;
  }
  process.stdout.write(`${inspect(value, {
    depth: null,
    colors: process.stdout.isTTY,
    compact: false,
    sorted: false,
  })}\n`);
}

/**
 * Print value in quiet mode (minimal output)
 */
export function printQuiet(value: unknown): void {
  if (value == null) return;

  // For objects with success/id fields, just print the key info
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if ('success' in obj && obj.success) {
      if ('id' in obj) {
        process.stdout.write(`${obj.id}\n`);
        return;
      }
      if ('providerId' in obj) {
        process.stdout.write(`${obj.providerId}\n`);
        return;
      }
      if ('channelType' in obj) {
        process.stdout.write(`${obj.channelType}\n`);
        return;
      }
      if ('slug' in obj) {
        process.stdout.write(`${obj.slug}\n`);
        return;
      }
      process.stdout.write('ok\n');
      return;
    }
  }

  // For arrays, just print count
  if (Array.isArray(value)) {
    process.stdout.write(`${value.length}\n`);
    return;
  }

  // For primitives, print as-is
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    process.stdout.write(`${String(value)}\n`);
    return;
  }

  // Fallback to JSON
  printJson(value);
}

/**
 * Format array of objects as a table
 */
export function formatTable(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return 'No data\n';

  const columns = Object.keys(rows[0]);
  const widths = columns.map((col) => col.length);
  const normalizedRows = rows.map((row) =>
    columns.map((col) => {
      const value = row[col];
      if (value == null) return '-';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    })
  );

  normalizedRows.forEach((row) => {
    row.forEach((cell, idx) => {
      widths[idx] = Math.max(widths[idx], cell.length);
    });
  });

  const header = columns
    .map((col, idx) => col.toUpperCase().padEnd(widths[idx] + 2))
    .join('');
  const body = normalizedRows
    .map((row) => row.map((cell, idx) => cell.padEnd(widths[idx] + 2)).join(''))
    .join('\n');

  const boldHeader = process.stdout.isTTY ? `\x1b[1m${header}\x1b[0m` : header;
  return `${boldHeader}\n${body}\n`;
}

/**
 * Simple spinner for long-running operations
 */
export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private interval: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private message = '';

  start(message: string): void {
    if (!process.stderr.isTTY) return;
    this.message = message;
    this.frameIndex = 0;
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex++ % this.frames.length];
      process.stderr.write(`\r${frame} ${this.message}`);
    }, 80);
  }

  update(message: string): void {
    this.message = message;
  }

  succeed(message?: string): void {
    this.stop();
    if (process.stderr.isTTY) {
      process.stderr.write(`\r✓ ${message || this.message}\n`);
    }
  }

  fail(message?: string): void {
    this.stop();
    if (process.stderr.isTTY) {
      process.stderr.write(`\r✗ ${message || this.message}\n`);
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      if (process.stderr.isTTY) {
        process.stderr.write('\r\x1b[K');
      }
    }
  }
}
