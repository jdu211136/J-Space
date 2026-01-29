import { Request, Response } from 'express';
import pool from '../db';

// Search users by name or email (global search with optional project context)
export const searchUsers = async (req: Request, res: Response) => {
    try {
        const { query, projectId } = req.query;

        if (!query || typeof query !== 'string' || query.length < 2) {
            return res.status(400).json({ message: 'Query must be at least 2 characters' });
        }

        const searchTerm = `%${query}%`;

        // Global search with optional project membership status
        // Note: Removed pm.status check as column may not exist in all environments
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.avatar_url,
                    CASE WHEN pm.user_id IS NOT NULL THEN true ELSE false END as is_project_member
             FROM users u
             LEFT JOIN project_members pm ON u.id = pm.user_id 
                AND pm.project_id = $2
             WHERE u.full_name ILIKE $1 OR u.email ILIKE $1
             ORDER BY 
                CASE WHEN pm.user_id IS NOT NULL THEN 0 ELSE 1 END,
                u.full_name
             LIMIT 20`,
            [searchTerm, projectId || null]
        );

        res.json({ users: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
    try {
        // Debug: Log the full user object from auth middleware
        console.log('DEBUG: req.user =', (req as any).user);

        const user = (req as any).user;

        // Check if user exists on request
        if (!user) {
            console.error('DEBUG: No user object on request');
            return res.status(401).json({ message: 'No user in request' });
        }

        // The auth middleware sets `id`, not `userId`
        const userId = user.id || user.userId;
        console.log('DEBUG: Fetching profile for User ID:', userId);

        if (!userId) {
            console.error('DEBUG: No user ID found. user object:', user);
            return res.status(401).json({ message: 'No user ID in request' });
        }

        const result = await pool.query(
            `SELECT id, full_name, email, avatar_url, bio, preferred_lang, created_at
             FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            console.error('DEBUG: User ID not found in DB:', userId);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('DEBUG: Profile found for user:', result.rows[0].email);
        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('DEBUG: getProfile error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user?.id || user?.userId;

        console.log('DEBUG: updateProfile for User ID:', userId);

        if (!userId) {
            return res.status(401).json({ message: 'No user ID in request' });
        }

        const { full_name, avatar_url, bio } = req.body;

        // Build dynamic update query
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (full_name !== undefined) {
            updates.push(`full_name = $${paramIndex++}`);
            values.push(full_name);
        }
        if (avatar_url !== undefined) {
            updates.push(`avatar_url = $${paramIndex++}`);
            values.push(avatar_url);
        }
        if (bio !== undefined) {
            updates.push(`bio = $${paramIndex++}`);
            values.push(bio);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(userId);

        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
             WHERE id = $${paramIndex}
             RETURNING id, full_name, email, avatar_url, bio, preferred_lang`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: result.rows[0], message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all users for member selection
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const currentUserId = req.user?.id;

        const result = await pool.query(
            `SELECT id, full_name, email, avatar_url 
             FROM users 
             WHERE id != $1
             ORDER BY full_name ASC`,
            [currentUserId]
        );

        res.json({ users: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
