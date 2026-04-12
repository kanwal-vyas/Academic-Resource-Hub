-- ============================================================
-- Migration: Add verification columns to resources table
-- Run this ONCE in Supabase SQL Editor (or your DB client)
-- ============================================================

-- 1. Add is_verified flag (existing data defaults to TRUE so nothing breaks)
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Add audit columns
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 3. Mark all EXISTING resources as verified (they were created before this system)
UPDATE resources SET is_verified = TRUE WHERE is_verified IS NULL;

-- Done. New student uploads will be inserted with is_verified = FALSE via the backend.
-- Admin/faculty uploads will be inserted with is_verified = TRUE.
