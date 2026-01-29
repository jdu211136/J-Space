-- ============================================================
-- TRILINGUAL EVOLUTION v2.0 - Phase 1 Migration
-- ============================================================
-- This migration:
-- 1. Converts separate title_*/desc_* columns to JSONB (LocalizedContent)
-- 2. Creates time_logs table for time tracking
-- 3. Creates comments table with JSONB content
-- ============================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- STEP 1: Add new JSONB columns to PROJECTS
-- ============================================================
DO $$ 
BEGIN
    -- Add name (JSONB) column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'name') THEN
        ALTER TABLE projects ADD COLUMN name JSONB;
    END IF;
    
    -- Add description (JSONB) column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'description') THEN
        ALTER TABLE projects ADD COLUMN description JSONB;
    END IF;
END $$;

-- Migrate existing data from separate columns to JSONB
UPDATE projects 
SET name = jsonb_build_object(
    'en', COALESCE(title_en, ''),
    'uz', COALESCE(title_uz, ''),
    'ja', COALESCE(title_jp, ''),
    'translation_locked', false
)
WHERE name IS NULL;

-- Migrate description - handle case where desc_* columns may not exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'projects' AND column_name = 'desc_en') THEN
        UPDATE projects 
        SET description = jsonb_build_object(
            'en', COALESCE(desc_en, ''),
            'uz', COALESCE(desc_uz, ''),
            'ja', COALESCE(desc_jp, ''),
            'translation_locked', false
        )
        WHERE description IS NULL;
    ELSE
        UPDATE projects 
        SET description = jsonb_build_object(
            'en', '',
            'uz', '',
            'ja', '',
            'translation_locked', false
        )
        WHERE description IS NULL;
    END IF;
END $$;

-- Set NOT NULL constraint after data migration
-- ALTER TABLE projects ALTER COLUMN name SET NOT NULL;

-- ============================================================
-- STEP 2: Add new JSONB columns to TASKS
-- ============================================================
DO $$ 
BEGIN
    -- Add title (JSONB) column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'title') THEN
        ALTER TABLE tasks ADD COLUMN title JSONB;
    END IF;
    
    -- Add description (JSONB) column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'description') THEN
        ALTER TABLE tasks ADD COLUMN description JSONB;
    END IF;
END $$;

-- Migrate existing data from separate columns to JSONB
UPDATE tasks 
SET title = jsonb_build_object(
    'en', COALESCE(title_en, ''),
    'uz', COALESCE(title_uz, ''),
    'ja', COALESCE(title_jp, ''),
    'translation_locked', false
)
WHERE title IS NULL;

-- Migrate description - handle case where desc_* columns may not exist
DO $$
BEGIN
    -- Check if desc_en column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tasks' AND column_name = 'desc_en') THEN
        -- Update using legacy desc_* columns
        UPDATE tasks 
        SET description = jsonb_build_object(
            'en', COALESCE(desc_en, ''),
            'uz', COALESCE(desc_uz, ''),
            'ja', COALESCE(desc_jp, ''),
            'translation_locked', false
        )
        WHERE description IS NULL;
    ELSE
        -- No legacy columns, just set empty JSONB
        UPDATE tasks 
        SET description = jsonb_build_object(
            'en', '',
            'uz', '',
            'ja', '',
            'translation_locked', false
        )
        WHERE description IS NULL;
    END IF;
END $$;

-- ============================================================
-- STEP 3: Create COMMENTS table with JSONB content
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- ============================================================
-- STEP 4: Create TIME_LOGS table for time tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_time_logs_user ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_task ON time_logs(task_id);

-- Constraint: Only one active timer per user (end_time IS NULL)
-- This is enforced at the application level, but we can add a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_logs_active_user 
ON time_logs(user_id) 
WHERE end_time IS NULL;

-- ============================================================
-- STEP 5: Create NOTIFICATIONS table
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('invite', 'assignment', 'comment', 'mention')),
    reference_id UUID, -- Can reference project_members.id, tasks.id, comments.id
    reference_type VARCHAR(50), -- 'project_member', 'task', 'comment'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================================
-- SUCCESS: Migration Complete
-- ============================================================
-- Note: The old title_*, desc_* columns are preserved for backward compatibility.
-- They can be dropped in a future migration once all code is updated.
