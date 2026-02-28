import { describe, expect, it } from 'vitest';
import { isCliInvocationArgs, resolveCliArgs, COMMAND_ALIASES } from '../../../electron/main/cli/args';

describe('cli args resolution', () => {
  it('recognizes direct command invocation', () => {
    expect(resolveCliArgs(['status'])).toEqual(['status']);
    expect(isCliInvocationArgs(['gateway', 'status'])).toBe(true);
  });

  it('keeps backward-compatible --cli invocations', () => {
    expect(resolveCliArgs(['--cli', 'status'])).toEqual(['status']);
  });

  it('supports global --json before command', () => {
    expect(resolveCliArgs(['--json', 'status'])).toEqual(['--json', 'status']);
  });

  it('supports global --verbose before command', () => {
    expect(resolveCliArgs(['--verbose', 'status'])).toEqual(['--verbose', 'status']);
  });

  it('supports global --quiet before command', () => {
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
      expect(resolveCliArgs(['--json', 'st'])).toEqual(['--json', 'status']);
    });

    it('resolves gw to gateway', () => {
      expect(resolveCliArgs(['gw', 'status'])).toEqual(['gateway', 'status']);
    });

    it('resolves pv to provider', () => {
      expect(resolveCliArgs(['pv', 'list'])).toEqual(['provider', 'list']);
    });

    it('resolves ch to channel', () => {
      expect(resolveCliArgs(['ch', 'list'])).toEqual(['channel', 'list']);
    });

    it('resolves sk to skill', () => {
      expect(resolveCliArgs(['sk', 'status'])).toEqual(['skill', 'status']);
    });

    it('resolves cr to cron', () => {
      expect(resolveCliArgs(['cr', 'list'])).toEqual(['cron', 'list']);
    });

    it('resolves ct to chat', () => {
      expect(resolveCliArgs(['ct', 'sessions'])).toEqual(['chat', 'sessions']);
    });

    it('resolves hub to clawhub', () => {
      expect(resolveCliArgs(['hub', 'list'])).toEqual(['clawhub', 'list']);
    });

    it('resolves oc to openclaw', () => {
      expect(resolveCliArgs(['oc', 'status'])).toEqual(['openclaw', 'status']);
    });

    it('preserves subcommands and flags after alias resolution', () => {
      expect(resolveCliArgs(['gw', 'start', '--verbose'])).toEqual(['gateway', 'start', '--verbose']);
    });

    it('supports global flags before aliases', () => {
      expect(resolveCliArgs(['--json', 'pv', 'list'])).toEqual(['--json', 'provider', 'list']);
    });
  });

  describe('alias mapping completeness', () => {
    it('has all expected aliases defined', () => {
      expect(COMMAND_ALIASES).toEqual({
        st: 'status',
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
});
