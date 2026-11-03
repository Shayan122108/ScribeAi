"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { useRecorderMachine } from "@/hooks/useRecorderMachine";
import { RecordingSource } from "@/types/session";
import { SoundBars } from "@/components/ui/SoundBars";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  IDLE: "bg-white/10 text-white",
  RECORDING: "bg-green-500/20 text-green-300",  
  PAUSED: "bg-yellow-500/20 text-yellow-200",
  PROCESSING: "bg-blue-500/20 text-blue-200",
  COMPLETED: "bg-emerald-500/20 text-emerald-200",
  FAILED: "bg-red-500/20 text-red-200"
};
const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
const HERO_TEXT = "text-3xl font-light uppercase tracking-[0.35em] text-white md:text-5xl [text-shadow:0_0_24px_rgba(255,255,255,0.35)]";
type SessionHistory = {
  id: string;
  status: string;
  source: string;
  startedAt: string;
  endedAt?: string;
  summary?: {
    keyPoints: string;
    actionItems: string;
    decisions: string;
  };
  transcript?: Array<{
    text: string;
    sequence: number;
  }>;
};

/** Highlight all case-insensitive occurrences of `term` in `text`. */
function highlightMatch(text: string, term: string) {
  if (!term.trim()) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    new RegExp(`^${escaped}$`, "i").test(part) ? (
      <mark
        key={i}
        className="rounded bg-yellow-400/30 px-0.5 text-yellow-200 not-italic"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function SessionsPage() {
  const { data: sessionData, isPending: authLoading } = authClient.useSession();
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // ─── Search state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SessionHistory[] | null>(null);

  const user = sessionData?.user ?? { id: "", email: "" };

  const recorder = useRecorderMachine({
    user: { id: user.id, email: user.email }
  });
  
  const {
    status,
    source,
    sessionId,
    stream,
    transcript = [],
    summary,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,

  } = recorder;
  
  // Derive state booleans from status
  // eslint-disable-next-line no-unused-vars
  const isRecording = status === 'RECORDING';
  // eslint-disable-next-line no-unused-vars
  const isPaused = status === 'PAUSED';
  // eslint-disable-next-line no-unused-vars
  const isProcessing = status === 'PROCESSING';
  const heroActive = status !== "IDLE";
    const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
  }, [sessionId]);

  useEffect(() => {
        if (status === "IDLE") {
          setElapsed(0);
          return;
        }
        if (status !== "RECORDING") return;
        const id = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => clearInterval(id);
      }, [status]);
      const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript.length]);

  useEffect(() => {
    if (authLoading || !sessionData) return;

    // Fetch session history using session credentials
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/sessions");
        const data = await response.json();
        if (data.sessions) {
          setHistory(data.sessions);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch sessions:", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [status, authLoading, sessionData]); // Refetch when status or auth state changes

  // ─── Search handler ─────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      // Empty query → go back to showing the full history list
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const encoded = encodeURIComponent(query.trim());
      const res = await fetch(`/api/sessions/search?q=${encoded}`);
      const data = await res.json();
      setSearchResults(data.sessions ?? []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // useMemo must be called before any early returns (Rules of Hooks)
  const controls = useMemo(() => {
    const handleStart = async () => {
      startRecording(source as RecordingSource);
    };

    switch (status) {
      case "RECORDING":
      case "PAUSED":
        return (
          <div className="flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <Button
              onClick={status === "PAUSED" ? resumeRecording : pauseRecording}
              variant="ghost"
            >
              {status === "PAUSED" ? "Resume" : "Pause"}
            </Button>
            <span className="h-6 w-px bg-white/10" />
            <span className="font-mono text-lg tabular-nums text-white">
              {formatTime(elapsed)}
            </span>
            <span className="h-6 w-px bg-white/10" />
            <Button onClick={stopRecording} variant="danger">
              Stop
            </Button>
          </div>
        );
      case "PROCESSING":
        return (
          <Button disabled variant="ghost">
            Processing…
          </Button>
        );
      case "COMPLETED":
      case "FAILED":
        return (
          <>
            <Button onClick={handleStart}>Start New</Button>
          </>
        );
      case "IDLE":
      default:
        return (
          <Button onClick={handleStart} size = "lg">Start Recording</Button>
        );
    }
  }, [
    elapsed,
    pauseRecording,
    resumeRecording,
    source,
    startRecording,
    status,
    stopRecording
  ]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-white/50">Loading session...</p>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-red-400">Not authenticated</p>
      </div>
    );
  }

  const formatDuration = (startedAt: string, endedAt?: string) => {
    if (!endedAt) return "In progress";
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    return `${minutes}m`;
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      <section className="flex flex-col items-center gap-8 py-8 text-center">
        <div className="relative flex min-h-[16rem] w-full items-center justify-center overflow-x-clip">
          <div
            className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out ${
              heroActive ? "scale-[1.1]" : "scale-[0.55]"
            }`}
          >
            <div className={status === "RECORDING" ? "orb-listening" : ""}>
              <div className="orb orb-liquid" />
            </div>
          </div>
            <SoundBars stream={stream} active={status === "RECORDING"} />
          <h1
            className={`relative z-10 grid grid-cols-1 gap-y-2 transition-all duration-500 ease-in md:grid-cols-2 md:gap-x-24 ${
              heroActive ? "scale-[4] opacity-0 blur-md" : ""
            }`}
          >
            <span className={`${HERO_TEXT} md:-mr-[0.35em] md:text-right`}>
              Meeting
            </span>
            <span className={`${HERO_TEXT} md:text-left`}>Companion</span>
          </h1>
        </div>

        {status === "IDLE" ? (
            <p className="text-lg text-white/70">Listen. Transcribe. Summarize.</p>
          ) : status === "RECORDING" || status === "PAUSED" ? (
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">
              {status === "RECORDING" ? "Listening" : "Paused"}
            </p>
          ) : (
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold ${STATUS_COLORS[status]}`}
            >
              <span className="size-2 rounded-full bg-current" />
              {status}
            </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {controls}
        </div>

        {error ? (
          <p className="w-full max-w-xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {summary ? (
          <div className="w-full max-w-xl space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left text-sm text-emerald-100">
            <p className="text-xs uppercase tracking-wide text-emerald-200">
              AI Summary
            </p>
            <p>{summary.keyPoints}</p>
            <p className="text-emerald-200">{summary.actionItems}</p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col rounded-2xl border border-white/10 bg-black p-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
              Live transcript
            </p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-white">
              Session {sessionId?.slice(0, 8) ?? "—"}
              {status === "RECORDING" && (
                <span className="size-2 animate-pulse rounded-full bg-brand" />
              )}
            </p>
          </div>
          <span className="text-sm tabular-nums text-white/40">
            {transcript?.length || 0} chunks
          </span>
        </header>

        <div
          ref={transcriptRef}
          className="mt-6 max-h-80 flex-1 overflow-y-auto"
        >
          {transcript.length === 0 ? (
            <p className="text-sm text-white/30">
              Transcript will appear here once Whisper transcriptions stream in.
            </p>
          ) : (
            transcript.map((chunk) => (
              <article
                key={chunk.sequence}
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
      <section className="mx-auto mt-8 max-w-6xl rounded-2xl border border-white/5 bg-black/40 p-6 md:col-span-2">
        <header className="mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-white/60">History</p>
              <h2 className="text-2xl font-semibold text-white">
                {searchQuery ? "Search results" : "Recent sessions"}
              </h2>
            </div>
            {searchQuery && (
              <p className="text-sm text-white/40">
                {isSearching
                  ? "Searching…"
                  : `${searchResults?.length ?? 0} result${searchResults?.length === 1 ? "" : "s"} for "${searchQuery}"`}
              </p>
            )}
          </div>

          {/* ── Search bar ── */}
          <SearchInput
            isSearching={isSearching}
            onSearch={handleSearch}
            placeholder="Search transcripts & summaries…"
            value={searchQuery}
          />
        </header>

        {historyLoading ? (
          // Initial history load skeleton
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/5"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Determine which list to show */}
            {(() => {
              const displayList = searchResults !== null ? searchResults : history;
              const isEmptySearch = searchQuery && searchResults?.length === 0 && !isSearching;

              if (isEmptySearch) {
                return (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <svg
                      aria-hidden="true"
                      className="text-white/20"
                      fill="none"
                      height="32"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      width="32"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" x2="16.65" y1="21" y2="16.65" />
                    </svg>
                    <p className="text-sm text-white/50">
                      No sessions matched &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-xs text-white/30">
                      Try different keywords or clear the search to see all sessions.
                    </p>
                  </div>
                );
              }

              if (displayList.length === 0) {
                return (
                  <p className="text-sm text-white/50">
                    No sessions yet. Start recording to create one!
                  </p>
                );
              }

              return displayList.map((session) => {
                // Pick a snippet: prefer summary keyPoints, fall back to first transcript chunk
                const rawSnippet =
                  session.summary?.keyPoints ??
                  session.transcript?.[0]?.text ??
                  "No transcript yet";
                const snippet = rawSnippet.slice(0, 120);

                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="block rounded-xl border border-white/5 bg-white/5 p-4 text-white/80 transition-colors hover:border-white/10 hover:bg-white/8"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">
                          Session {session.id.slice(0, 8)}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-white/60">
                          {highlightMatch(snippet, searchQuery)}
                          {rawSnippet.length > 120 ? "…" : ""}
                        </p>
                      </div>
                      <div className="text-right text-sm text-white/60">
                        <p>{formatDuration(session.startedAt, session.endedAt)}</p>
                        <p className={`${STATUS_COLORS[session.status]}`}>
                          {session.status}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              });
            })()}
          </div>
        )}
      </section>
    </div>
  );
}
