import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/sessions/search?q=<term>
 *
 * Full-text search across:
 *  - TranscriptChunk.text
 *  - Summary.keyPoints, Summary.actionItems, Summary.decisions
 *
 * Returns up to 20 sessions that match the query, ordered by recency.
 * The response shape mirrors GET /api/sessions so the UI can share the same renderer.
 */
export async function GET(request: NextRequest) {
  try {
    const authSession = await auth.api.getSession({
      headers: request.headers
    });

    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = (searchParams.get("q") ?? "").trim();

    // No query → return the standard recent sessions list (same as /api/sessions)
    if (!rawQuery) {
      const sessions = await prisma.recordingSession.findMany({
        where: { userId: authSession.user.id },
        include: {
          summary: true,
          transcript: { orderBy: { sequence: "asc" }, take: 5 }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      });
      return NextResponse.json({ sessions, total: sessions.length, query: "" });
    }

    // Build a Postgres tsquery-safe search term.
    // Split on whitespace, strip non-alphanumeric chars, join with <-> (phrase) or & (AND).
    const terms = rawQuery
      .split(/\s+/)
      .map((t) => t.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(Boolean);

    if (terms.length === 0) {
      return NextResponse.json({ sessions: [], total: 0, query: rawQuery });
    }

    // Use "term1 & term2 & ..." AND logic so multi-word queries narrow results
    const tsQuery = terms.join(" & ");

    // ─── Step 1: Find sessions whose Summary matches the query ─────────────────
    const summaryMatches = await prisma.summary.findMany({
      where: {
        session: { userId: authSession.user.id },
        OR: [
          { keyPoints: { search: tsQuery } },
          { actionItems: { search: tsQuery } },
          { decisions: { search: tsQuery } }
        ]
      },
      select: { sessionId: true }
    });

    // ─── Step 2: Find sessions whose TranscriptChunks match the query ──────────
    const transcriptMatches = await prisma.transcriptChunk.findMany({
      where: {
        session: { userId: authSession.user.id },
        text: { search: tsQuery }
      },
      select: { sessionId: true },
      distinct: ["sessionId"]
    });

    // ─── Merge unique session IDs from both sources ───────────────────────────
    const sessionIdSet = new Set<string>([
      ...summaryMatches.map((m) => m.sessionId),
      ...transcriptMatches.map((m) => m.sessionId)
    ]);

    if (sessionIdSet.size === 0) {
      return NextResponse.json({ sessions: [], total: 0, query: rawQuery });
    }

    // ─── Fetch the full session records for matched IDs ───────────────────────
    const sessions = await prisma.recordingSession.findMany({
      where: {
        id: { in: Array.from(sessionIdSet) },
        userId: authSession.user.id // belt-and-suspenders ownership check
      },
      include: {
        summary: true,
        transcript: {
          orderBy: { sequence: "asc" },
          take: 5 // Preview only — same as the history list
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return NextResponse.json({
      sessions,
      total: sessions.length,
      query: rawQuery
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error searching sessions:", error);
    return NextResponse.json(
      { error: "Failed to search sessions" },
      { status: 500 }
    );
  }
}
