# Change: Question language selection at quiz generation

## Scope
Add a language option (Vietnamese, English, Japanese — default Vietnamese) to the
quiz-generation flow so the AI-generated questions, options, and explanations are
produced in the language the user selects, instead of always defaulting to the
source document's implicit language.

## Design
- `Quiz.language` (String, default `"vi"`) persists the chosen language per quiz,
  following the same pattern as `Question.difficulty` (plain string column + Zod
  `z.enum` validation, no native Postgres/Prisma enum).
- `createQuizRequestSchema` validates `language: z.enum(['vi','en','ja']).default('vi')`.
- `language` is threaded through `createQuiz()` → `generateQuestions()` →
  `generateForChunk()` → `callClaude()` → `userPrompt(chunk, n, language)`.
- `prompts.ts` adds a `Language` type and `LANGUAGE_NAMES` map, and `userPrompt`
  now instructs the model to write `question`/`options`/`explanation` in the
  chosen language, while explicitly keeping the `difficulty` enum tokens
  (`easy`/`medium`/`hard`) in English (verified: `difficulty` is never rendered
  to end users, so translating it would only break internal logic).
- `SYSTEM_PROMPT` is left untouched (guardrail comment: verbatim from
  technical-design §7.3).
- `GenerateForm.tsx` gets a `RadioGroup` (existing, previously-unused
  `src/components/ui/radio-group.tsx`) with Vietnamese selected by default,
  next to the existing "Questions per attempt" field.

## Files changed
- `quiz-knowledge/prisma/schema.prisma` — add `language` column to `Quiz`.
- `quiz-knowledge/prisma/migrations/3_add_quiz_language/migration.sql` — new,
  hand-authored SQL migration (repo convention; not auto-generated).
- `quiz-knowledge/src/lib/ai/prompts.ts` — `Language` type, `LANGUAGE_NAMES`,
  language instruction in `userPrompt`.
- `quiz-knowledge/src/lib/ai/generateQuestions.ts` — thread `language` through.
- `quiz-knowledge/src/lib/services/quizzes.ts` — accept/persist `language`.
- `quiz-knowledge/src/lib/schemas/quizzes.ts` — validate `language`.
- `quiz-knowledge/src/app/manager/quizzes/new/_components/GenerateForm.tsx` —
  language picker UI.
- `quiz-knowledge/src/lib/ai/prompts.test.ts` — new, covers the language
  instruction and the untranslated-difficulty-token guarantee.

## Open Issues
- `OI-10.a` — `docs/architecture/` §7.3/§7.4 (prompt + AI client) is already
  stale versus the actual Anthropic-based implementation (predates this
  change). This change adds further drift by extending `userPrompt`'s
  signature. Not resolved here (out of scope for a chat-scoped feature add);
  needs a dedicated phase to resync the architecture doc with `src/lib/ai/`.
- `OI-10.b` — The new migration SQL must be applied manually against the
  database (Supabase Studio or `prisma migrate`) after merge; it is not
  executed as part of this change.

## Verification
- `npx tsc --noEmit` in `quiz-knowledge/` (type-check the `Language` type
  threaded across files).
- `npm test -- prompts.test.ts` (and full suite) to confirm no regressions in
  `ai.test.ts` / `quizSessions.test.ts`.
- Manual: run dev server, go to `/manager/quizzes/new`, generate a quiz for
  each of the three languages, confirm question/options/explanation come back
  in the selected language (requires a valid `ANTHROPIC_API_KEY`).
