# Plan — Task 0.2 (TailwindCSS configuration, v4-adapted)

Date: 2026-05-09
Slug: `2026-05-09-task-0-2-configure-tailwindcss`
Driver: Continuation of Phase 0 after Task 0.1 finished (commit `790a41b`). User asked to proceed to Task 0.2 as part of the "combo cả 3 bước".
Closes: OI-task01-exec.A (Task 0.2 needs Tailwind v4 idioms).

## Goal

Make Task 0.2 reflect the actual v4 reality on disk:

- No `tailwind.config.ts` (v4 auto-discovers content).
- `@import "tailwindcss"` (not the v3 directive trio).
- Theme tokens via `@theme { … }` CSS blocks (when needed; deferred to Task 0.3 shadcn).

…and produce both:

1. An updated Task 0.2 entry in `phase-0-project-setup.md`.
2. A standalone detail guide `task-0-2-configure-tailwindcss.md` matching the Task 0.1 detail-doc pattern.

Then verify the scaffold passes the new acceptance bar.

## Decisions made

| Point | Decision | Reason |
|---|---|---|
| Re-execute Tailwind smoke test? | **No** — already passed in Task 0.1 §5.2 (we injected `bg-blue-500 ... rounded` and curl confirmed classes were rendered). State on disk is unchanged. | Avoid re-spinning dev server for a verification we already did 30 minutes ago. |
| Add custom theme tokens now? | **No** — defer to Task 0.3 (shadcn will write its own theme block). | Avoid rebase pain when shadcn rewrites `globals.css`. |
| Keep Task 0.2 minimal vs writing fuller content? | **Minimal**, but write the detail guide so Phase 0 has a consistent per-task pattern (matching Task 0.1). | The pattern is the value; the actual technical work is small. |
| Editor extension recommendations? | Include but mark optional. | Some teammates may use other editors. |

## What was actually done

1. Verified disk state (already correct from Task 0.1):
   - `quiz-knowledge/src/app/globals.css` is exactly `@import "tailwindcss";`
   - `quiz-knowledge/tailwind.config.ts` does not exist (v4 doesn't generate one)
   - `quiz-knowledge/postcss.config.mjs` declares `@tailwindcss/postcss` plugin
   - `quiz-knowledge/src/app/layout.tsx` imports `./globals.css`
2. Updated `docs/architecture/phases/phase-0-project-setup.md` Task 0.2:
   - Replaced v3 idioms (config glob, three `@tailwind` directives) with v4 reality.
   - Added explicit "do not add v3 idioms" guard for AI assistants.
   - Linked to the detail guide.
   - Added "no `tailwind.config.ts` exists" to the acceptance criteria.
3. Created `docs/architecture/phases/task-0-2-configure-tailwindcss.md`:
   - §0 Why short on v4 (v3-vs-v4 table).
   - §1 What's already in place (verify, don't change).
   - §2 Styling Strategy (locked decisions: utilities only, no CSS modules, no inline styles, theme tokens via `@theme`).
   - §3 Validation (3 one-line checks).
   - §4 Editor setup (VS Code IntelliSense, optional Prettier plugin).
   - §5 When (and how) to add theme tokens.
   - §6 Pitfalls (5 v4-specific symptoms with fixes).
   - §7 Definition of Done (7-item checklist).
4. Ran §3.1 and §3.2 validations on actual disk → both pass.

## What was NOT done

- No code edits to `quiz-knowledge/`. The scaffold is already correct.
- No re-run of `pnpm dev` for §3.3 (already verified in Task 0.1).
- No changes to `tailwind.config.ts` (intentionally absent in v4).
- No theme-token additions (deferred to Task 0.3).
- No `.prettierrc` / Prettier plugin install (Task 0.8 owns this).

## Files

- Updated: `docs/architecture/phases/phase-0-project-setup.md` (Task 0.2 section, ~30 lines rewritten)
- Created: `docs/architecture/phases/task-0-2-configure-tailwindcss.md`
- Created: `docs/changes/2026-05-09-task-0-2-configure-tailwindcss/plan.md` (this file)
- Created: `docs/changes/2026-05-09-task-0-2-configure-tailwindcss/acceptance.md`

## Open Issues

| ID | Description |
|---|---|
| OI-task02.A | Defer all theme-token decisions to Task 0.3. After shadcn installs, audit which tokens we actually want vs. shadcn defaults. |
| OI-task02.B | Decide whether to commit `prettier-plugin-tailwindcss` in Task 0.8 — diff-noise reduction is real but adds one dev dep. |
| OI-task02.C | Tailwind CSS IntelliSense version requirement (≥ v0.12 for v4). If a teammate has older, Tailwind autocomplete will be silently wrong. Mention in onboarding notes. |

## Spec impact

None.

## Checkpoints

- [x] Verified scaffold matches v4 expectations
- [x] phase-0-project-setup.md Task 0.2 section updated
- [x] task-0-2-configure-tailwindcss.md detail guide created (mirrors Task 0.1 pattern)
- [x] §3.1 + §3.2 validations passed live
- [x] OI-task01-exec.A closed (Task 0.2 now v4-aware)
- [x] Open Issues catalogued (OI-task02.A–C)
- [x] plan.md written
- [x] acceptance.md written
