-- ============================================================
-- Migration: Create task_collaborators table
-- ============================================================
-- Stores co-workers/collaborators for tasks (many-to-many)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_collaborators (
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_task_collaborators_task ON task_collaborators(task_id);
CREATE INDEX IF NOT EXISTS idx_task_collaborators_user ON task_collaborators(user_id);
