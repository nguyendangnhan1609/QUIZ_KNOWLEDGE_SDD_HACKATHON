# Task 0.2 — Configure TailwindCSS (Setup Guide)

Status: v1.0
Last Updated: 2026-05-09
Parent: [`phase-0-project-setup.md`](./phase-0-project-setup.md) — Task 0.2
Stack: TailwindCSS **v4** (no config file) · `@tailwindcss/postcss` · auto-discovery

This task is **mostly verification**. Tailwind v4 needs no manual configuration when scaffolded by `create-next-app@latest`. Read this once to confirm what's already in place and to lock in the styling conventions for the rest of the project.

---

## 0. Why Task 0.2 is short on Tailwind v4

| Tailwind v3 (what older guides assume) | Tailwind v4 (what we actually have) |
|---|---|
| `tailwind.config.ts` with `content: [...]` glob | **No config file**; content auto-discovered from imports |
| `@tailwind base; @tailwind components; @tailwind utilities;` in `globals.css` | Single `@import "tailwindcss";` line |
| `tailwind init` step needed | Pre-wired by `create-next-app` |
| Add `tailwindcss-animate` plugin manually | Plugins via `@plugin "..."` in CSS |
| Theme via `theme.extend.colors.{...}` | Theme via `@theme { --color-foo: …; }` in CSS |

The scaffolded state is already correct. This task verifies it and adds nothing.

---

## 1. What's already in place (verify, don't change)

### 1.1 PostCSS plugin

`quiz-knowledge/postcss.config.mjs`:

```js
const config = {
  plugins: ["@tailwindcss/postcss"],
};
export default config;
```

That single plugin is everything. No autoprefixer needed (bundled).

### 1.2 Tailwind import

`quiz-knowledge/src/app/globals.css`:

```css
@import "tailwindcss";
```

That single line is the v4 equivalent of the three v3 directives. **Do not** add `@tailwind base/components/utilities` underneath — it's redundant in v4 and may emit warnings.

### 1.3 No `tailwind.config.ts`

Verify the file does **not** exist:

```powershell
Test-Path quiz-knowledge/tailwind.config.ts   # → False
```

Bash:

```bash
test -e quiz-knowledge/tailwind.config.ts && echo "FOUND (unexpected)" || echo "absent (expected)"
```

If the file exists for any reason, delete it. v4 doesn't read it; keeping it just creates noise.

### 1.4 Layout imports `globals.css`

`quiz-knowledge/src/app/layout.tsx` line 3 should already have:

```tsx
import "./globals.css";
```

This import is what triggers Tailwind's content scan. **Do not remove it.**

---

## 2. Styling Strategy (locked decisions)

These rules apply for the rest of the project. They're enforced by code review (and AI coding assistants reading this doc).

