import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { formatTable, Spinner } from '../../../electron/main/cli/output';

describe('formatTable', () => {
  it('formats array of objects as table', () => {
    const rows = [
      { name: 'Alice', age: 30, city: 'NYC' },
      { name: 'Bob', age: 25, city: 'LA' },
    ];
    const result = formatTable(rows);
    expect(result).toContain('NAME');
    expect(result).toContain('AGE');
    expect(result).toContain('CITY');
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
  });

  it('handles null and undefined values', () => {
    const rows = [
      { name: 'Alice', age: null, city: undefined },
    ];
    const result = formatTable(rows);
    expect(result).toContain('-');
  });

  it('handles object values by stringifying', () => {
    const rows = [
      { name: 'Alice', meta: { key: 'value' } },
    ];
    const result = formatTable(rows);
    expect(result).toContain('{"key":"value"}');
  });

  it('returns "No data" for empty array', () => {
    expect(formatTable([])).toBe('No data\n');
  });

  it('pads columns correctly', () => {
    const rows = [
      { short: 'a', long: 'very long value' },
      { short: 'b', long: 'x' },
    ];
    const result = formatTable(rows);
    const lines = result.split('\n').filter(l => l.trim());
    // All lines should have similar length due to padding
    const lengths = lines.map(l => l.length);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(5);
  });
});

describe('Spinner', () => {
  let spinner: Spinner;
  let stderrWrite: typeof process.stderr.write;
  let writtenData: string[] = [];

  beforeEach(() => {
    spinner = new Spinner();
    writtenData = [];
    stderrWrite = process.stderr.write;
    // Mock stderr.write to capture output
    process.stderr.write = vi.fn((data: string | Uint8Array) => {
      writtenData.push(String(data));
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    spinner.stop();
    process.stderr.write = stderrWrite;
  });

  it('does not output when not TTY', () => {
    const originalIsTTY = process.stderr.isTTY;
    process.stderr.isTTY = false;

    spinner.start('Testing');
    expect(writtenData.length).toBe(0);

    process.stderr.isTTY = originalIsTTY;
  });

  it('starts and stops spinner', () => {
    const originalIsTTY = process.stderr.isTTY;
    process.stderr.isTTY = true;

    spinner.start('Testing');
    // Should have started interval
    expect(spinner['interval']).not.toBeNull();

    spinner.stop();
    // Should have cleared interval
    expect(spinner['interval']).toBeNull();

    process.stderr.isTTY = originalIsTTY;
  });

  it('updates message', () => {
    const originalIsTTY = process.stderr.isTTY;
    process.stderr.isTTY = true;

    spinner.start('Initial');
    expect(spinner['message']).toBe('Initial');

    spinner.update('Updated');
    expect(spinner['message']).toBe('Updated');

    process.stderr.isTTY = originalIsTTY;
  });

  it('succeed stops spinner and shows success', () => {
    const originalIsTTY = process.stderr.isTTY;
    process.stderr.isTTY = true;

    spinner.start('Testing');
    spinner.succeed('Done');

    expect(spinner['interval']).toBeNull();
    expect(writtenData.some(d => d.includes('✓'))).toBe(true);

    process.stderr.isTTY = originalIsTTY;
  });

  it('fail stops spinner and shows failure', () => {
    const originalIsTTY = process.stderr.isTTY;
    process.stderr.isTTY = true;

    spinner.start('Testing');
    spinner.fail('Error');

    expect(spinner['interval']).toBeNull();
    expect(writtenData.some(d => d.includes('✗'))).toBe(true);

    process.stderr.isTTY = originalIsTTY;
  });
});
