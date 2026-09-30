// Verbatim from technical-design §7.3
// Do NOT modify without checking <content> tag and "do not invent facts" rule

export const SYSTEM_PROMPT = `
You are an expert assessment designer creating multiple-choice questions
from internal company documentation. Your goal is to test COMPREHENSION,
not memorization of trivia.

Hard rules:
- Output ONLY valid JSON matching the schema. No prose, no markdown fences.
- Every question MUST have exactly 4 options.
- Exactly ONE option is correct.
- Distractors must be plausible but unambiguously wrong based on the source.
- Do NOT invent facts not present in the source. If unsure, skip.
- Difficulty: "easy" (recall), "medium" (application), "hard" (inference).
- Explanation: 1-2 sentences citing the source content.
- Ignore truncated fragments at the very start or end of the content block.
`.trim();

export type Language = 'vi' | 'en' | 'ja';

export const LANGUAGE_NAMES: Record<Language, string> = {
  vi: 'Vietnamese',
  en: 'English',
  ja: 'Japanese',
};

export const userPrompt = (chunk: string, n: number, language: Language) => `
Generate ${n} multiple-choice questions from the following content.
Write the "question" text, every item in "options", and the "explanation" entirely in ${LANGUAGE_NAMES[language]}.
Keep the "difficulty" value itself as the literal English token ("easy", "medium", or "hard") — do not translate it.

<content>
${chunk}
</content>

Return JSON in this exact shape:
{
  "questions": [
    {
      "question": "string",
      "options": ["string","string","string","string"],
      "correctIndex": 0,
      "explanation": "string",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}
`.trim();
