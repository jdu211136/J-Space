-- Insert Dummy Users
INSERT INTO users (full_name, email, password_hash, avatar_url)
VALUES 
    ('Alice Designer', 'alice@test.com', '$2b$10$EpI3iM0f.Lq.eK.x7.u.X.g.u.r.p.a.s.s.w.o.r.d', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'),
    ('Bob Developer', 'bob@test.com', '$2b$10$EpI3iM0f.Lq.eK.x7.u.X.g.u.r.p.a.s.s.w.o.r.d', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob')
ON CONFLICT (email) DO NOTHING;

-- Auto-Join All Projects
INSERT INTO project_members (project_id, user_id, role, joined_at)
SELECT p.id, u.id, 'member', CURRENT_TIMESTAMP
FROM projects p, users u
WHERE u.email IN ('alice@test.com', 'bob@test.com')
ON CONFLICT (project_id, user_id) DO NOTHING;
