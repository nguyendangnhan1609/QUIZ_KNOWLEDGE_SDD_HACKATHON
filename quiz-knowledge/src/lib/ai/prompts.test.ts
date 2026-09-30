import { describe, it, expect } from 'vitest';
import { userPrompt } from './prompts';

describe('userPrompt', () => {
  it('instructs the model to write in the requested language', () => {
    const prompt = userPrompt('some content', 5, 'en');
    expect(prompt).toContain('English');
    expect(prompt).not.toContain('Vietnamese');
    expect(prompt).not.toContain('Japanese');
  });

  it('defaults to Vietnamese wording when language is vi', () => {
    const prompt = userPrompt('some content', 5, 'vi');
    expect(prompt).toContain('Vietnamese');
  });

  it('instructs the model to write in Japanese', () => {
    const prompt = userPrompt('some content', 5, 'ja');
    expect(prompt).toContain('Japanese');
  });

  it('always keeps the difficulty token untranslated', () => {
    for (const language of ['vi', 'en', 'ja'] as const) {
      const prompt = userPrompt('some content', 5, language);
      expect(prompt).toContain('do not translate it');
      expect(prompt).toContain('"easy", "medium", or "hard"');
    }
  });
});
