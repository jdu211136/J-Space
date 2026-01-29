"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = void 0;
const db_1 = __importDefault(require("../db"));
// Search users by name or email (global search with optional project context)
const searchUsers = async (req, res) => {
    try {
        const { query, projectId } = req.query;
        if (!query || typeof query !== 'string' || query.length < 2) {
            return res.status(400).json({ message: 'Query must be at least 2 characters' });
        }
        const searchTerm = `%${query}%`;
        // Global search with optional project membership status
        const result = await db_1.default.query(`SELECT u.id, u.full_name, u.email, u.avatar_url,
                    CASE WHEN pm.user_id IS NOT NULL THEN true ELSE false END as is_project_member
             FROM users u
             LEFT JOIN project_members pm ON u.id = pm.user_id 
                AND pm.project_id = $2 
                AND pm.status = 'active'
             WHERE u.full_name ILIKE $1 OR u.email ILIKE $1
             ORDER BY 
                CASE WHEN pm.user_id IS NOT NULL THEN 0 ELSE 1 END,
                u.full_name
             LIMIT 20`, [searchTerm, projectId || null]);
        res.json({ users: result.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.searchUsers = searchUsers;
