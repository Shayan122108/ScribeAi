-- Drop old separate expiry columns and add the single expiresAt field Better Auth uses
ALTER TABLE "Account" DROP COLUMN IF EXISTS "accessTokenExpiresAt";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "refreshTokenExpiresAt";
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
