# Plan — Task 0.1 Actual Execution + Stack Version Pivot

Date: 2026-05-09
Slug: `2026-05-09-task-0-1-execution`
Driver: User instruction "thực hiện theo hướng dẫn trong task-0-1-initialize-nextjs.md" + decision **option A** (accept Next 16 + Tailwind v4 + React 19 from `@latest`).

## Goal

Execute Task 0.1 against the developer's machine, materialize the Next.js scaffold under `quiz-knowledge/`, validate it end-to-end, and reconcile docs with the actual installed stack.

## Decisions made during execution

| Point | Decision | Reason |
|---|---|---|
| pnpm not on PATH | Install via `corepack enable && corepack prepare pnpm@latest --activate` | Standard Node 16+ tooling; pnpm 11.0.9 installed |
| `@latest` resolved to Next 16 / React 19 / Tailwind v4 instead of spec'd Next 15 / Tailwind v3 | **Accept latest (option A)** | API-compatible; avoid re-scaffold burn; long-term healthier |
| pnpm 11 `[ERR_PNPM_IGNORED_BUILDS]` for `sharp` and `unrs-resolver` | Add `pnpm.onlyBuiltDependencies` to `package.json`; non-blocking warning | These are post-install native scripts not required for dev or for our MVP; warning is cosmetic |
| Earlier guide used `_smoke/` for App Router smoke test | **Bug fix:** rename to `smoke/` | Next.js App Router treats `_*` folders as private (excluded from routing). The original guide was wrong. |
| `.next/dev/types/` cached the deleted `smoke` route | Clear `.next/` after deleting the segment | Otherwise `tsc --noEmit` fails citing the deleted route's generated types |
| `pnpm exec tsc` failed because pnpm 11's deps-status-check re-runs install and exits 1 on `IGNORED_BUILDS` | Bypass: invoke `node node_modules/typescript/bin/tsc --noEmit` directly | Same effect, no pnpm wrapper |

## What was actually executed (in order)

1. `node --version` → v22.20.0 ✓
2. `git --version` → 2.51.2 ✓
3. `pnpm --version` → not found
4. `corepack enable; corepack prepare pnpm@latest --activate` → pnpm 11.0.9
5. `pnpm create next-app@latest quiz-knowledge --ts --eslint --tailwind --src-dir --app --turbopack --import-alias "@/*" --use-pnpm`
   - Resolved: Next 16.2.6, React 19.2.4, Tailwind v4.3.0, ESLint 9.39, TypeScript 5.9.3
6. Verified `src/app/{layout,page,globals.css,favicon.ico}` exist; `tsconfig.json` has `paths: { "@/*": ["./src/*"] }`
7. **Cleanup §4:**
   - Deleted `public/{file,globe,next,vercel,window}.svg`
   - Replaced `src/app/page.tsx` with one-line welcome (`Quiz Knowledge — scaffold ready`)
   - Simplified `src/app/globals.css` to `@import "tailwindcss";`
8. **Validation §5:**
   - §5.4 (TypeScript): `node node_modules/typescript/bin/tsc --noEmit` → exit 0 ✓
   - §5.1 + §5.2 (App runs + Tailwind): started `next dev`; `Invoke-WebRequest http://localhost:3000` → 200, page contains "Quiz Knowledge — scaffold ready"; injected `bg-blue-500 ... rounded` → re-fetched → classes present in HTML ✓
   - §5.3 (App Router): created `src/app/smoke/page.tsx`; fetched `/smoke` → 200 with "app router ok" ✓
   - §5.5 (Turbopack): startup banner shows `Next.js 16.2.6 (Turbopack)` ✓
9. Cleanup test artifacts:
   - Reverted `src/app/page.tsx` to the clean welcome
   - Removed `src/app/smoke/`
   - Killed dev server (PID 57820)
   - Removed `dev.log`, `dev.err.log`, leftover `pnpm-workspace.yaml`
   - Removed `.next/` to clear stale generated types
10. Final `tsc --noEmit` → exit 0 ✓
11. **NOT executed:** git commit (per global rule "NEVER commit unless user explicitly asks").

## Doc updates (reconciliation)

