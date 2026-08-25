-- Clear all auth-related data so sign-up can be retried fresh
DELETE FROM "Session";
DELETE FROM "Account";
DELETE FROM "User";
