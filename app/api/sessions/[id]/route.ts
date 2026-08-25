import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/sessions/[id]
 * Fetch a specific recording session with full transcript.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const record = await prisma.recordingSession.findUnique({
      where: { id: params.id },
      include: {
        summary: true,
        transcript: {
          orderBy: { sequence: "asc" }
        },
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    if (!record) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Ensure the requesting user owns this session
    if (record.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ session: record });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]
 * Delete a recording session and all associated data.
 * Requires authentication and ownership of the session.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership before deleting
    const record = await prisma.recordingSession.findUnique({
      where: { id: params.id },
      select: { userId: true }
    });

    if (!record) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (record.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.recordingSession.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
