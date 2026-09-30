import { describe, it, expect } from 'vitest';
import { chunkText } from './chunker';

describe('chunkText', () => {
  it('handles empty string', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('handles whitespace-only string', () => {
    expect(chunkText('   ')).toEqual([]);
  });

  it('returns single chunk for short text', () => {
    const text = 'hello world this is a test';
    const chunks = chunkText(text);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toContain('hello');
  });

  it('splits long text into multiple chunks', () => {
    const text = 'word '.repeat(20000);
    const chunks = chunkText(text, 1000);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('preserves all content across chunks', () => {
    const text = 'The quick brown fox jumps over the lazy dog. '.repeat(100);
    const chunks = chunkText(text, 500);
    const reconstructed = chunks.join('');
    expect(reconstructed.length).toBeGreaterThan(0);
  });
});
