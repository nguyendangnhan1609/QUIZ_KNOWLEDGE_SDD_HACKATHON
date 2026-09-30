# Plan — Apply Review Decisions to Product Spec

Date: 2026-05-09
Slug: `2026-05-09-spec-review-updates`
Driver: `docs/product_spec_ai_knowledge_assessment_platform_review.md`
Target: `docs/product_spec_ai_knowledge_assessment_platform.md`

## Goal

Incorporate every review decision recorded in the review document into the official product specification, while leaving items explicitly deferred to "phiên bản sau" untouched.

## Inputs

- Source spec (v1.0): `docs/product_spec_ai_knowledge_assessment_platform.md`
- Review with decisions (2026-05-09): `docs/product_spec_ai_knowledge_assessment_platform_review.md`
- Project SDD rules: `.claude/CLAUDE.md`, `.claude/rules/00-safety.md`

## Decision → Spec change mapping

| # | Review item | Decision | Spec change | Section(s) touched |
|---|---|---|---|---|
| F1 | Public dashboard security | Không cần bảo mật link | None (already aligned) | — |
| F2 | Participant identity / attempt | Mã NV-style identifier; trùng → append `_yyyyMMddHHmmss` | A | 6.2, 7.2, 8.5 |
| F3 | Random subset fairness | Random chỉ để chống copy, không cần fair | None (already aligned) | — |
| F4 | AI quality control | Không edit; muốn đổi → regenerate | E (manager validation note) | 6.1 |
| F5 | Output schema metadata | ID tăng dần + `createdAt` cho auto-cleanup | B | 8.3, 10 |
| F6 | Document scope | AI đọc được; v1 không giới hạn | D | 12 |
| F7 | Job lifecycle | Defer | None | — |
| F8 | Retention/deletion | Defer (chỉ giữ `createdAt` hook cho tương lai — đã trong B) | None beyond B | — |
| F9 | Quantitative DoD | Defer | None | — |
| F10 | Encoding flow block | "Sửa lại" | F (verify only — file is already valid UTF-8) | 7.1–7.3 |
| OQ1 | Dashboard share | Ai có link đều xem được | E (access model) | 8.7, 12 |
| OQ2 | Retake | Có; hậu tố thời gian | (gộp vào A) | 8.5 |
| OQ3 | "Standard document" | Tự chọn ngưỡng phù hợp | C | 9 |
| OQ4 | Preview AI output | Không preview riêng; review qua quiz link | E (manager validation note) | 6.1 |
| OQ5 | Participant name format | Full name hoặc short name (vd `nd_thanh`) | (gộp vào A) | 6.2, 8.5 |

## Concrete edits applied

### Change A — Participant identity (F2 + OQ2 + OQ5)

- §6.2 Participant capabilities: replace "Enter participant name" with "Enter participant identifier (full name or short name in employee-code style, e.g., `nd_thanh`)".
- §7.2 Participant Flow: rename "Enter participant name" → "Enter participant identifier".
- §8.5 Quiz Participation requirements:
  - Require an identifier (full name or short name).
  - Identifier must be unique per quiz; duplicates trigger automatic `_yyyyMMddHHmmss` suffix.
  - Retakes are allowed; each retake is recorded as an independent attempt after the suffix is applied.
  - Removed: "Prevent duplicate submissions within same browser session (optional MVP enhancement)" — superseded by the rule above.

### Change B — Quiz / question bank metadata (F5)

- §8.3 Quiz Creation requirements: add
  - Assign incremental, monotonically increasing ID to each quiz / question bank.
  - Record `createdAt` timestamp for each quiz / question bank to support future automatic cleanup.
- §10 AI Output Schema: replaced flat single-question example with a wrapped question-bank example carrying `quizId`, `createdAt`, and a `questions` array where each item has `questionId`. Added a notes block explaining ID semantics and the purpose of `createdAt`.

### Change C — "Standard document" definition (OQ3)

- §9 Performance: define standard document as a text-based document ≤ ~50 pages (≈ 50,000 characters). Larger documents are explicitly out of MVP performance scope.

### Change D — Document scope (F6)

- §12 Technical Assumptions: add clarifying bullet that supported documents are those the AI can read directly (text-based PDF, DOCX, Markdown), no hard page / character / token limits in this version; finer constraints will be specified later.

### Change E — Manager validation flow + dashboard share model (F4 + OQ1 + OQ4)

- §6.1 Knowledge Manager capabilities: add bullet — manager validates quiz quality by opening the public quiz link; if AI output is unsatisfactory, regenerate a new bank (no in-place editing UI in MVP).
- §8.7 Analytics Dashboard: add an "Access Model" subsection stating the dashboard link is public and shareable by design; no authentication in MVP.
- §12 Technical Assumptions: extend the existing "Public links are sufficient for access control" bullet with explicit "shareable by design" wording for the dashboard link.

### Change F — Encoding (F10)

- Verified bytes via `od -c`: arrows in §7.1 / §7.2 are encoded as `0xE2 0x86 0x92` (correct UTF-8 for `→`).
- File reports as UTF-8 via `file(1)`.
- Conclusion: source file is already correctly encoded; no source change needed. The mojibake observed by the reviewer is most likely a viewer-side decoding issue (e.g., a tool reading UTF-8 as Shift-JIS).

### Header bump

- Version: 1.0 → 1.1.
- Last Updated: 2026-05-08 → 2026-05-09.

## Out of scope (deferred per review decisions)

- F7 Job lifecycle / processing states / retry / idempotency.
- F8 Retention & deletion policy beyond capturing `createdAt`.
- F9 Quantitative DoD / acceptance thresholds.

These items remain intentionally absent from the spec for v1.1. They should be picked up in a future phase prompt.

## Open Issues (for follow-up phases)

- **OI-spec.A** — "Standard document" threshold. Decided as ~50 pages / ~50,000 characters per OQ3 ("tự chỉ định con số phù hợp"). Confirm or revise once early generation runs reveal the actual sweet spot.
- **OI-spec.B** — `createdAt` granularity. Current spec records it at quiz / question-bank level, which is sufficient for cleanup. Per-question `createdAt` was not added and can be revisited if traceability of regeneration becomes a requirement.
- **OI-spec.C** — Identifier conflict edge case. Suffix is `_yyyyMMddHHmmss` (1-second resolution). Two retakes by the same identifier within the same second would still collide. Acceptable for MVP scale; flag for revisit if collision is observed.

## Files

- Updated: `docs/product_spec_ai_knowledge_assessment_platform.md`
- Created: `docs/changes/2026-05-09-spec-review-updates/plan.md` (this file)
- Created: `docs/changes/2026-05-09-spec-review-updates/acceptance.md`

## Checkpoints

- [x] User approved plan
- [x] Encoding verified
- [x] Changes A–F applied
- [x] Header version + date bumped
- [x] plan.md written
- [x] acceptance.md written
- [x] Open Issues catalogued
