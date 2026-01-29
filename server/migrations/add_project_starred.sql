-- ============================================================
-- Migration: Add is_starred column to projects table
-- ============================================================
-- Enables pinning/starring projects to appear at top of list
-- ============================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;

-- Create index for faster sorting by starred status
CREATE INDEX IF NOT EXISTS idx_projects_is_starred ON projects(is_starred);
