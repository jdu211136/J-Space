import { Request, Response } from 'express';
import pool from '../db';
import { projectSchema } from '../utils/validation';

import { TranslationService } from '../services/TranslationService';

export const createProject = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const result = projectSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ errors: result.error.issues });
        }

        const { titleUz, titleJp, titleEn, descUz, descJp, descEn, category, colorCode, isPublic } = result.data;
        const { members } = req.body; // Array of user IDs to add as members
        // @ts-ignore
        const ownerId = req.user?.id;
        const userLang = TranslationService.getUserLanguage(req);

        // Prepare JSONB objects
        const sourceTitle = titleEn || titleUz || titleJp || 'New Project';
        const sourceDesc = descEn || descUz || descJp || '';

        let nameJson: any = { en: titleEn || sourceTitle, uz: titleUz || sourceTitle, ja: titleJp || sourceTitle };
        let descJson: any = { en: descEn || sourceDesc, uz: descUz || sourceDesc, ja: descJp || sourceDesc };

        try {
            // Auto-translate if fields are missing
            if (sourceTitle) {
                const translatedTitle = await TranslationService.translate(sourceTitle, userLang).catch(() => null);
                if (translatedTitle) {
                    if (!titleEn) nameJson.en = translatedTitle.en;
                    if (!titleUz) nameJson.uz = translatedTitle.uz;
                    if (!titleJp) nameJson.ja = translatedTitle.ja;
                }
            }
            if (sourceDesc) {
                const translatedDesc = await TranslationService.translate(sourceDesc, userLang).catch(() => null);
                if (translatedDesc) {
                    if (!descEn) descJson.en = translatedDesc.en;
                    if (!descUz) descJson.uz = translatedDesc.uz;
                    if (!descJp) descJson.ja = translatedDesc.ja;
                }
            }
        } catch (err) {
            console.error('Project translation failed:', err);
        }

        await client.query('BEGIN');

        const newProject = await client.query(
            `INSERT INTO projects 
      (owner_id, title_uz, title_jp, title_en, desc_uz, desc_jp, desc_en, category, color_code, is_public, name, description) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
            [
                ownerId,
                nameJson.uz, nameJson.ja, nameJson.en,
                descJson.uz, descJson.ja, descJson.en,
                category || 'General', colorCode, isPublic || false,
                JSON.stringify(nameJson), JSON.stringify(descJson)
            ]
        );

        const project = newProject.rows[0];

        // Add owner as admin
        await client.query(
            'INSERT INTO project_members (project_id, user_id, role, joined_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
            [project.id, ownerId, 'admin']
        );

        // Add additional members if provided
        if (Array.isArray(members) && members.length > 0) {
            for (const memberId of members) {
                // Skip if member is the owner (already added)
                if (memberId === ownerId) continue;

                await client.query(
                    'INSERT INTO project_members (project_id, user_id, role, joined_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (project_id, user_id) DO NOTHING',
                    [project.id, memberId, 'member']
                );
            }
        }

        await client.query('COMMIT');

        res.status(201).json({ project, message: 'Project created successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};

export const getProjects = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;

        // Rich query with task stats and team avatars
        // Note: Using only t.deadline (t.end_date doesn't exist in the schema)
        const result = await pool.query(
            `SELECT 
                p.*, 
                COALESCE(NULLIF(p.title_jp, ''), p.title_uz) as title_display,
                pm.role,
                COALESCE((SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id), 0) as total_tasks,
                COALESCE((SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id AND t.status = 'done'), 0) as completed_tasks,
                COALESCE((
                    SELECT COUNT(*)::int 
                    FROM tasks t 
                    WHERE t.project_id = p.id 
                      AND t.status != 'done'
                      AND t.deadline IS NOT NULL 
                      AND t.deadline::timestamp < NOW()
                ), 0) as overdue_tasks,
                COALESCE(
                    (
                        SELECT json_agg(DISTINCT u.avatar_url) FILTER (WHERE u.avatar_url IS NOT NULL)
                        FROM tasks t
                        JOIN users u ON t.assigned_to = u.id
                        WHERE t.project_id = p.id
                    ),
                    '[]'::json
                ) as team_avatars
            FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = $1 AND (p.is_archived = false OR p.is_archived IS NULL)
            ORDER BY COALESCE(p.is_starred, false) DESC, p.created_at DESC`,
            [userId]
        );

        res.json({ projects: result.rows });
    } catch (err) {
        console.error('❌ ERROR in getProjects:', err);
        res.status(500).json({ message: 'Server error loading projects' });
    }
};

export const getProjectById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        const result = await pool.query(
            `SELECT p.*, pm.role 
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND pm.user_id = $2`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or access denied' });
        }

        res.json({ project: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get ARCHIVED projects only
export const getArchivedProjects = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;

        const result = await pool.query(
            `SELECT p.*, 
        COALESCE(NULLIF(p.title_jp, ''), p.title_uz) as title_display,
        pm.role 
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = $1 AND p.is_archived = true
       ORDER BY p.updated_at DESC`,
            [userId]
        );

        res.json({ projects: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Toggle archive status (Archive / Unarchive)
export const toggleProjectArchive = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { is_archived } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        // Verify user is owner or admin of the project
        const memberCheck = await pool.query(
            `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const role = memberCheck.rows[0].role;
        if (role !== 'owner' && role !== 'admin') {
            return res.status(403).json({ message: 'Only owner or admin can archive projects' });
        }

        // Update archive status
        const result = await pool.query(
            `UPDATE projects SET is_archived = $1, updated_at = NOW() 
             WHERE id = $2 RETURNING *`,
            [is_archived, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const action = is_archived ? 'archived' : 'unarchived';
        res.json({ project: result.rows[0], message: `Project ${action} successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Permanently delete a project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        // Verify user is owner of the project
        const ownerCheck = await pool.query(
            `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (ownerCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const role = ownerCheck.rows[0].role;
        if (role !== 'owner' && role !== 'admin') {
            return res.status(403).json({ message: 'Only owner or admin can delete projects' });
        }

        // Delete project (cascades to tasks, members, etc. via FK)
        await pool.query('DELETE FROM projects WHERE id = $1', [id]);

        res.json({ message: 'Project deleted permanently' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Toggle star/pin status
export const toggleProjectStar = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        // Verify user is a member of the project
        const memberCheck = await pool.query(
            `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Toggle the is_starred value
        const result = await pool.query(
            `UPDATE projects SET is_starred = NOT COALESCE(is_starred, false), updated_at = NOW() 
             WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ project: result.rows[0], is_starred: result.rows[0].is_starred });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
