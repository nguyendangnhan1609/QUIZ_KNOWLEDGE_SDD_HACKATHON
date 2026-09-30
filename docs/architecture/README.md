# Architecture — Living Documents

This folder holds shared architecture documents that evolve over time. Per-change deliverables do **not** live here — they live in `docs/changes/<YYYY-MM-DD>-<slug>/`.

## Index
- _empty — populated in subsequent SDD phases_

## Conventions
- One topic per file. Filename in `snake_case.md`.
- Each document opens with: Status, Owner (TBD if unassigned), Last Updated, References to spec sections.
- Architectural decisions that need a record use ADR format: `adr-<NNNN>-<slug>.md`.
- Diagrams: prefer Mermaid in-document; binary assets under `docs/architecture/assets/`.

## Open Issues
- **OI-Arch.001** — Tech stack (frontend framework, backend runtime, datastore, LLM provider, hosting) is not specified in the product spec. Awaiting user decision before authoring `system_overview.md` and `tech_stack.md`.
