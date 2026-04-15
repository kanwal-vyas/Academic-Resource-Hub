-- ============================================================
-- Migration: Add ai_summary column to resources table
-- ============================================================

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;