| Rule | Why |
|---|---|
| **Tailwind utilities only** | Single source of styling truth. Easy to grep, no merge conflicts in CSS files. |
| **No CSS modules.** | We don't need them; Tailwind covers the surface area. |
| **No inline `style={...}`** except for dynamic numeric values (e.g., the analytics bar's `width: ${rate * 100}%`). | Inline styles bypass Tailwind's purge / discovery and can't be themed via tokens. |
| **`globals.css` is for the `@import` + theme tokens only.** | Component styles belong in components. |
| **Component-local class composition via `cn()`** from `@/lib/utils` (added by shadcn in Task 0.3). | Standard shadcn pattern; merges utilities cleanly with Tailwind variants. |
| **Theme tokens via `@theme { --color-foo: …; }` blocks in `globals.css`** (when needed). | v4 way. shadcn will populate this in Task 0.3; don't add tokens here pre-emptively. |

---

## 3. Validation Steps

Run all three. Each is a one-liner.

### 3.1 globals.css contains exactly the import

```powershell
Get-Content quiz-knowledge/src/app/globals.css
```

**Expected output:**

```
@import "tailwindcss";
```

(Plus a trailing newline. Nothing else — assuming the Task 0.1 §4 cleanup was done.)

If you see `@tailwind base;` etc., this is v3 syntax leaked in. Replace the file content with the single `@import` line.

### 3.2 No `tailwind.config.ts` exists

```powershell
Test-Path quiz-knowledge/tailwind.config.ts
```

**Expected:** `False`.

### 3.3 Tailwind classes render

This re-confirms Task 0.1 §5.2. If you've already done it post-cleanup, skip.

Edit `quiz-knowledge/src/app/page.tsx` temporarily:

```tsx
<h1 className="text-2xl font-semibold bg-blue-500 text-white p-4 rounded">
  Quiz Knowledge — scaffold ready
</h1>
```

Boot `pnpm dev`, open `http://localhost:3000`. The heading renders blue with white text and rounded corners.

Revert the test classes:

```tsx
<h1 className="text-2xl font-semibold">Quiz Knowledge — scaffold ready</h1>
```

---

## 4. Editor Setup (optional but recommended)

### 4.1 VS Code IntelliSense

Install the **Tailwind CSS IntelliSense** extension. v0.12 or newer is required for v4 support — earlier versions don't recognize v4 syntax.

After install, hovering a Tailwind class shows the underlying CSS rule. Class autocomplete works in TS/TSX strings.

### 4.2 Optional: Prettier Tailwind class sorter

```bash
pnpm add -D prettier-plugin-tailwindcss
```

Then create `.prettierrc` (if not yet) at `quiz-knowledge/`:

```json
{ "plugins": ["prettier-plugin-tailwindcss"] }
```

This keeps Tailwind class lists in canonical order (`flex items-center gap-2` before `bg-blue-500`, etc.). Reduces diff noise.

This step is part of Task 0.8; defer if you want.

---

## 5. When (and How) to Add Theme Tokens

### Default path: don't touch theme until Task 0.3

shadcn writes its own theme variables in Task 0.3. They live in `globals.css` inside an `@theme` block (v4) plus `:root` CSS variables. Adding tokens before shadcn runs creates rebase risk.

### If you really must add a token before Task 0.3

Append to `globals.css` after the `@import`:

```css
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.65 0.18 252);
}
```

Then `bg-brand` and `text-brand` Tailwind classes work. But: shadcn may overwrite this when it runs. Re-add after Task 0.3.

---

## 6. Common Pitfalls

| Symptom | Fix |
|---|---|
| "tailwindcss is not a function" / build error | You probably installed Tailwind v3 alongside v4. `pnpm why tailwindcss` to inspect; remove the v3 dep. |
| Custom class `bg-foo-500` doesn't render | The `foo` palette doesn't exist. Add via `@theme { --color-foo-500: …; }` or pick an existing palette. |
| Class works in dev but missing in production build | Rare in v4 thanks to auto-discovery, but possible if you build class names from variables (`` `bg-${color}-500` ``). Build the full class name as a literal string instead. |
| IntelliSense doesn't autocomplete | Install / update **Tailwind CSS IntelliSense** to v0.12+. Restart VS Code. |
| Need to migrate a v3 codebase here | Read the Tailwind v4 upgrade guide. For our greenfield project this isn't relevant. |

---

## 7. Definition of Done

Task 0.2 is complete when **all** of the following are true:

- [ ] `quiz-knowledge/postcss.config.mjs` lists `@tailwindcss/postcss`.
- [ ] `quiz-knowledge/src/app/globals.css` contains exactly `@import "tailwindcss";` (and nothing else for now).
- [ ] No `tailwind.config.ts` exists.
- [ ] `quiz-knowledge/src/app/layout.tsx` imports `./globals.css`.
- [ ] §3.3 Tailwind class smoke test passed (or already passed in Task 0.1 §5.2 post-cleanup).
- [ ] Team agrees on the styling rules in §2 and won't add CSS modules / inline styles ad-hoc.
- [ ] (Optional) VS Code IntelliSense extension installed.

When all checked, proceed to **Task 0.3 — Setup shadcn/ui**.