| Doc | Change |
|---|---|
| `technical-design.md` | §2 Framework row: Next.js 15 → **Next.js 16**, with note about scaffold resolution. Styling row: TailwindCSS → **TailwindCSS v4**, with note about `@import "tailwindcss"` and no `tailwind.config.ts`. |
| `implementation-plan.md` | §4 Phase 0 goal: drop hard "15" reference, note "currently 16.x; resolves to latest". |
| `phase-0-project-setup.md` | Task 0.1 Technical Requirements: list resolved versions; note Tailwind v4; note Turbopack is default in Next 16; reference detail guide. |
| `task-0-1-initialize-nextjs.md` | Header version banner: 15 → 16; Tailwind v3 → v4. §4 Simplify globals.css: replaced v3 `@tailwind` directives with v4 `@import "tailwindcss"`; added v4 specifics box (no config file, auto-discovery). §5.3: bug-fix smoke test from `_smoke` → `smoke`; added `.next/` cache clear step. §5.5: noted Turbopack is default in Next 16; updated banner expected output to `Next.js 16.2.6 (Turbopack)`. New §5.6: pnpm 11 `IGNORED_BUILDS` workaround. §7.2 pitfall: `--turbopack` flag is a no-op in Next 16. §7.3 Tailwind: full rewrite for v4 (no config file, no v3 directive trio). |

## Files

- Created (scaffold): `quiz-knowledge/**` — full Next.js 16 + Tailwind v4 app skeleton
- Updated (docs): `technical-design.md` (§2), `implementation-plan.md` (§4), `phase-0-project-setup.md` (Task 0.1), `task-0-1-initialize-nextjs.md` (header, §4, §5.3, §5.5, new §5.6, §7.2, §7.3)
- Created (per-change): `docs/changes/2026-05-09-task-0-1-execution/plan.md` (this), `acceptance.md`

## Open Issues forwarded

| ID | Description |
|---|---|
| OI-task01-exec.A | Task 0.2 (Configure TailwindCSS) needs revision to assume v4 idioms (no `tailwind.config.ts`, theme tokens via `@theme {…}` in `globals.css`). |
| OI-task01-exec.B | Task 0.3 (shadcn/ui) — verify shadcn CLI handles Tailwind v4 cleanly. shadcn officially supports v4 since Jan 2025; expect smooth, but worth a smoke during Task 0.3. |
| OI-task01-exec.C | `next.config.ts` is empty; Phases 6/7 may add metadata, image domains. No action now. |
| OI-task01-exec.D | `tailwind.config.ts` is **absent** (v4). All references in older docs to "edit `tailwind.config.ts` content glob" are obsolete; Task 0.7 / pitfalls in `phase-0-project-setup.md` may still mention it. Sweep on next phase pass. |
| ~~OI-task01-exec.E~~ | **Resolved 2026-05-09:** verified post-execution that `quiz-knowledge/.git` was never created (create-next-app skipped git init because outer is already a repo, or pnpm 11 default). Outer `D:/PROJECT/QUIZ_KNOWLEDGE_SDD_HACKATHON/.git` was already initialized with branch `main` and remote `origin = github.com/Brycen-VietNam/KNOWLEDGE_MNG_HACKATHON`. User chose option (b); minimal outer `.gitignore` added; initial commit `790a41b` created (43 files). Done. |
| OI-task01-exec.F | pnpm 11 ignored-builds warning is currently silenced via `package.json` config but the warning still appears on `pnpm install` runs. Cosmetic; revisit if it confuses CI later. |
| ~~OI-task01-exec.G~~ | **Resolved 2026-05-09:** user authorized git config changes (`.claude/rules/00-safety.md` updated in commit `0c79e19`). Ran `git config --global --add safe.directory D:/PROJECT/QUIZ_KNOWLEDGE_SDD_HACKATHON`. Future git commands no longer need `-c safe.directory=...` per-command override. The `.git/` directory remains owned by `CodexSandboxOffline` user; safe.directory whitelists it for `BRYCENVN/d_thanh` access. Done. |
| OI-task01-exec.H | `.gitattributes` not configured. Git is auto-converting LF→CRLF on Windows checkout (warnings during `git add`). Acceptable for now; consider adding `.gitattributes` with `* text=auto eol=lf` later for cross-platform consistency. |

## Spec impact

None. Spec v1.1 unchanged (it never named specific Next/Tailwind versions).

## Checkpoints

- [x] Prerequisites verified (Node, git, pnpm via corepack)
- [x] Scaffold created with all locked flags
- [x] Stack-version divergence surfaced and resolved (option A)
- [x] §4 cleanup applied (SVGs, page.tsx, globals.css)
- [x] §5 validation 5.1–5.5 all pass
- [x] §5.3 guide bug fixed (`_smoke` → `smoke`) in source guide
- [x] Test artifacts cleaned (smoke route, dev logs, `.next/`)
- [x] Final `tsc --noEmit` exits 0
- [x] Docs reconciled with actual installed stack
- [x] OI-task01-exec.A–F catalogued
- [x] Initial commit created: `790a41b chore: bootstrap project (docs + Next.js 16 scaffold)` — 43 files, 10,311 insertions. Branch `main`, working tree clean. **Not pushed** — push requires separate authorization.
