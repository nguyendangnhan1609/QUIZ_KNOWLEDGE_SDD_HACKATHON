# Claude Project Rules — AI-Driven Knowledge Management & Assessment Platform

## 1. Source of Truth
- Product specification: `docs/product_spec_ai_knowledge_assessment_platform.md` (v1.0, MVP).
- This file is the single source of truth for product scope, functional requirements, and MVP acceptance.
- Do not introduce features, requirements, or behaviors that are not derivable from the spec. Unclear points become Open Issues, not silent assumptions inside deliverables.

## 2. Operating Mode — SDD (Spec-Driven Development)
- Default to Plan Mode for every task. Output a bullet plan first; do not edit files until the user approves.
- Every output that proposes file changes must show **file path** and **content** as a pair.
- Every plan must list: files to read, files to create/update, checkpoints.

## 3. File Placement Policy
- Per-change deliverables → `docs/changes/<YYYY-MM-DD>-<slug>/` (e.g. `plan.md`, `design.md`, `acceptance.md`).
- Living architecture docs → `docs/architecture/`.
- Living standards docs → `docs/standards/`.
- Permanent rules → `.claude/CLAUDE.md` and `.claude/rules/*.md`.
- Do not scatter documentation outside these locations.

## 4. Open Issues Protocol
- Any ambiguity, missing decision, or guess-based content must be tracked as an Open Issue inside the relevant deliverable.
- Format: `OI-<phase>.<letter|NNN> — <short description>`.
- Open Issues block downstream phases that depend on them; surface them explicitly in the next plan.

## 5. Prohibitions
- No destructive commands, suggested or executed: `rm -rf`, `git reset --hard`, force-push, hook bypass (`--no-verify`), `--no-gpg-sign`.
- No implementations outside the approved scope of the current phase.
- No edits to the product spec without an approved Phase prompt that explicitly authorizes spec changes.
- No guess-based specs. If unknown, file an Open Issue.

## 6. Phase Readiness
- Ready: this file, `.claude/rules/00-safety.md`, `docs/architecture/`, and `docs/standards/` exist and have been read.
- Done: deliverables placed under the correct folders, Open Issues catalogued, checkpoints ticked, no scope creep.

## 7. Safety Rules
- See `.claude/rules/00-safety.md`. That file is binding.
