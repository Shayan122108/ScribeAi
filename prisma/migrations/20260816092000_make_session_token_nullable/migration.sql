-- Make Session.token nullable (this version of Better Auth does not populate it on session create)
ALTER TABLE "Session" ALTER COLUMN "token" DROP NOT NULL;
