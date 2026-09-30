-- Phase 4 Migration: Add Quiz Sessions and Submissions
-- Tables for public quiz delivery with server-side randomization

-- Create quiz_sessions table
CREATE TABLE "public"."quiz_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" INTEGER NOT NULL,
    "sessionToken" TEXT NOT NULL UNIQUE,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_sessions_quizId_fkey"
        FOREIGN KEY ("quizId")
        REFERENCES "public"."quizzes"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Create quiz_submissions table
CREATE TABLE "public"."quiz_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_submissions_sessionId_fkey"
        FOREIGN KEY ("sessionId")
        REFERENCES "public"."quiz_sessions"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX "quiz_sessions_quizId_idx" ON "public"."quiz_sessions"("quizId");
CREATE INDEX "quiz_sessions_expiresAt_idx" ON "public"."quiz_sessions"("expiresAt");
CREATE INDEX "quiz_submissions_sessionId_idx" ON "public"."quiz_submissions"("sessionId");
