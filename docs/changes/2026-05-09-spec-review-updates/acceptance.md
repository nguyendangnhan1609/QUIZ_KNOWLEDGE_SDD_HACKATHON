# Acceptance — Apply Review Decisions to Product Spec

Date: 2026-05-09
Slug: `2026-05-09-spec-review-updates`
Spec under change: `docs/product_spec_ai_knowledge_assessment_platform.md` → v1.1

## Acceptance criteria

The change is accepted when **all** of the following are true.

### A — Participant identity (F2 + OQ2 + OQ5)

- [x] §6.2 lists "Enter participant identifier (full name or short name in employee-code style, e.g., `nd_thanh`)".
- [x] §7.2 flow shows "Enter participant identifier" (not "name").
- [x] §8.5 specifies:
  - Identifier required before submission.
  - Identifier must be unique per quiz; duplicates auto-append `_yyyyMMddHHmmss`.
  - Retakes allowed; each retake stored as an independent record after suffix.
- [x] The earlier "Prevent duplicate submissions within same browser session (optional MVP enhancement)" line is removed.

### B — Quiz / question bank metadata (F5)

- [x] §8.3 requires assigning an incremental ID to each quiz / question bank.
- [x] §8.3 requires recording `createdAt` for each quiz / question bank.
- [x] §10 example JSON is wrapped at quiz-bank level and includes `quizId`, `createdAt`, and a `questions` array where each item has `questionId`.
- [x] §10 includes a notes block clarifying ID semantics and `createdAt` purpose.

### C — "Standard document" definition (OQ3)

- [x] §9 defines "standard document" as text-based, ≤ ~50 pages (≈ 50,000 characters).
- [x] §9 explicitly notes that larger documents are out of MVP performance scope.

### D — Document scope (F6)

- [x] §12 includes a bullet stating that supported documents are those the AI can read directly (text-based PDF / DOCX / Markdown), and that no hard page / character / token limits are enforced in this version.

### E — Manager validation + dashboard share (F4 + OQ1 + OQ4)

- [x] §6.1 includes a capability bullet about validating via the quiz link and regenerating if unsatisfactory (no in-place editing in MVP).
- [x] §8.7 has an "Access Model" subsection stating the dashboard link is shareable by design with no authentication in MVP.
- [x] §12 mentions the dashboard link is shareable by design.

### F — Encoding (F10)

- [x] File is verified as UTF-8 with arrows encoded as `0xE2 0x86 0x92` (`→`).
- [x] No mojibake present in §7.1 / §7.2 / §7.3.
- [x] Source file unchanged for this finding. Reviewer's observation is logged as a viewer-side rendering artifact, not a source defect.

### Header & versioning

- [x] Version bumped 1.0 → 1.1.
- [x] Last Updated bumped 2026-05-08 → 2026-05-09.

## Items deliberately not changed

These were called out in the review with the decision "sẽ được triển khai trong các phiên bản sau" or "không cần". They are intentionally absent from v1.1.

- F1 — Public dashboard security: explicit decision to not add access control.
- F3 — Random subset fairness: random is for anti-copy, not fairness.
- F4 (edit interface) — Manager edits via regenerate only; no edit UI.
- F7 — Job lifecycle / processing states.
- F8 — Retention & deletion policy.
- F9 — Quantitative DoD / acceptance thresholds.

## Verification commands (used)

- `file <spec>` → reported `Unicode text, UTF-8 text`.
- `od -c` on lines 126–135 of the original spec → arrow bytes are `342 206 222`, the canonical UTF-8 for `→` (U+2192).

## Open Issues forwarded

- OI-spec.A — "Standard document" threshold (50 pages / 50,000 chars) is provisional.
- OI-spec.B — `createdAt` is currently per-quiz only; per-question may be needed later.
- OI-spec.C — Suffix resolution is 1 second; two retakes within the same second by the same identifier would still collide.

## Done

All acceptance criteria above are checked. v1.1 spec is ready for downstream phases.
