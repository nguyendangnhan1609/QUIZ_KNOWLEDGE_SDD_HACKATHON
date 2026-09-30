-- Phase 9 Migration: Add sourceDocumentIds to quizzes
-- Stores the full list of source document IDs used to generate a quiz.
-- documentId remains as the primary FK (backward compat); this column tracks all sources.
-- Apply manually in Supabase Studio → SQL Editor if prisma migrate is unavailable.

ALTER TABLE "public"."quizzes"
  ADD COLUMN "sourceDocumentIds" INTEGER[] NOT NULL DEFAULT '{}';
