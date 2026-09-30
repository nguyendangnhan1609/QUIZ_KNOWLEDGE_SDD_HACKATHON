# Plan — Task 0.3 (shadcn/ui Setup)

Date: 2026-05-09
Slug: `2026-05-09-task-0-3-shadcn-ui`
Driver: Continuation of Phase 0 after Task 0.2 (commit `9db4d9c`). User asked "thực hiện task tiếp theo".
Closes: OI-task01-exec.B (verify shadcn CLI handles Tailwind v4 cleanly).

## Goal

Install shadcn/ui in `quiz-knowledge/`, add the 10 primitives required by the implementation plan, validate they import + render, and capture the friction points encountered for the next teammate (or AI session).

## Decisions made during execution

| Point | Decision | Reason |
|---|---|---|
| pnpm 11 IGNORED_BUILDS blocks shadcn init | Run `pnpm approve-builds --all` once before init | `pnpm.onlyBuiltDependencies` in package.json was inconsistently honored across `dlx`-spawned subshells. `approve-builds --all` is deterministic. |
| `--base-color slate` flag rejected | Drop the flag | shadcn 4.x removed it. `--defaults` picks `neutral`. |
| init bailed mid-way → only `components.json` written, no `utils.ts`, no theme in `globals.css` | Re-run with `--force` after primitives are added | Tested: `--force` repopulates the missing files without clobbering primitives. |
| `add form` silently no-ops | Install via explicit URL `https://ui.shadcn.com/r/styles/new-york/form.json` | The default `base-nova` style does not ship `form` as of shadcn 4.7.0. |
| zod / react-hook-form / @hookform/resolvers came in transitively | Accept as installed; remove "install zod" line from later phases | Saves a future install step; nothing wrong with the versions. |
| Should `shadcn` package be in devDependencies? | Leave in `dependencies` | shadcn 4.x ships its CLI as a runtime helper. Bundler tree-shakes it; cosmetic only. |
| Brand color / theme tweaks now? | No | Defer to Phase 7. Default neutral palette is fine for MVP. |

## What was actually executed (in order)

1. `pnpm approve-builds --all` → all three native deps approved (sharp, unrs-resolver, msw).
2. `pnpm dlx shadcn@latest init --yes --defaults` → ran but bailed before writing `globals.css` and `utils.ts` due to an internal stale state on first attempt; only `components.json` was written.
3. Wrote `src/lib/utils.ts` manually with the canonical `cn()` (clsx + tailwind-merge) so `add` would succeed.
4. `pnpm dlx shadcn@latest add button card input table dialog label radio-group skeleton sonner --yes` → 9 files created.
5. Tried `add form` — silent no-op (not in `base-nova`).
6. `pnpm dlx shadcn@latest add https://ui.shadcn.com/r/styles/new-york/form.json --yes` → `form.tsx` created (10/10).
7. `pnpm dlx shadcn@latest init --yes --defaults --force` → repopulated `globals.css` (~128 lines, full theme block) and re-wrote `utils.ts` to canonical form. Did not touch existing primitives.
8. Edited `src/app/page.tsx` to import `<Button>` from `@/components/ui/button`. Smoke test:
   - `node node_modules/typescript/bin/tsc --noEmit` → 0
   - `pnpm dev` → curled `localhost:3000` → page contained both "Smoke" and "scaffold ready"
9. Reverted `src/app/page.tsx` to clean welcome.
10. Cleared `.next/`, ran `tsc --noEmit` → 0.
11. Created `.npmrc` with `strict-builds=false` (no effect against pnpm 11.0.9 in practice; left as defensive).

## What was NOT done

- **No git commit yet** — awaiting end-of-task review/authorization. (Pattern: Task 0.1 had explicit user "xác nhận" before committing.)
- No removal of `shadcn` from `dependencies` (cosmetic).
- No theme tweaks beyond shadcn's neutral default.
- No teardown of transitive deps that aren't used yet.

## Files

- Updated:
  - `quiz-knowledge/package.json` (deps added: @base-ui/react, @hookform/resolvers, @radix-ui/react-label, @radix-ui/react-slot, class-variance-authority, clsx, lucide-react, next-themes, react-hook-form, shadcn, sonner, tailwind-merge, tw-animate-css, zod; pnpm.onlyBuiltDependencies extended with msw)
  - `quiz-knowledge/pnpm-lock.yaml` (regenerated)
  - `quiz-knowledge/src/app/globals.css` (rewritten by shadcn init: imports + @theme block; 1 line → 128 lines)
  - `quiz-knowledge/src/app/page.tsx` (touched then reverted to scaffold-ready welcome)
  - `docs/architecture/phases/phase-0-project-setup.md` (Task 0.3 section: pnpm approve-builds prereq; form-via-URL note; updated acceptance/validation)
- Created:
  - `quiz-knowledge/components.json`
  - `quiz-knowledge/.npmrc`
  - `quiz-knowledge/src/lib/utils.ts`
  - `quiz-knowledge/src/components/ui/{button,card,dialog,form,input,label,radio-group,skeleton,sonner,table}.tsx` (10 files)
  - `docs/architecture/phases/task-0-3-shadcn-ui.md`
  - `docs/changes/2026-05-09-task-0-3-shadcn-ui/plan.md` (this)
  - `docs/changes/2026-05-09-task-0-3-shadcn-ui/acceptance.md`

## Open Issues

| ID | Description |
|---|---|
| OI-task03.A | `shadcn` itself is in `dependencies` rather than `devDependencies`. Cosmetic; tree-shaken from production bundles. Move on next maintenance pass if it bothers anyone. |
| OI-task03.B | **Discovered post-task:** pnpm 11 stores approved builds in `pnpm-workspace.yaml` (`allowBuilds: { msw: true, sharp: true, unrs-resolver: true }`), regenerated by `pnpm approve-builds --all`. The `package.json` `pnpm.onlyBuiltDependencies` field had no effect in 11.0.9. Both files are committed; the yaml is the deciding source. `.npmrc` `strict-builds=false` similarly had no effect — kept as defensive. |
| OI-task03.C | `form.tsx` came from the `new-york` style while every other primitive came from `base-nova`. Visual cohesion likely fine (form is mostly behavioral), but worth a side-by-side check during Phase 2 form work. |
| OI-task03.D | shadcn init *occasionally* needs `--force` to fully populate `globals.css` and `utils.ts`. Mention prominently in onboarding. |
| OI-task03.E | Implementation-plan §4 lists `pnpm add zod react-hook-form @hookform/resolvers` as a Phase 0 install step — these are now already installed via shadcn transitives. Delete those lines on the next plan-doc sweep. |

## Spec impact

None.

## Checkpoints

- [x] pnpm build-script gate cleared
- [x] shadcn init completed (with --force second run)
- [x] 10 primitives present in `src/components/ui/`
- [x] `src/lib/utils.ts` exports `cn`
- [x] `src/app/globals.css` has full theme block
- [x] Smoke import + tsc + dev render all pass
- [x] page.tsx reverted, .next/ cleared, final tsc green
- [x] OI-task01-exec.B closed (shadcn works on Tailwind v4 with documented workarounds)
- [x] OI-task03.A–E catalogued
- [x] phase-0-project-setup.md Task 0.3 updated for actual flow
- [x] task-0-3-shadcn-ui.md detail guide created (mirrors Task 0.1 / 0.2 pattern)
- [ ] **NOT done:** git commit — awaiting user authorization
