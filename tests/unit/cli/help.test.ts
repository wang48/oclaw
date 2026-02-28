import { describe, expect, it } from 'vitest';
import { getCommandHelp, getAllCommands } from '../../../electron/main/cli/help';

describe('help system', () => {
  it('returns help for all commands', () => {
    const commands = getAllCommands();
    expect(commands.length).toBeGreaterThan(0);

    const commandNames = commands.map(c => c.name);
    expect(commandNames).toContain('status');
    expect(commandNames).toContain('gateway');
    expect(commandNames).toContain('provider');
    expect(commandNames).toContain('channel');
    expect(commandNames).toContain('skill');
    expect(commandNames).toContain('cron');
    expect(commandNames).toContain('chat');
    expect(commandNames).toContain('clawhub');
    expect(commandNames).toContain('openclaw');
    expect(commandNames).toContain('uv');
    expect(commandNames).toContain('completion');
  });

  it('returns help for status command', () => {
    const help = getCommandHelp('status');
    expect(help).toBeDefined();
    expect(help?.name).toBe('status');
    expect(help?.summary).toBeTruthy();
    expect(help?.usage).toContain('oclaw status');
    expect(help?.aliases).toContain('st');
  });

  it('returns help for gateway command', () => {
    const help = getCommandHelp('gateway');
    expect(help).toBeDefined();
    expect(help?.name).toBe('gateway');
    expect(help?.subcommands).toBeDefined();
    expect(help?.subcommands?.length).toBeGreaterThan(0);
    expect(help?.subcommands?.some(s => s.name === 'status')).toBe(true);
    expect(help?.aliases).toContain('gw');
  });

  it('returns help for provider command', () => {
    const help = getCommandHelp('provider');
    expect(help).toBeDefined();
    expect(help?.name).toBe('provider');
    expect(help?.subcommands).toBeDefined();
    expect(help?.subcommands?.some(s => s.name === 'list')).toBe(true);
    expect(help?.examples).toBeDefined();
    expect(help?.examples?.length).toBeGreaterThan(0);
    expect(help?.aliases).toContain('pv');
  });

  it('returns help for completion command', () => {
    const help = getCommandHelp('completion');
    expect(help).toBeDefined();
    expect(help?.name).toBe('completion');
    expect(help?.subcommands).toBeDefined();
    expect(help?.subcommands?.some(s => s.name === 'bash')).toBe(true);
    expect(help?.subcommands?.some(s => s.name === 'zsh')).toBe(true);
  });

  it('returns undefined for unknown command', () => {
    const help = getCommandHelp('nonexistent');
    expect(help).toBeUndefined();
  });

  it('all commands have required fields', () => {
    const commands = getAllCommands();
    for (const cmd of commands) {
      expect(cmd.name).toBeTruthy();
      expect(cmd.summary).toBeTruthy();
      expect(cmd.usage).toBeTruthy();
      expect(cmd.aliases).toBeDefined();
      expect(Array.isArray(cmd.aliases)).toBe(true);
    }
  });

  it('all commands with subcommands have descriptions', () => {
    const commands = getAllCommands();
    for (const cmd of commands) {
      if (cmd.subcommands) {
        for (const sub of cmd.subcommands) {
          expect(sub.name).toBeTruthy();
          expect(sub.description).toBeTruthy();
        }
      }
    }
  });

  it('all commands with examples have descriptions', () => {
    const commands = getAllCommands();
    for (const cmd of commands) {
      if (cmd.examples) {
        for (const ex of cmd.examples) {
          expect(ex.command).toBeTruthy();
          expect(ex.description).toBeTruthy();
        }
      }
    }
  });
});
