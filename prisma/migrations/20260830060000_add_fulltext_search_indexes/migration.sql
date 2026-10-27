-- Migration: add GIN (Generalized Inverted Index) indexes for full-text search
-- These allow PostgreSQL to use tsvector-based searching efficiently on large datasets.

-- 1. GIN index on TranscriptChunk.text
--    Converts the text column to a tsvector on the fly during index build.
CREATE INDEX IF NOT EXISTS "transcript_chunk_text_fts_idx"
  ON "TranscriptChunk"
  USING GIN (to_tsvector('english', "text"));

-- 2. GIN index on Summary — combined index over all three content columns.
--    Concatenating them lets a single index cover searches across all three fields.
CREATE INDEX IF NOT EXISTS "summary_content_fts_idx"
  ON "Summary"
  USING GIN (
    to_tsvector(
      'english',
      COALESCE("keyPoints", '') || ' ' ||
      COALESCE("actionItems", '') || ' ' ||
      COALESCE("decisions", '')
    )
  );
