"use client";

import React, { useEffect, useRef, useState } from "react";

interface SearchInputProps {
  /** Whether a search is in progress */
  isSearching?: boolean;
  /** Called with the new value after the debounce delay */
  // eslint-disable-next-line no-unused-vars
  onSearch: (_query: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Current search query value */
  value: string;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
}

/**
 * Styled full-text search input with:
 * - Debounced onChange so the parent only fires a network request after the user
 *   stops typing (not on every keystroke).
 * - An animated search icon on the left.
 * - A clear (×) button that appears when there is a value.
 * - A spinner on the right when `isSearching` is true.
 */
export function SearchInput({
  isSearching = false,
  onSearch,
  placeholder = "Search sessions…",
  value,
  debounceMs = 300
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync when parent resets the value (e.g. clear from outside)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(next);
    }, debounceMs);
  };

  const handleClear = () => {
    setLocalValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch("");
  };

  // Flush immediately on Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch(localValue);
    }
    if (e.key === "Escape") {
      handleClear();
    }
  };

  return (
    <div className="relative flex items-center">
      {/* Search icon */}
      <span className="pointer-events-none absolute left-3 text-white/40">
        <svg
          aria-hidden="true"
          fill="none"
          height="16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" x2="16.65" y1="21" y2="16.65" />
        </svg>
      </span>

      <input
        aria-label="Search sessions"
        autoComplete="off"
        className={[
          "w-full rounded-xl border bg-white/5 py-2 pl-9 pr-10",
          "text-sm text-white placeholder:text-white/30",
          "transition-all duration-200",
          "outline-none",
          "focus:border-brand/60 focus:bg-white/8 focus:ring-2 focus:ring-brand/20",
          localValue
            ? "border-white/20"
            : "border-white/10 hover:border-white/20"
        ].join(" ")}
        id="session-search"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        type="search"
        value={localValue}
      />

      {/* Right-side adornment: spinner while searching, clear button when there is a value */}
      <span className="absolute right-3 flex items-center">
        {isSearching ? (
          <svg
            aria-label="Searching…"
            className="animate-spin text-brand/70"
            fill="none"
            height="14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
            width="14"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : localValue ? (
          <button
            aria-label="Clear search"
            className="text-white/40 transition-colors hover:text-white/80"
            onClick={handleClear}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="14"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              width="14"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        ) : null}
      </span>
    </div>
  );
}
