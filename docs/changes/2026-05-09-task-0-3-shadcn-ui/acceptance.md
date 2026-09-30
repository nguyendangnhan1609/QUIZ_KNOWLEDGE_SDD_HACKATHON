# Acceptance — Task 0.3 (shadcn/ui Setup)

Date: 2026-05-09
Slug: `2026-05-09-task-0-3-shadcn-ui`

## Acceptance criteria

### A — Installation artifacts present

- [x] `quiz-knowledge/components.json` exists (style: `base-nova`, baseColor: `neutral`, cssVariables: `true`).
- [x] `quiz-knowledge/src/lib/utils.ts` exports `cn` (clsx + tailwind-merge).
- [x] `quiz-knowledge/src/components/ui/` contains exactly 10 files: `button.tsx`, `card.tsx`, `dialog.tsx`, `form.tsx`, `input.tsx`, `label.tsx`, `radio-group.tsx`, `skeleton.tsx`, `sonner.tsx`, `table.tsx`.
- [x] `quiz-knowledge/src/app/globals.css` is 128 lines and includes `@theme inline { … }`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, dark variant, theme tokens.

### B — Runtime deps installed

`package.json` `dependencies` now includes:

- [x] `@base-ui/react`
- [x] `@hookform/resolvers`
- [x] `@radix-ui/react-label`
- [x] `@radix-ui/react-slot`
- [x] `class-variance-authority`
- [x] `clsx`
- [x] `lucide-react`
- [x] `next-themes`
- [x] `react-hook-form`
- [x] `shadcn` (CLI helper; runtime in `dependencies` is acceptable)
- [x] `sonner`
- [x] `tailwind-merge`
- [x] `tw-animate-css`
- [x] `zod`

### C — Validation passed

- [x] `Button` import from `@/components/ui/button` type-checks.
- [x] `node node_modules/typescript/bin/tsc --noEmit` exits 0 with the smoke import in place.
- [x] `pnpm dev` boots; `localhost:3000` returns 200 and includes both "Smoke" and "scaffold ready" in the rendered HTML.
- [x] After reverting page.tsx + clearing `.next/`, final `tsc --noEmit` exits 0.

### D — Phase doc reconciled

- [x] `docs/architecture/phases/phase-0-project-setup.md` Task 0.3 reflects the actual flow:
  - Pre-flight `pnpm approve-builds --all` step.
  - `--base-color` flag dropped.
  - Form-via-URL note for `new-york/form.json`.
  - Acceptance includes the deps that came in transitively.
- [x] `docs/architecture/phases/task-0-3-shadcn-ui.md` detail guide created with §0 outcome / §1 pre-flight / §2 init / §3 add primitives / §4 validation / §5 pitfalls / §6 decisions / §7 DoD.

### E — pnpm 11 friction documented

- [x] Pitfall list in detail guide (§5) captures: IGNORED_BUILDS gate, init bail behavior, `--force` recovery, form-not-in-base-nova, shadcn-as-runtime-dep.

### F — OI accounting

- [x] OI-task01-exec.B closed (shadcn works on Tailwind v4 with documented workarounds).
- [x] OI-task03.A through OI-task03.E catalogued in plan.md.

### G — SDD compliance

- [x] Living doc placed under `docs/architecture/phases/`.
- [x] Per-change deliverables under `docs/changes/2026-05-09-task-0-3-shadcn-ui/`.
- [x] No spec edits.
- [x] No destructive operations beyond cache cleanup.
- [x] No commits without authorization (pending).

## Items deliberately not done

- No commit — pending user "xác nhận".
- No move of `shadcn` to `devDependencies` (cosmetic).
- No theme customization (defer to Phase 7).
- No removal of unused transitive deps (zod / react-hook-form will be used in Phases 2 / 3 / 5).

## Done

All technical criteria checked. Ready for git commit + push pending user authorization, then proceed to **Task 0.4 — Setup Prisma ORM**.
