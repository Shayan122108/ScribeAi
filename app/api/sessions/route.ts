import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/sessions
 * Fetch all recording sessions for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await prisma.recordingSession.findMany({
      where: { userId: session.user.id },
      include: {
        summary: true,
        transcript: {
          orderBy: { sequence: "asc" },
          take: 5 // Preview chunks only
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
