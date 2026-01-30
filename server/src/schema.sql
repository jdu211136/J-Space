-- ============================================================
-- JDU Cowork - Trilingual Evolution v2.0 Schema
-- ============================================================
-- Database-First Design with JSONB Multilingual Support
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'reviewed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'mid', 'high');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE member_status AS ENUM ('pending', 'active', 'declined');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    preferred_lang VARCHAR(10) DEFAULT 'en' CHECK (preferred_lang IN ('uz', 'ja', 'en')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROJECTS TABLE (with JSONB LocalizedContent)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    -- Multilingual JSONB fields
    name JSONB DEFAULT '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb,
    description JSONB DEFAULT '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb,
    -- Legacy columns (for backward compatibility during migration)
    title_uz VARCHAR(255),
    title_jp VARCHAR(255),
    title_en VARCHAR(255),
    desc_uz TEXT,
    desc_jp TEXT,
    desc_en TEXT,
    -- Other fields
    category VARCHAR(100),
    color_code VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_starred BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROJECT MEMBERS TABLE (Invitations & Roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role member_role DEFAULT 'member',
    status member_status DEFAULT 'pending',
    invited_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMPTZ,
    UNIQUE(project_id, user_id)
);

-- ============================================================
-- TASKS TABLE (with JSONB LocalizedContent)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    -- Multilingual JSONB fields
    title JSONB DEFAULT '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb,
    description JSONB DEFAULT '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb,
    -- Legacy columns (for backward compatibility during migration)
    title_uz VARCHAR(255),
    title_jp VARCHAR(255),
    title_en VARCHAR(255),
    desc_uz TEXT,
    desc_en TEXT,
    desc_jp TEXT,
    -- Date fields
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    deadline TIMESTAMPTZ,
    -- Status & Priority
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'mid',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    CONSTRAINT valid_date_range CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

-- ============================================================
-- TASK COLLABORATORS TABLE (Many-to-Many)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, user_id)
);

-- ============================================================
-- COMMENTS TABLE (with JSONB LocalizedContent)
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TIME LOGS TABLE (Timer/Time Tracking)
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

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('invite', 'assignment', 'comment', 'mention')),
    reference_id UUID,
    reference_type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_status ON project_members(status);
CREATE INDEX IF NOT EXISTS idx_task_collaborators_task ON task_collaborators(task_id);
CREATE INDEX IF NOT EXISTS idx_task_collaborators_user ON task_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_task ON time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Constraint: Only one active timer per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_logs_active_user 
ON time_logs(user_id) 
WHERE end_time IS NULL;

-- ============================================================
-- MIGRATION: Populate JSONB from legacy columns
-- ============================================================
DO $$
BEGIN
    -- Migrate projects.name from legacy columns
    UPDATE projects 
    SET name = jsonb_build_object(
        'en', COALESCE(title_en, ''),
        'uz', COALESCE(title_uz, ''),
        'ja', COALESCE(title_jp, ''),
        'translation_locked', false
    )
    WHERE name IS NULL OR name = '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb;

    -- Migrate projects.description from legacy columns
    UPDATE projects 
    SET description = jsonb_build_object(
        'en', COALESCE(desc_en, ''),
        'uz', COALESCE(desc_uz, ''),
        'ja', COALESCE(desc_jp, ''),
        'translation_locked', false
    )
    WHERE description IS NULL OR description = '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb;

    -- Migrate tasks.title from legacy columns
    UPDATE tasks 
    SET title = jsonb_build_object(
        'en', COALESCE(title_en, ''),
        'uz', COALESCE(title_uz, ''),
        'ja', COALESCE(title_jp, ''),
        'translation_locked', false
    )
    WHERE title IS NULL OR title = '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb;

    -- Migrate tasks.description from legacy columns
    UPDATE tasks 
    SET description = jsonb_build_object(
        'en', COALESCE(desc_en, ''),
        'uz', COALESCE(desc_uz, ''),
        'ja', COALESCE(desc_jp, ''),
        'translation_locked', false
    )
    WHERE description IS NULL OR description = '{"en": "", "uz": "", "ja": "", "translation_locked": false}'::jsonb;
END $$;