# Plan — Task 0.7 (Tạo Cấu Trúc Thư Mục)

Ngày: 2026-05-10
Slug: `2026-05-10-task-0-7-folder-structure`

## Mục tiêu

Materialized thư mục layout từ technical-design.md §14 sao cho Phase 1-7 code drops có nơi làm việc.

## Quyết định

Tạo 10 thư mục chính dưới `src/lib/` + `src/components/` + `src/types/` + `prisma/` với `.gitkeep` để git track empty dirs.

## Thực thi

1. PowerShell: Tạo 11 thư mục (ai, parsers, randomization, services, db/repositories, schemas, storage, components/shared, types, prisma/migrations).
2. Mỗi thư mục có `.gitkeep`.
3. Git status kiểm tra: 10 files added.
4. Commit.

## Acceptance

- [x] 10 thư mục exist dưới tree structure
- [x] Mỗi thư mục có `.gitkeep`
- [x] Git status không show untracked (all staged + committed)
- [x] Folder tree matches technical-design.md §14
