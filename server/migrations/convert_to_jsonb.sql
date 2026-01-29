-- ============================================================
-- Migration: Convert TEXT columns to JSONB for Multilingual Support
-- ============================================================
-- WARNING: Run this migration ONLY ONCE. Make a backup first!
-- This script safely migrates existing data to JSONB format.
-- ============================================================

-- Start transaction for safety
BEGIN;

-- ============================================================
-- STEP 1: PROJECTS TABLE - Convert name and description
-- ============================================================

-- Check if projects.name is not already JSONB, then convert
DO $$
BEGIN
    -- Check if 'name' column exists and is TEXT type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'name' 
        AND data_type = 'text'
    ) THEN
        -- Add temporary JSONB column
        ALTER TABLE projects ADD COLUMN name_jsonb JSONB;
        
        -- Migrate data: copy existing text to all language keys
        UPDATE projects SET name_jsonb = jsonb_build_object(
            'en', COALESCE(name, ''),
            'uz', COALESCE(name, ''),
            'ja', COALESCE(name, ''),
            'translation_locked', false
        );
        
        -- Drop old column and rename new one
        ALTER TABLE projects DROP COLUMN name;
        ALTER TABLE projects RENAME COLUMN name_jsonb TO name;
        
        RAISE NOTICE 'projects.name converted to JSONB';
    ELSE
        RAISE NOTICE 'projects.name is already JSONB or does not exist as TEXT';
    END IF;
END $$;

-- Same for description
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'description' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE projects ADD COLUMN description_jsonb JSONB;
        
        UPDATE projects SET description_jsonb = jsonb_build_object(
            'en', COALESCE(description, ''),
            'uz', COALESCE(description, ''),
            'ja', COALESCE(description, ''),
            'translation_locked', false
        );
        
        ALTER TABLE projects DROP COLUMN description;
        ALTER TABLE projects RENAME COLUMN description_jsonb TO description;
        
        RAISE NOTICE 'projects.description converted to JSONB';
    ELSE
        RAISE NOTICE 'projects.description is already JSONB or does not exist as TEXT';
    END IF;
END $$;

-- ============================================================
-- STEP 2: TASKS TABLE - Convert title and description
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'title' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE tasks ADD COLUMN title_jsonb JSONB;
        
        UPDATE tasks SET title_jsonb = jsonb_build_object(
            'en', COALESCE(title, ''),
            'uz', COALESCE(title, ''),
            'ja', COALESCE(title, ''),
            'translation_locked', false
        );
        
        ALTER TABLE tasks DROP COLUMN title;
        ALTER TABLE tasks RENAME COLUMN title_jsonb TO title;
        
        RAISE NOTICE 'tasks.title converted to JSONB';
    ELSE
        RAISE NOTICE 'tasks.title is already JSONB or does not exist as TEXT';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'description' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE tasks ADD COLUMN description_jsonb JSONB;
        
        UPDATE tasks SET description_jsonb = jsonb_build_object(
            'en', COALESCE(description, ''),
            'uz', COALESCE(description, ''),
            'ja', COALESCE(description, ''),
            'translation_locked', false
        );
        
        ALTER TABLE tasks DROP COLUMN description;
        ALTER TABLE tasks RENAME COLUMN description_jsonb TO description;
        
        RAISE NOTICE 'tasks.description converted to JSONB';
    ELSE
        RAISE NOTICE 'tasks.description is already JSONB or does not exist as TEXT';
    END IF;
END $$;

-- ============================================================
-- STEP 3: Add default values for new rows
-- ============================================================

-- Set default JSONB structure for new projects
ALTER TABLE projects 
    ALTER COLUMN name SET DEFAULT '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb,
    ALTER COLUMN description SET DEFAULT '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb;

-- Set default JSONB structure for new tasks
ALTER TABLE tasks 
    ALTER COLUMN title SET DEFAULT '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb,
    ALTER COLUMN description SET DEFAULT '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb;

COMMIT;

-- ============================================================
-- Verification: Check the new structure
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name IN ('projects', 'tasks') 
-- AND column_name IN ('name', 'title', 'description');
