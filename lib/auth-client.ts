import { createAuthClient } from "better-auth/react";

/**
 * Better Auth browser client — use this in client components for
 * sign-in, sign-up, sign-out, and reading the current session.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
});
