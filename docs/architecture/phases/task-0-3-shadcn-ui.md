# Task 0.3 — Setup shadcn/ui (Setup Guide)

Status: v1.0
Last Updated: 2026-05-09
Parent: [`phase-0-project-setup.md`](./phase-0-project-setup.md) — Task 0.3
Stack: shadcn 4.7.0 · Tailwind v4 · Base UI / Radix primitives · pnpm 11 · Next.js 16

This task installs shadcn/ui and adds **all 10 primitives needed by Phases 2–7 in one block**, so we don't context-switch later.

---

## 0. What you'll end up with

| Artifact | Purpose |
|---|---|
| `components.json` | shadcn config (style, paths, Tailwind hookup) |
| `src/lib/utils.ts` | `cn()` helper merging `clsx` + `tailwind-merge` |
| `src/components/ui/{button, card, input, table, dialog, form, label, radio-group, skeleton, sonner}.tsx` | 10 primitive components |
| `src/app/globals.css` | Theme tokens + `@theme inline` block (rewritten by shadcn init) |
| Runtime deps added | `@base-ui/react`, `@radix-ui/react-slot`, `@radix-ui/react-label`, `class-variance-authority`, `clsx`, `lucide-react`, `tailwind-merge`, `tw-animate-css`, `next-themes`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `zod` (yes, zod comes along — saves a later step) |

---

## 1. Pre-flight: clear pnpm 11 build-script gate

shadcn's init invokes `pnpm add` internally. pnpm 11 refuses to complete an install while native build scripts are unapproved (sharp, unrs-resolver — and msw arrives via shadcn's transitives). If the gate isn't open, the init bails after writing `components.json` but **before** writing `src/lib/utils.ts` and the theme block.

Open the gate first. From `quiz-knowledge/`:

```powershell
pnpm approve-builds --all
```

Bash:

```bash
pnpm approve-builds --all
```

Expected output: `sharp install: Done`, `unrs-resolver postinstall: Done`, `msw postinstall: Done`. Exit code 0.

> **Why not `pnpm.onlyBuiltDependencies` in `package.json`?** It's the canonical config field, but in pnpm 11.0.9 it's not honored consistently across `dlx`-spawned subshells. `pnpm approve-builds --all` is the deterministic workaround.

---

## 2. Initialize shadcn

```powershell
pnpm dlx shadcn@latest init --yes --defaults
```

Bash:

```bash
pnpm dlx shadcn@latest init --yes --defaults
```

> **Don't pass `--base-color`** — flag does not exist in shadcn 4.x. Defaults pick a neutral palette automatically.

Expected files written / modified:

```
quiz-knowledge/
├── components.json                ← new
├── src/lib/utils.ts               ← new (cn helper)
└── src/app/globals.css            ← rewritten (theme + @theme block, ~128 lines)
```

`components.json` will set:
- `style: "base-nova"` (the v4 default; new since shadcn 4.7).
- `tailwind.css: "src/app/globals.css"`.
- `baseColor: "neutral"`, `cssVariables: true`.
- Aliases: `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`.

