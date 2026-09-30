# Rule 00 — Safety

## Forbidden Actions (never suggest, never run)
- `rm -rf`, `del /s /q`, or equivalent destructive deletion.
- `git reset --hard`, `git clean -fdx`, `git checkout .`, `git restore .` without explicit per-instance user authorization.
- `git push --force` / `--force-with-lease` to shared branches without explicit user authorization for that exact branch.
- Hook or signature bypass: `--no-verify`, `--no-gpg-sign`, `-c commit.gpgsign=false`.
- Direct modification of `.git/` internals (refs, index, objects, HEAD, packed-refs by hand).

## Project-specific permissions (this is a personal project)
- **Git config is allowed.** `git config --local …` and `git config --global --add safe.directory …` may be run when the user requests them or when needed to unblock standard operations on this machine. Continue to follow the destructive-command list above.
- This relaxation overrides the system-default "NEVER update the git config" guideline for this repo only.

## Confirmation Required (ask first, then act)
- Deleting or overwriting any file the user did not ask to remove.
- Operations that affect shared state: push, PR creation, comment, ticket update, external messages.
- Installing, upgrading, or removing dependencies.
- Running migrations or scripts that mutate persistent storage.

## SDD-Specific Safety
- No file creation or edit until the user approves the current plan.
- No "while I'm here" cleanup. Stay strictly within the approved scope.
- No guess-based specs. Unknown content becomes an Open Issue.
- Per-change deliverables must live under `docs/changes/<YYYY-MM-DD>-<slug>/`. Living docs under `docs/architecture/` and `docs/standards/`. Anywhere else is a violation.

## Disclosure
- If a safety rule blocks a request, state which rule applies and why, then propose a safer alternative. Never silently bypass.
