-- Migration: Add bio column to users table
-- Run this manually if column doesn't exist

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Example: psql -d jdu_cowork -f migrations/add_bio_column.sql
