-- ============================================================
-- Migration: Add is_archived column to projects table
-- ============================================================
-- This enables the Archive workflow: Active -> Archived -> Deleted
-- ============================================================

-- Add the is_archived column (defaults to false for all existing projects)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create an index for faster queries on archived status
CREATE INDEX IF NOT EXISTS idx_projects_is_archived ON projects(is_archived);

-- Verify the change
-- SELECT column_name, data_type, column_default FROM information_schema.columns 
-- WHERE table_name = 'projects' AND column_name = 'is_archived';
