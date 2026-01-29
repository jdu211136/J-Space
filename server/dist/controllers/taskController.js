"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeTaskCollaborator = exports.addTaskCollaborator = exports.getTaskCollaborators = exports.deleteTask = exports.updateTask = exports.updateTaskStatus = exports.getTasks = exports.createTask = void 0;
const db_1 = __importDefault(require("../db"));
const validation_1 = require("../utils/validation");
const createTask = async (req, res) => {
    try {
        const validation = validation_1.taskSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ errors: validation.error.issues });
        }
        const { projectId, titleUz, titleJp, titleEn, deadline, priority, assignedTo } = validation.data;
        // @ts-ignore
        const userId = req.user?.id;
        // Verify membership
        const membership = await db_1.default.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }
        const newTask = await db_1.default.query(`INSERT INTO tasks 
      (project_id, title_uz, title_jp, title_en, deadline, priority, assigned_to) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`, [projectId, titleUz, titleJp, titleEn, deadline, priority || 'mid', assignedTo]);
        res.status(201).json({ task: newTask.rows[0], message: 'Task created successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createTask = createTask;
const getTasks = async (req, res) => {
    try {
        const { projectId } = req.params;
        // @ts-ignore
        const userId = req.user?.id;
        const membership = await db_1.default.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }
        // Get tasks with collaborators aggregated
        const tasks = await db_1.default.query(`SELECT t.*, 
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
                ) as collaborators
             FROM tasks t
             WHERE t.project_id = $1
             ORDER BY t.created_at DESC`, [projectId]);
        res.json({ tasks: tasks.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTasks = getTasks;
const updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const validation = validation_1.taskStatusSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ errors: validation.error.issues });
        }
        const { status } = validation.data;
        // @ts-ignore
        const userId = req.user?.id;
        // Check permissions (simplification: any member can update status for now)
        const task = await db_1.default.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0)
            return res.status(404).json({ message: 'Task not found' });
        const projectId = task.rows[0].project_id;
        const membership = await db_1.default.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }
        const updatedTask = await db_1.default.query('UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, id]);
        res.json({ task: updatedTask.rows[0], message: 'Status updated' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTaskStatus = updateTaskStatus;
// General partial update
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;
        // Verify task exists and user has permission
        const task = await db_1.default.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0)
            return res.status(404).json({ message: 'Task not found' });
        const projectId = task.rows[0].project_id;
        const membership = await db_1.default.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;
        const fieldMap = {
            titleUz: 'title_uz',
            titleEn: 'title_en',
            titleJp: 'title_jp',
            descriptionUz: 'desc_uz',
            descriptionEn: 'desc_en',
            descriptionJp: 'desc_jp',
            status: 'status',
            priority: 'priority',
            startDate: 'start_date',
            endDate: 'end_date',
            deadline: 'deadline',
            assignedTo: 'assigned_to',
        };
        for (const [key, column] of Object.entries(fieldMap)) {
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
        values.push(id);
        const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await db_1.default.query(query, values);
        res.json({ task: result.rows[0], message: 'Task updated' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTask = updateTask;
// Delete task
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;
        const task = await db_1.default.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0)
            return res.status(404).json({ message: 'Task not found' });
        const projectId = task.rows[0].project_id;
        const membership = await db_1.default.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }
        await db_1.default.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ message: 'Task deleted' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteTask = deleteTask;
// Get task collaborators
const getTaskCollaborators = async (req, res) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;
        const task = await db_1.default.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0)
            return res.status(404).json({ message: 'Task not found' });
        const projectId = task.rows[0].project_id;
        const membership = await db_1.default.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }
        const collaborators = await db_1.default.query(`SELECT u.id as user_id, u.full_name, u.email, u.avatar_url, tc.created_at
             FROM task_collaborators tc
             JOIN users u ON tc.user_id = u.id
             WHERE tc.task_id = $1
             ORDER BY tc.created_at`, [id]);
        res.json({ collaborators: collaborators.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTaskCollaborators = getTaskCollaborators;
// Add collaborator to task (with auto-invite to project if needed)
const addTaskCollaborator = async (req, res) => {
    const client = await db_1.default.connect();
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
        // Verify current user is member
        const currentMembership = await client.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, currentUserId]);
        if (currentMembership.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Not a member of this project' });
        }
        // Check if target user exists
        const targetUser = await client.query('SELECT id, full_name, email FROM users WHERE id = $1', [targetUserId]);
        if (targetUser.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if target user is project member
        const targetMembership = await client.query('SELECT status FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, targetUserId]);
        if (targetMembership.rows.length === 0) {
            if (autoInvite) {
                // Auto-invite to project with pending status
                await client.query(`INSERT INTO project_members (project_id, user_id, role, status, invited_at)
                     VALUES ($1, $2, 'member', 'pending', CURRENT_TIMESTAMP)`, [projectId, targetUserId]);
            }
            else {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    message: 'User is not a project member',
                    requiresInvite: true,
                    user: targetUser.rows[0]
                });
            }
        }
        // Add as collaborator (ignore if already exists)
        await client.query(`INSERT INTO task_collaborators (task_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (task_id, user_id) DO NOTHING`, [id, targetUserId]);
        await client.query('COMMIT');
        res.json({
            message: 'Collaborator added',
            collaborator: targetUser.rows[0]
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
    finally {
        client.release();
    }
};
exports.addTaskCollaborator = addTaskCollaborator;
// Remove collaborator from task
const removeTaskCollaborator = async (req, res) => {
    try {
        const { id, collaboratorId } = req.params;
        // @ts-ignore
        const userId = req.user?.id;
        const task = await db_1.default.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
        if (task.rows.length === 0)
            return res.status(404).json({ message: 'Task not found' });
        const projectId = task.rows[0].project_id;
        const membership = await db_1.default.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
        if (membership.rows.length === 0) {
            return res.status(403).json({ message: 'Not a member of this project' });
        }
        await db_1.default.query('DELETE FROM task_collaborators WHERE task_id = $1 AND user_id = $2', [id, collaboratorId]);
        res.json({ message: 'Collaborator removed' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.removeTaskCollaborator = removeTaskCollaborator;
