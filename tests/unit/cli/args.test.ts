import { describe, expect, it } from 'vitest';
import { isCliInvocationArgs, resolveCliArgs, COMMAND_ALIASES } from '../../../electron/main/cli/args';

describe('cli args resolution', () => {
  it('recognizes primary commands', () => {
    expect(resolveCliArgs(['start'])).toEqual(['start']);
    expect(resolveCliArgs(['restart'])).toEqual(['restart']);
    expect(resolveCliArgs(['status'])).toEqual(['status']);
    expect(resolveCliArgs(['web'])).toEqual(['web']);
    expect(resolveCliArgs(['runtime'])).toEqual(['runtime']);
    expect(isCliInvocationArgs(['channel', 'list'])).toBe(true);
  });

  it('keeps backward-compatible --cli invocations', () => {
    expect(resolveCliArgs(['--cli', 'status'])).toEqual(['status']);
  });

  it('supports global flags before command', () => {
    expect(resolveCliArgs(['--json', 'status'])).toEqual(['--json', 'status']);
    expect(resolveCliArgs(['--verbose', 'status'])).toEqual(['--verbose', 'status']);
    expect(resolveCliArgs(['--quiet', 'status'])).toEqual(['--quiet', 'status']);
  });

  it('ignores macOS psn arg and separators', () => {
    expect(resolveCliArgs(['-psn_0_12345', '--', 'status'])).toEqual(['status']);
  });

  it('returns empty for non-cli args', () => {
    expect(resolveCliArgs([])).toEqual([]);
    expect(resolveCliArgs(['.'])).toEqual([]);
    expect(isCliInvocationArgs(['.'])).toBe(false);
  });

  it('finds command even if app path-like arg exists', () => {
    expect(resolveCliArgs(['/Applications/Oclaw.app/Contents/Resources/app.asar', 'status']))
      .toEqual(['status']);
  });

  describe('command aliases', () => {
    it('resolves st to status', () => {
      expect(resolveCliArgs(['st'])).toEqual(['status']);
    });

    it('resolves fix to repair', () => {
      expect(resolveCliArgs(['fix'])).toEqual(['repair']);
    });

    it('resolves rt to runtime', () => {
      expect(resolveCliArgs(['rt', 'status'])).toEqual(['runtime', 'status']);
    });

    it('resolves legacy aliases', () => {
      expect(resolveCliArgs(['srv'])).toEqual(['server']);
      expect(resolveCliArgs(['gw', 'status'])).toEqual(['gateway', 'status']);
      expect(resolveCliArgs(['pv', 'list'])).toEqual(['provider', 'list']);
      expect(resolveCliArgs(['ch', 'list'])).toEqual(['channel', 'list']);
      expect(resolveCliArgs(['sk', 'status'])).toEqual(['skill', 'status']);
      expect(resolveCliArgs(['cr', 'list'])).toEqual(['cron', 'list']);
      expect(resolveCliArgs(['ct', 'sessions'])).toEqual(['chat', 'sessions']);
      expect(resolveCliArgs(['hub', 'list'])).toEqual(['clawhub', 'list']);
      expect(resolveCliArgs(['oc', 'status'])).toEqual(['openclaw', 'status']);
    });
  });

  it('keeps unknown words out of CLI detection', () => {
    expect(isCliInvocationArgs(['channer', 'list'])).toBe(false);
  });

  it('has all expected aliases defined', () => {
    expect(COMMAND_ALIASES).toEqual({
      st: 'status',
      fix: 'repair',
      rt: 'runtime',
      srv: 'server',
      gw: 'gateway',
      pv: 'provider',
      ch: 'channel',
      sk: 'skill',
      cr: 'cron',
      ct: 'chat',
      hub: 'clawhub',
      oc: 'openclaw',
    });
  });
});
