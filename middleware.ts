import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/sessions"];

/**
 * Middleware: enforce Better Auth session on protected routes.
 * Uses cookie-based session check (Edge-compatible — no PrismaClient).
 * Public routes (/, /login, /api/auth/*, static assets) pass through freely.
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtected) {
    // Better Auth sets a "better-auth.session_token" cookie on sign-in.
    // Checking for its presence is sufficient for edge middleware — the actual
    // session validity is enforced by auth.api.getSession() in each route handler.
    const sessionCookie =
      request.cookies.get("better-auth.session_token") ??
      request.cookies.get("__Secure-better-auth.session_token");

    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"]
};
