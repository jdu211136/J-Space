import { Request, Response } from 'express';
import pool from '../db';
import { taskSchema, taskStatusSchema } from '../utils/validation';
import { TranslationService } from '../services/TranslationService';

export const createTask = async (req: Request, res: Response) => {
    try {
        console.log('Received payload:', req.body);

        // Manual extraction for Soft Validation
        const { projectId, title, description,
            deadline: rawDeadline,
            priority: rawPriority,
            assignedTo: rawAssignee,
            sourceLang: rawSourceLang } = req.body;

        if (!projectId) return res.status(400).json({ message: 'Project ID is required' });

        // Sanitize
        const deadline = (rawDeadline && rawDeadline !== "") ? rawDeadline : null;
        const priority = (rawPriority && rawPriority !== "") ? rawPriority : 'mid';
        const assignedTo = (rawAssignee && rawAssignee !== "" && rawAssignee !== "null") ? rawAssignee : null;

        // @ts-ignore
        const userId = req.user?.id;

        // Use explicit sourceLang from frontend, fallback to header-based detection
        const userLang = rawSourceLang || TranslationService.getUserLanguage(req);

        // Verify membership
        const membership = await pool.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }

        // Determine source text
        const sourceTitle = title || 'Untitled Task';
        const sourceDesc = description || '';

        // Initial objects
        let titleJson: any = { en: sourceTitle, uz: sourceTitle, ja: sourceTitle };
        let descriptionJson: any = { en: sourceDesc, uz: sourceDesc, ja: sourceDesc };

        try {
            if (sourceTitle && sourceTitle !== 'Untitled Task') {
                const translatedTitle = await TranslationService.translate(sourceTitle, userLang).catch(() => null);
                if (translatedTitle) titleJson = translatedTitle;
            }
            if (sourceDesc) {
                const translatedDesc = await TranslationService.translate(sourceDesc, userLang).catch(() => null);
                if (translatedDesc) descriptionJson = translatedDesc;
            }
        } catch (err) {
            console.error('Translation failed:', err);
        }

        // Insert - REMOVED desc_* columns as they don't exist in schema
        const newTask = await pool.query(
            `INSERT INTO tasks 
             (project_id, title, description, 
              title_en, title_uz, title_jp, 
              deadline, priority, assigned_to) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [
                projectId,
                JSON.stringify(titleJson), JSON.stringify(descriptionJson),
                titleJson.en || sourceTitle, titleJson.uz || sourceTitle, titleJson.ja || sourceTitle,
                deadline, priority, assignedTo
            ]
        );

        res.status(201).json({ task: newTask.rows[0], message: 'Task created successfully' });
    } catch (err: any) {
        console.error('INSERT Task Failed:', err);
        if (err.code === '22P02') {
            return res.status(400).json({ message: 'Invalid data format (UUID/Date)' });
        }
        res.status(500).json({ message: 'Server error', details: err.message });
    }
};

export const getTasks = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        const membership = await pool.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }

        // Get tasks with collaborators aggregated and active timer info
        const tasks = await pool.query(
            `SELECT t.*, 
                COALESCE(NULLIF(t.title_jp, ''), t.title_uz) as title_display,
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'user_id', u.id,
                        'full_name', u.full_name,
                        'email', u.email,
                        'avatar_url', u.avatar_url
                    ))
                    FROM task_collaborators tc
                    JOIN users u ON tc.user_id = u.id
                    WHERE tc.task_id = t.id),
                    '[]'::json
                ) as collaborators,
                (SELECT user_id FROM time_logs 
                 WHERE task_id = t.id AND end_time IS NULL 
                 LIMIT 1) as active_timer_user_id
             FROM tasks t
             WHERE t.project_id = $1
             ORDER BY t.created_at DESC`,
            [projectId]
        );

        res.json({ tasks: tasks.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validation = taskStatusSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ errors: validation.error.issues });
        }

        const { status } = validation.data;
        // @ts-ignore
        const userId = req.user?.id;

        const task = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const projectId = task.rows[0].project_id;
        const membership = await pool.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }

        const updatedTask = await pool.query(
            'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );

        res.json({ task: updatedTask.rows[0], message: 'Status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        const taskResult = await pool.query(
            'SELECT project_id, title, description FROM tasks WHERE id = $1',
            [id]
        );
        if (taskResult.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const existingTask = taskResult.rows[0];
        const projectId = existingTask.project_id;

        const membership = await pool.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }

        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        // Title updates
        let existingTitle = existingTask.title || { en: '', uz: '', ja: '', translation_locked: false };
        if (typeof existingTitle === 'string') existingTitle = JSON.parse(existingTitle);

        const titleUpdates = TranslationService.extractLanguageUpdates(req.body, 'title');
        if (titleUpdates) {
            const newTitle = await TranslationService.updateField(
                existingTitle,
                titleUpdates,
                !existingTitle.translation_locked
            );
            updates.push(`title = $${paramCount}`);
            values.push(JSON.stringify(newTitle));
            paramCount++;

            updates.push(`title_en = $${paramCount}`);
            values.push(newTitle.en);
            paramCount++;
            updates.push(`title_uz = $${paramCount}`);
            values.push(newTitle.uz);
            paramCount++;
            updates.push(`title_jp = $${paramCount}`);
            values.push(newTitle.ja);
            paramCount++;
        }

        // Description updates - ONLY updating JSONB, no legacy columns
        let existingDesc = existingTask.description || { en: '', uz: '', ja: '', translation_locked: false };
        if (typeof existingDesc === 'string') existingDesc = JSON.parse(existingDesc);

        const descUpdates = TranslationService.extractLanguageUpdates(req.body, 'description');
        if (descUpdates) {
            const newDesc = await TranslationService.updateField(
                existingDesc,
                descUpdates,
                !existingDesc.translation_locked
            );
            updates.push(`description = $${paramCount}`);
            values.push(JSON.stringify(newDesc));
            paramCount++;
        }

        // Simple fields
        const simpleFieldMap: Record<string, string> = {
            status: 'status',
            priority: 'priority',
            startDate: 'start_date',
            endDate: 'end_date',
            deadline: 'deadline',
            assignedTo: 'assigned_to',
        };

        for (const [key, column] of Object.entries(simpleFieldMap)) {
            if (req.body[key] !== undefined) {
                updates.push(`${column} = $${paramCount}`);
                values.push(req.body[key]);
                paramCount++;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        values.push(id); // ID is last param

        const result = await pool.query(query, values);
        res.json({ task: result.rows[0], message: 'Task updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        const task = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const projectId = task.rows[0].project_id;
        const membership = await pool.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }

        await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getTaskCollaborators = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        const task = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const projectId = task.rows[0].project_id;
        const membership = await pool.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }

        const collaborators = await pool.query(
            `SELECT u.id as user_id, u.full_name, u.email, u.avatar_url, tc.created_at
             FROM task_collaborators tc
             JOIN users u ON tc.user_id = u.id
             WHERE tc.task_id = $1
             ORDER BY tc.created_at`,
            [id]
        );

        res.json({ collaborators: collaborators.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const addTaskCollaborator = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { userId: targetUserId, autoInvite } = req.body;
        // @ts-ignore
        const currentUserId = req.user?.id;

        if (!targetUserId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        await client.query('BEGIN');

        const task = await client.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Task not found' });
        }

        const projectId = task.rows[0].project_id;
        const currentMembership = await client.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, currentUserId]
        );

        if (currentMembership.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Not a member of this project' });
        }

        const targetUser = await client.query('SELECT id, full_name, email FROM users WHERE id = $1', [targetUserId]);
        if (targetUser.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found' });
        }

        const targetMembership = await client.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, targetUserId]
        );

        if (targetMembership.rows.length === 0) {
            if (autoInvite) {
                // Auto-join (Direct Add as per simpler schema)
                await client.query(
                    `INSERT INTO project_members (project_id, user_id, role, joined_at)
                     VALUES ($1, $2, 'member', CURRENT_TIMESTAMP)`,
                    [projectId, targetUserId]
                );
            } else {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    message: 'User is not a project member',
                    requiresInvite: true,
                    user: targetUser.rows[0]
                });
            }
        }

        await client.query(
            `INSERT INTO task_collaborators (task_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (task_id, user_id) DO NOTHING`,
            [id, targetUserId]
        );

        await client.query('COMMIT');
        res.json({
            message: 'Collaborator added',
            collaborator: targetUser.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};

export const removeTaskCollaborator = async (req: Request, res: Response) => {
    try {
        const { id, collaboratorId } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        const task = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const projectId = task.rows[0].project_id;
        const membership = await pool.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }

        await pool.query(
            'DELETE FROM task_collaborators WHERE task_id = $1 AND user_id = $2',
            [id, collaboratorId]
        );

        res.json({ message: 'Collaborator removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
