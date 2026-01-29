/**
 * Time Log Controller
 * Handles time tracking functionality for tasks
 */

import { Request, Response } from 'express';
import pool from '../db';

/**
 * Start Timer - POST /api/time-logs/start
 * Creates a new time log entry for the current user on a task.
 * If user already has an active timer anywhere, auto-stop it first.
 */
export const startTimer = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        const { taskId } = req.body;

        if (!taskId) {
            return res.status(400).json({ message: 'taskId is required' });
        }

        // Check if user already has an active timer on any task
        const existingTimer = await pool.query(
            `SELECT id, task_id FROM time_logs WHERE user_id = $1 AND end_time IS NULL`,
            [userId]
        );

        // Auto-stop existing timer if any
        if (existingTimer.rows.length > 0) {
            await pool.query(
                `UPDATE time_logs 
                 SET end_time = CURRENT_TIMESTAMP, 
                     duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::INTEGER
                 WHERE id = $1`,
                [existingTimer.rows[0].id]
            );
        }

        // Start new timer
        const newTimer = await pool.query(
            `INSERT INTO time_logs (user_id, task_id, start_time) 
             VALUES ($1, $2, CURRENT_TIMESTAMP) 
             RETURNING *`,
            [userId, taskId]
        );

        res.json({
            timeLog: newTimer.rows[0],
            message: 'Timer started',
            autoStopped: existingTimer.rows.length > 0 ? existingTimer.rows[0].task_id : null
        });
    } catch (err) {
        console.error('startTimer error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Stop Timer - POST /api/time-logs/stop
 * Stops the active timer for the current user.
 * Optional: Can specify taskId to only stop timer on that specific task.
 */
export const stopTimer = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        const { taskId } = req.body;

        // Find active timer (optionally filtered by taskId)
        let query = `SELECT id FROM time_logs WHERE user_id = $1 AND end_time IS NULL`;
        const params: any[] = [userId];

        if (taskId) {
            query += ` AND task_id = $2`;
            params.push(taskId);
        }

        const activeTimer = await pool.query(query, params);

        if (activeTimer.rows.length === 0) {
            return res.status(404).json({ message: 'No active timer found' });
        }

        // Stop the timer and calculate duration
        const stoppedTimer = await pool.query(
            `UPDATE time_logs 
             SET end_time = CURRENT_TIMESTAMP, 
                 duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::INTEGER
             WHERE id = $1 
             RETURNING *`,
            [activeTimer.rows[0].id]
        );

        res.json({
            timeLog: stoppedTimer.rows[0],
            message: 'Timer stopped',
            duration_seconds: stoppedTimer.rows[0].duration_seconds
        });
    } catch (err) {
        console.error('stopTimer error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get Active Timer - GET /api/time-logs/active
 * Returns the currently active timer for the logged-in user
 */
export const getActiveTimer = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;

        const activeTimer = await pool.query(
            `SELECT tl.*, t.title as task_title
             FROM time_logs tl
             LEFT JOIN tasks t ON tl.task_id = t.id
             WHERE tl.user_id = $1 AND tl.end_time IS NULL`,
            [userId]
        );

        if (activeTimer.rows.length === 0) {
            return res.json({ activeTimer: null });
        }

        res.json({ activeTimer: activeTimer.rows[0] });
    } catch (err) {
        console.error('getActiveTimer error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get Time Logs for Task - GET /api/time-logs/task/:taskId
 * Returns all time logs for a specific task
 */
export const getTaskTimeLogs = async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;

        const timeLogs = await pool.query(
            `SELECT tl.*, u.full_name, u.avatar_url
             FROM time_logs tl
             JOIN users u ON tl.user_id = u.id
             WHERE tl.task_id = $1
             ORDER BY tl.start_time DESC`,
            [taskId]
        );

        // Calculate total time spent
        const totalResult = await pool.query(
            `SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds
             FROM time_logs
             WHERE task_id = $1 AND duration_seconds IS NOT NULL`,
            [taskId]
        );

        res.json({
            timeLogs: timeLogs.rows,
            totalSeconds: parseInt(totalResult.rows[0].total_seconds)
        });
    } catch (err) {
        console.error('getTaskTimeLogs error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get User's Time Logs - GET /api/time-logs/my
 * Returns time logs for the current user with optional date filtering
 */
export const getMyTimeLogs = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        const { startDate, endDate, limit = 20 } = req.query;

        let query = `
            SELECT tl.*, t.title as task_title, t.project_id
            FROM time_logs tl
            LEFT JOIN tasks t ON tl.task_id = t.id
            WHERE tl.user_id = $1
        `;
        const params: any[] = [userId];
        let paramIndex = 2;

        if (startDate) {
            query += ` AND tl.start_time >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND tl.start_time <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        query += ` ORDER BY tl.start_time DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const timeLogs = await pool.query(query, params);

        res.json({ timeLogs: timeLogs.rows });
    } catch (err) {
        console.error('getMyTimeLogs error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
