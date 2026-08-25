-- Rename the old recording Session table to RecordingSession
ALTER TABLE "Session" RENAME TO "RecordingSession";

-- Rename associated constraints/indexes on RecordingSession
ALTER TABLE "RecordingSession" RENAME CONSTRAINT "Session_pkey" TO "RecordingSession_pkey";
ALTER TABLE "RecordingSession" RENAME CONSTRAINT "Session_userId_fkey" TO "RecordingSession_userId_fkey";

-- Fix TranscriptChunk FK: now points to RecordingSession
ALTER TABLE "TranscriptChunk" DROP CONSTRAINT "TranscriptChunk_sessionId_fkey";
ALTER TABLE "TranscriptChunk" ADD CONSTRAINT "TranscriptChunk_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "RecordingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fix Summary FK: now points to RecordingSession
ALTER TABLE "Summary" DROP CONSTRAINT "Summary_sessionId_fkey";
ALTER TABLE "Summary" ADD CONSTRAINT "Summary_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "RecordingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Better Auth Session table (token-based auth sessions)
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Account table for Better Auth credential/OAuth storage
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add missing columns to User (emailVerified was added in prior migration, image may be missing)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;
