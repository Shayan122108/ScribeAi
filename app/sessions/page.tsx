"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { useRecorderMachine } from "@/hooks/useRecorderMachine";
import { RecordingSource } from "@/types/session";

const SOURCE_LABELS: Record<RecordingSource, string> = {
  MIC: "Microphone",
  TAB: "Browser tab"
};

const STATUS_COLORS: Record<string, string> = {
  IDLE: "bg-white/10 text-white",
  RECORDING: "bg-green-500/20 text-green-300",
  PAUSED: "bg-yellow-500/20 text-yellow-200",
  PROCESSING: "bg-blue-500/20 text-blue-200",
  COMPLETED: "bg-emerald-500/20 text-emerald-200",
  FAILED: "bg-red-500/20 text-red-200"
};

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
    transcript = [],
    summary,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setSource
  } = recorder;
  
  // Derive state booleans from status
  // eslint-disable-next-line no-unused-vars
  const isRecording = status === 'RECORDING';
  // eslint-disable-next-line no-unused-vars
  const isPaused = status === 'PAUSED';
  // eslint-disable-next-line no-unused-vars
  const isProcessing = status === 'PROCESSING';

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
        return (
          <>
            <Button onClick={pauseRecording} variant="ghost">
              Pause
            </Button>
            <Button onClick={stopRecording} variant="danger">
              Stop
            </Button>
          </>
        );
      case "PAUSED":
        return (
          <>
            <Button onClick={resumeRecording}>Resume</Button>
            <Button onClick={stopRecording} variant="danger">
              Stop
            </Button>
          </>
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
          <Button onClick={handleStart}>Start Recording</Button>
        );
    }
  }, [
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
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[400px,1fr]">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
        <header className="mb-6 space-y-2">
          <p className="text-sm uppercase tracking-wide text-white/60">Status</p>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold ${STATUS_COLORS[status]}`}
          >
            <span className="size-2 rounded-full bg-current" />
            {status}
          </div>
        </header>

        <div className="mb-8 space-y-3">
          <p className="text-sm text-white/70">Input source</p>
          <div className="flex gap-2">
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <button
                key={value}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  source === value
                    ? "border-brand bg-brand/20 text-white"
                    : "border-white/10 text-white/70 hover:border-white/30"
                }`}
                disabled={status !== "IDLE"}
                onClick={() => setSource(value as RecordingSource)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">{controls}</div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {summary ? (
          <div className="mt-6 space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <p className="text-xs uppercase tracking-wide text-emerald-200">
              AI Summary
            </p>
            <p>{summary.keyPoints}</p>
            <p className="text-emerald-200">{summary.actionItems}</p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col rounded-2xl border border-white/5 bg-slate-950/60 p-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-white/60">Live transcript</p>
            <p className="text-2xl font-semibold text-white">
              Session {sessionId?.slice(0, 8) ?? "—"}
            </p>
          </div>
          <span className="text-sm text-white/60">
            {transcript?.length || 0} chunks
          </span>
        </header>

        <div className="mt-6 flex-1 space-y-4 overflow-y-auto rounded-xl bg-black/30 p-4">
          {transcript.length === 0 ? (
            <p className="text-sm text-white/50">
              Transcript will appear here once Whisper transcriptions stream in.
            </p>
          ) : (
            transcript.map((chunk) => (
              <article
                key={chunk.sequence}
                className="rounded-lg border border-white/5 bg-white/5 p-3"
              >
                <header className="mb-2 flex items-center justify-between text-xs text-white/60">
                  <span className="font-semibold text-white">{chunk.speakerTag}</span>
                  <span>#{chunk.sequence}</span>
                </header>
                <p className="text-sm leading-relaxed text-white/90">{chunk.text}</p>
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
                  <div
                    key={session.id}
                    className="rounded-xl border border-white/5 bg-white/5 p-4 text-white/80 transition-colors hover:border-white/10 hover:bg-white/8"
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
                  </div>
                );
              });
            })()}
          </div>
        )}
      </section>
    </div>
  );
}
