"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-white/10 text-white",
  RECORDING: "bg-green-500/20 text-green-300",
  PAUSED: "bg-yellow-500/20 text-yellow-200",
  PROCESSING: "bg-blue-500/20 text-blue-200",
  COMPLETED: "bg-emerald-500/20 text-emerald-200",
  FAILED: "bg-red-500/20 text-red-200"
};

type SessionDetail = {
  id: string;
  status: string;
  source: string;
  startedAt: string;
  endedAt?: string | null;
  summary?: {
    keyPoints: string;
    actionItems: string;
    decisions: string;
  } | null;
  transcript: Array<{
    id: string;
    sequence: number;
    speakerTag: string;
    text: string;
  }>;
};

const formatDuration = (startedAt: string, endedAt?: string | null) => {
  if (!endedAt) return "In progress";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return `${Math.floor(ms / 60000)}m`;
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        if (res.status === 401) {
          setError("Please log in to view this session.");
          return;
        }
        if (res.status === 404) {
          setError("Session not found.");
          return;
        }
        if (!res.ok) {
          setError("Failed to load session.");
          return;
        }
        const data = await res.json();
        setSession(data.session);
      } catch {
        setError("Failed to load session.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <Link
        href="/sessions"
        className="text-sm text-white/60 transition-colors hover:text-white"
      >
        ← Back to sessions
      </Link>

      {loading ? (
        <p className="text-sm text-white/50">Loading session…</p>
      ) : error || !session ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error ?? "Session not found."}
        </p>
      ) : (
        <>
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                Past session
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white">
                Session {session.id.slice(0, 8)}
              </h1>
              <p className="mt-1 text-sm text-white/50">
                {new Date(session.startedAt).toLocaleString()} ·{" "}
                {formatDuration(session.startedAt, session.endedAt)}
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-1 text-xs font-semibold ${
                STATUS_COLORS[session.status] ?? "bg-white/10 text-white"
              }`}
            >
              {session.status}
            </span>
          </header>

          <section className="rounded-2xl border border-white/10 bg-black p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
              AI Summary
            </p>
            {session.summary ? (
              <div className="mt-4 space-y-5">
                {[
                  ["Key points", session.summary.keyPoints],
                  ["Action items", session.summary.actionItems],
                  ["Decisions", session.summary.decisions]
                ].map(([label, body]) => (
                  <div key={label}>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                      {body || "None"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/40">
                No summary was generated for this session.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-black p-6">
            <header className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                Transcript
              </p>
              <span className="text-sm tabular-nums text-white/40">
                {session.transcript.length} chunks
              </span>
            </header>
            <div className="mt-4">
              {session.transcript.length === 0 ? (
                <p className="text-sm text-white/30">
                  No transcript was saved for this session.
                </p>
              ) : (
                session.transcript.map((chunk) => (
                  <article
                    key={chunk.id}
                    className="border-b border-white/5 py-3 last:border-0"
                  >
                    <header className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wider text-brand">
                        {chunk.speakerTag}
                      </span>
                      <span className="text-white/30">#{chunk.sequence}</span>
                    </header>
                    <p className="text-sm leading-relaxed text-white/90">
                      {chunk.text}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}