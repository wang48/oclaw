import { describe, expect, it } from 'vitest';
import { getCommandHelp, getAllCommands } from '../../../electron/main/cli/help';

describe('help system', () => {
  it('returns help for primary and compatibility commands', () => {
    const commandNames = getAllCommands().map((c) => c.name);
    expect(commandNames).toContain('start');
    expect(commandNames).toContain('restart');
    expect(commandNames).toContain('status');
    expect(commandNames).toContain('web');
    expect(commandNames).toContain('runtime');
    expect(commandNames).toContain('provider');
    expect(commandNames).toContain('channel');
    expect(commandNames).toContain('skill');
    expect(commandNames).toContain('server');
    expect(commandNames).toContain('gateway');
    expect(commandNames).toContain('openclaw');
    expect(commandNames).toContain('ps');
  });

  it('returns help for status command', () => {
    const help = getCommandHelp('status');
    expect(help?.usage).toContain('oclaw status');
    expect(help?.aliases).toContain('st');
  });

  it('returns help for web command', () => {
    const help = getCommandHelp('web');
    expect(help?.subcommands?.some((s) => s.name === 'dashboard')).toBe(true);
    expect(help?.subcommands?.some((s) => s.name === 'control')).toBe(true);
  });

  it('returns help for runtime command', () => {
    const help = getCommandHelp('runtime');
    expect(help?.aliases).toContain('rt');
    expect(help?.subcommands?.some((s) => s.name === 'repair')).toBe(true);
    expect(help?.subcommands?.some((s) => s.name === 'exec -- <args...>')).toBe(true);
  });

  it('returns provider help with action verbs', () => {
    const help = getCommandHelp('provider');
    expect(help?.subcommands?.some((s) => s.name === 'add <json>')).toBe(true);
    expect(help?.subcommands?.some((s) => s.name === 'remove <id>')).toBe(true);
    expect(help?.subcommands?.some((s) => s.name === 'default <id>')).toBe(true);
  });

  it('returns channel help with action verbs', () => {
    const help = getCommandHelp('channel');
    expect(help?.subcommands?.some((s) => s.name === 'add <type> <json>')).toBe(true);
    expect(help?.subcommands?.some((s) => s.name === 'remove <type>')).toBe(true);
  });

  it('returns skill help with config verbs', () => {
    const help = getCommandHelp('skill');
    expect(help?.subcommands?.some((s) => s.name === 'list')).toBe(true);
    expect(help?.subcommands?.some((s) => s.name === 'config <key>')).toBe(true);
    expect(help?.subcommands?.some((s) => s.name === 'set <key> <json>')).toBe(true);
  });

  it('marks compatibility commands', () => {
    expect(getCommandHelp('server')?.compat).toBe(true);
    expect(getCommandHelp('gateway')?.compat).toBe(true);
    expect(getCommandHelp('openclaw')?.compat).toBe(true);
    expect(getCommandHelp('ps')?.compat).toBe(true);
  });

  it('returns undefined for unknown command', () => {
    expect(getCommandHelp('nonexistent')).toBeUndefined();
  });
});
