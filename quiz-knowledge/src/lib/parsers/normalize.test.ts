import { describe, it, expect } from 'vitest';
import { normalizeText } from './normalize';

describe('normalizeText', () => {
  it('strips BOM', () => {
    expect(normalizeText('﻿hello')).toBe('hello');
  });

  it('converts CRLF to LF', () => {
    expect(normalizeText('a\r\nb')).toBe('a\nb');
  });

  it('collapses 3+ newlines to 2', () => {
    expect(normalizeText('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeText('a    b')).toBe('a b');
  });

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello  world  ')).toBe('hello world');
  });

  it('normalizes complex input', () => {
    const input = '﻿Hello\r\n\r\n\r\nWorld  with  spaces';
    const expected = 'Hello\n\nWorld with spaces';
    expect(normalizeText(input)).toBe(expected);
  });
});
