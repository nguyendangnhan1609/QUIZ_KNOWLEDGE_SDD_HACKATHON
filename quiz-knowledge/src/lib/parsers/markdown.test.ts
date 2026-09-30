import { describe, it, expect } from 'vitest';
import { parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('parses plain markdown', async () => {
    const input = Buffer.from('# Hello\n\nThis is markdown.');
    const result = await parseMarkdown(input);
    expect(result).toContain('Hello');
    expect(result).toContain('markdown');
  });

  it('strips YAML front-matter', async () => {
    const input = Buffer.from(
      '---\ntitle: Test\nauthor: Me\n---\n# Content\nBody text.',
    );
    const result = await parseMarkdown(input);
    expect(result).not.toContain('---');
    expect(result).toContain('Content');
  });

  it('throws for empty markdown', async () => {
    const input = Buffer.from('');
    await expect(parseMarkdown(input)).rejects.toThrow('empty');
  });
});
