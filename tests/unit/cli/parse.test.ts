import { describe, expect, it } from 'vitest';
import {
  parseArgs,
  getOptionString,
  getOptionBoolean,
  parseBoolean,
  parseNumber,
  parseJson,
  parseJsonObject,
  toStringRecord,
} from '../../../electron/main/cli/parse';

describe('parseArgs', () => {
  it('parses positional arguments', () => {
    const result = parseArgs(['cmd', 'arg1', 'arg2']);
    expect(result.positionals).toEqual(['cmd', 'arg1', 'arg2']);
    expect(result.options).toEqual({});
  });

  it('parses boolean flags', () => {
    const result = parseArgs(['--flag1', '--flag2']);
    expect(result.positionals).toEqual([]);
    expect(result.options).toEqual({ flag1: true, flag2: true });
  });

  it('parses options with values', () => {
    const result = parseArgs(['--key', 'value', '--other', 'data']);
    expect(result.positionals).toEqual([]);
    expect(result.options).toEqual({ key: 'value', other: 'data' });
  });

  it('parses options with = syntax', () => {
    const result = parseArgs(['--key=value', '--other=data']);
    expect(result.positionals).toEqual([]);
    expect(result.options).toEqual({ key: 'value', other: 'data' });
  });

  it('mixes positionals and options', () => {
    const result = parseArgs(['cmd', '--flag', 'arg1', '--key', 'value']);
    // Note: 'arg1' comes after --flag, so it's treated as the value for --flag
    expect(result.positionals).toEqual(['cmd']);
    expect(result.options).toEqual({ flag: 'arg1', key: 'value' });
  });

  it('treats option-like value as value when preceded by option', () => {
    const result = parseArgs(['--key', '--value']);
    expect(result.positionals).toEqual([]);
    expect(result.options).toEqual({ key: true, value: true });
  });
});

describe('getOptionString', () => {
  it('returns string value', () => {
    expect(getOptionString({ key: 'value' }, 'key')).toBe('value');
  });

  it('returns last value from array', () => {
    expect(getOptionString({ key: ['val1', 'val2'] }, 'key')).toBe('val2');
  });

  it('returns undefined for boolean', () => {
    expect(getOptionString({ key: true }, 'key')).toBeUndefined();
  });

  it('returns undefined for missing key', () => {
    expect(getOptionString({}, 'key')).toBeUndefined();
  });
});

describe('getOptionBoolean', () => {
  it('returns true for boolean true', () => {
    expect(getOptionBoolean({ key: true }, 'key')).toBe(true);
  });

  it('returns false for boolean false', () => {
    expect(getOptionBoolean({ key: false }, 'key')).toBe(false);
  });

  it('returns true for truthy strings', () => {
    expect(getOptionBoolean({ key: 'true' }, 'key')).toBe(true);
    expect(getOptionBoolean({ key: '1' }, 'key')).toBe(true);
    expect(getOptionBoolean({ key: 'yes' }, 'key')).toBe(true);
    expect(getOptionBoolean({ key: 'on' }, 'key')).toBe(true);
  });

  it('returns false for falsy strings', () => {
    expect(getOptionBoolean({ key: 'false' }, 'key')).toBe(false);
    expect(getOptionBoolean({ key: '0' }, 'key')).toBe(false);
    expect(getOptionBoolean({ key: 'no' }, 'key')).toBe(false);
    expect(getOptionBoolean({ key: 'off' }, 'key')).toBe(false);
  });

  it('returns false for missing key', () => {
    expect(getOptionBoolean({}, 'key')).toBe(false);
  });

  it('handles arrays by taking last value', () => {
    expect(getOptionBoolean({ key: ['false', 'true'] }, 'key')).toBe(true);
  });
});

describe('parseBoolean', () => {
  it('parses truthy values', () => {
    expect(parseBoolean('true', 'test')).toBe(true);
    expect(parseBoolean('1', 'test')).toBe(true);
    expect(parseBoolean('yes', 'test')).toBe(true);
    expect(parseBoolean('on', 'test')).toBe(true);
    expect(parseBoolean('TRUE', 'test')).toBe(true);
  });

  it('parses falsy values', () => {
    expect(parseBoolean('false', 'test')).toBe(false);
    expect(parseBoolean('0', 'test')).toBe(false);
    expect(parseBoolean('no', 'test')).toBe(false);
    expect(parseBoolean('off', 'test')).toBe(false);
    expect(parseBoolean('FALSE', 'test')).toBe(false);
  });

  it('throws on invalid values', () => {
    expect(() => parseBoolean('invalid', 'test')).toThrow('Invalid test: invalid');
  });
});

describe('parseNumber', () => {
  it('parses valid numbers', () => {
    expect(parseNumber('42', 'test')).toBe(42);
    expect(parseNumber('3.14', 'test')).toBe(3.14);
    expect(parseNumber('-10', 'test')).toBe(-10);
  });

  it('throws on invalid numbers', () => {
    expect(() => parseNumber('abc', 'test')).toThrow('Invalid test: abc');
    // Empty string parses to 0, which is a valid number
    expect(parseNumber('0', 'test')).toBe(0);
  });
});

describe('parseJson', () => {
  it('parses valid JSON', () => {
    expect(parseJson('{"key":"value"}', 'test')).toEqual({ key: 'value' });
    expect(parseJson('[1,2,3]', 'test')).toEqual([1, 2, 3]);
    expect(parseJson('null', 'test')).toBeNull();
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJson('{invalid}', 'test')).toThrow('Invalid test JSON');
  });
});

describe('parseJsonObject', () => {
  it('parses valid JSON objects', () => {
    expect(parseJsonObject('{"key":"value"}', 'test')).toEqual({ key: 'value' });
  });

  it('throws on non-object JSON', () => {
    expect(() => parseJsonObject('[1,2,3]', 'test')).toThrow('test must be a JSON object');
    expect(() => parseJsonObject('null', 'test')).toThrow('test must be a JSON object');
    expect(() => parseJsonObject('"string"', 'test')).toThrow('test must be a JSON object');
  });
});

describe('toStringRecord', () => {
  it('converts values to strings', () => {
    expect(toStringRecord({ a: 'str', b: 42, c: true }, 'test')).toEqual({
      a: 'str',
      b: '42',
      c: 'true',
    });
  });

  it('skips null and undefined values', () => {
    expect(toStringRecord({ a: 'str', b: null, c: undefined }, 'test')).toEqual({ a: 'str' });
  });

  it('throws on object values', () => {
    expect(() => toStringRecord({ a: { nested: 'obj' } }, 'test')).toThrow('test.a must be a string');
  });
});
