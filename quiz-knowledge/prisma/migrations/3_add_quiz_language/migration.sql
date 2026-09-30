-- Phase 10 Migration: Add language to quizzes
-- Stores the output language chosen at generation time (vi | en | ja).
-- Apply manually in Supabase Studio → SQL Editor if prisma migrate is unavailable.

ALTER TABLE "public"."quizzes"
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'vi';
