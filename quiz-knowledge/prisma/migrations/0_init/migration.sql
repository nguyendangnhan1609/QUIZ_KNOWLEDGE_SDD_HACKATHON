-- Phase 1 Initial Migration
-- Generated from Prisma schema (6 models)
-- Apply manually in Supabase Studio → SQL Editor

-- Create documents table
CREATE TABLE "public"."documents" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create quizzes table
CREATE TABLE "public"."quizzes" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "documentId" INTEGER NOT NULL,
    "publicToken" TEXT NOT NULL UNIQUE,
    "resultsToken" TEXT NOT NULL UNIQUE,
    "questionCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_documentId_fkey"
        FOREIGN KEY ("documentId")
        REFERENCES "public"."documents"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Create questions table
CREATE TABLE "public"."questions" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "quizId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "questions_quizId_fkey"
        FOREIGN KEY ("quizId")
        REFERENCES "public"."quizzes"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Create options table
CREATE TABLE "public"."options" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "questionId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "options_questionId_fkey"
        FOREIGN KEY ("questionId")
        REFERENCES "public"."questions"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Create attempts table
CREATE TABLE "public"."attempts" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "quizId" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempts_quizId_fkey"
        FOREIGN KEY ("quizId")
        REFERENCES "public"."quizzes"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Create attempt_answers table
CREATE TABLE "public"."attempt_answers" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "attemptId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "selectedOptionId" INTEGER,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "attempt_answers_attemptId_fkey"
        FOREIGN KEY ("attemptId")
        REFERENCES "public"."attempts"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "attempt_answers_questionId_fkey"
        FOREIGN KEY ("questionId")
        REFERENCES "public"."questions"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "attempt_answers_selectedOptionId_fkey"
        FOREIGN KEY ("selectedOptionId")
        REFERENCES "public"."options"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX "quizzes_documentId_idx" ON "public"."quizzes"("documentId");
CREATE INDEX "quizzes_createdAt_idx" ON "public"."quizzes"("createdAt");
CREATE INDEX "questions_quizId_idx" ON "public"."questions"("quizId");
CREATE INDEX "options_questionId_idx" ON "public"."options"("questionId");
CREATE INDEX "attempts_quizId_idx" ON "public"."attempts"("quizId");
CREATE INDEX "attempts_submittedAt_idx" ON "public"."attempts"("submittedAt");
CREATE INDEX "attempt_answers_attemptId_idx" ON "public"."attempt_answers"("attemptId");
CREATE INDEX "attempt_answers_questionId_idx" ON "public"."attempt_answers"("questionId");

-- Create unique constraint on attempts
ALTER TABLE "public"."attempts"
ADD CONSTRAINT "attempts_quizId_identifier_key"
UNIQUE ("quizId", "identifier");
