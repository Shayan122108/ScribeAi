import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/sessions"];

/**
 * Middleware: enforce Better Auth session on protected routes.
 * Public routes (/, /login, /api/auth/*, static assets) pass through freely.
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtected) {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"]
};