If `init` is interrupted mid-flow (you'll see "Project initialization completed" missing from the output), re-run with `--force`:

```powershell
pnpm dlx shadcn@latest init --yes --defaults --force
```

`--force` does **not** wipe existing primitives; it only ensures `globals.css`, `utils.ts`, and `components.json` are fully written.

---

## 3. Add the 10 primitives in one batch

```powershell
pnpm dlx shadcn@latest add button card input table dialog label radio-group skeleton sonner --yes
```

Bash:

```bash
pnpm dlx shadcn@latest add button card input table dialog label radio-group skeleton sonner --yes
```

Expected: 9 files created in `src/components/ui/`.

> **Why 9, not 10?** The shadcn `form` component is **not present** in the default `base-nova` style as of shadcn 4.7.0. It must be added separately from the `new-york` style.

### 3.1 Add the `form` component separately

```powershell
pnpm dlx shadcn@latest add https://ui.shadcn.com/r/styles/new-york/form.json --yes
```

Bash (same command — works in any shell).

This creates `src/components/ui/form.tsx`. It will skip `button.tsx` and `label.tsx` (already present from §3) — that's expected.

### 3.2 Verify

```powershell
Get-ChildItem src/components/ui/ | Measure-Object | Select-Object -ExpandProperty Count
```

Bash:

```bash
ls src/components/ui/ | wc -l
```

Expected: **10**.

---

## 4. Validation Steps

### 4.1 Imports type-check

Edit `src/app/page.tsx` temporarily:

```tsx
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 gap-4">
      <h1 className="text-2xl font-semibold">Quiz Knowledge — scaffold ready</h1>
      <Button variant="default">Smoke</Button>
    </main>
  );
}
```

Run:

```powershell
node node_modules/typescript/bin/tsc --noEmit
```

Expected: exit code **0**.

### 4.2 Button renders styled

Boot dev briefly:

```powershell
pnpm dev
```

Open `http://localhost:3000`. The "Smoke" button must render with shadcn styling (rounded, primary color, subtle hover). If it renders unstyled (looks like a default browser `<button>`), the theme tokens are missing — re-run `pnpm dlx shadcn@latest init --yes --defaults --force`.

### 4.3 globals.css contains theme tokens

```powershell
(Get-Content src/app/globals.css | Measure-Object -Line).Lines
```

Bash:

```bash
wc -l src/app/globals.css
```

Expected: ~120 lines (one-line `@import "tailwindcss";` would be only 1 line; the full themed file is ~128).

### 4.4 Revert smoke and clean cache

```tsx
// src/app/page.tsx — final state
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">Quiz Knowledge — scaffold ready</h1>
    </main>
  );
}
```

```powershell
Remove-Item -Recurse -Force .next
node node_modules/typescript/bin/tsc --noEmit  # → 0
```

---

## 5. Common Pitfalls

| Symptom | Fix |
|---|---|
| `init` exits with `[ERR_PNPM_IGNORED_BUILDS]` and writes only `components.json` | Run `pnpm approve-builds --all` first, then `init --force`. |
| `add form` returns "Checking registry" then exits silently | The `base-nova` style does not include `form`. Use the explicit URL: `pnpm dlx shadcn@latest add https://ui.shadcn.com/r/styles/new-york/form.json --yes`. |
| Components render unstyled | `globals.css` was not rewritten. Run `init --force`. |
| `Cannot find module '@/lib/utils'` | `src/lib/utils.ts` missing. Either let `init --force` create it, or write manually with `clsx + tailwind-merge` `cn()`. |
| `shadcn` listed in `dependencies` (not `devDependencies`) | Acceptable — shadcn 4.x ships its CLI as a runtime helper. Move to `devDependencies` if it bothers you, but the bundle isn't shipped to clients (it's tree-shaken). |
| New transitive deps (zod, react-hook-form, @hookform/resolvers) appear unexpectedly | Expected — `form` pulls them in. Saves later install steps. |

---

## 6. Decisions captured for future tasks

- **Form component lives in `new-york` style.** When Phase 2/3/etc. need `<Form>`, import from `@/components/ui/form` — the file already exists.
- **`shadcn` package stays in `dependencies`.** Moving to `devDependencies` is cosmetic; bundle size is unaffected.
- **`zod`, `react-hook-form`, `@hookform/resolvers` already installed.** Implementation-plan §4 lists these as "to install in later phases" — they're already in `package.json`. Skip those install lines when implementing forms.
- **`.npmrc` with `strict-builds=false`** is in the repo root for `quiz-knowledge/` but had no effect in pnpm 11.0.9 against this issue. Leaving it as defensive; can remove once pnpm honors it.
- **Theme palette**: `base-color: neutral` (shadcn default). If we want a brand color, add `@theme { --color-primary: …; }` after `@import "shadcn/tailwind.css"` in `globals.css`. Defer to Phase 7 unless someone insists.

---

## 7. Definition of Done

Task 0.3 is complete when **all** of the following are true:

- [ ] `components.json` exists at `quiz-knowledge/`.
- [ ] `src/lib/utils.ts` exports `cn`.
- [ ] `src/components/ui/` contains exactly 10 files: `button`, `card`, `dialog`, `form`, `input`, `label`, `radio-group`, `skeleton`, `sonner`, `table` (all `.tsx`).
- [ ] `src/app/globals.css` is ≥ 100 lines and contains a `@theme inline { … }` block.
- [ ] `import { Button } from '@/components/ui/button'` type-checks.
- [ ] Button renders styled in the browser at `localhost:3000`.
- [ ] `node node_modules/typescript/bin/tsc --noEmit` exits 0.
- [ ] `package.json` includes `@base-ui/react`, `class-variance-authority`, `clsx`, `lucide-react`, `tailwind-merge`, `tw-animate-css`, `sonner`, `next-themes`, `react-hook-form`, `@hookform/resolvers`, `zod` (and the Radix primitives transitively).
- [ ] `src/app/page.tsx` reverted to clean state (no `<Button>` smoke import).
- [ ] `.next/` cache cleared.

When all checked, proceed to **Task 0.4 — Setup Prisma ORM**.
