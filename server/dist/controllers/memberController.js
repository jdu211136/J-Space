"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyInvitations = exports.getProjectMembers = exports.declineInvitation = exports.acceptInvitation = exports.inviteMember = void 0;
const db_1 = __importDefault(require("../db"));
// Invite a user to a project
const inviteMember = async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const { email, role = 'member' } = req.body;
        // @ts-ignore
        const inviterId = req.user?.id;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ message: 'Valid email is required' });
        }
        const validRoles = ['owner', 'admin', 'member', 'viewer'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        // Verify project exists and user has permission (owner or admin)
        const project = await db_1.default.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
        if (project.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }
        const isOwner = project.rows[0].owner_id === inviterId;
        if (!isOwner) {
            // Check if user is admin
            const membership = await db_1.default.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = $3', [projectId, inviterId, 'active']);
            const isAdmin = membership.rows.length > 0 && ['owner', 'admin'].includes(membership.rows[0].role);
            if (!isAdmin) {
                return res.status(403).json({ message: 'Only owners and admins can invite members' });
            }
        }
        // Find user by email
        const user = await db_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userId = user.rows[0].id;
        // Check if already a member
        const existing = await db_1.default.query('SELECT id, status FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
        if (existing.rows.length > 0) {
            const existingMember = existing.rows[0];
            if (existingMember.status === 'active') {
                return res.status(400).json({ message: 'User is already a member' });
            }
            // Update existing pending invitation
            await db_1.default.query('UPDATE project_members SET role = $1, invited_at = CURRENT_TIMESTAMP, status = $2 WHERE id = $3', [role, 'pending', existingMember.id]);
            return res.json({ message: 'Invitation resent', inviteId: existingMember.id });
        }
        // Create new invitation
        const newInvite = await db_1.default.query(`INSERT INTO project_members (project_id, user_id, role, status, invited_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             RETURNING id, project_id, user_id, role, status, invited_at`, [projectId, userId, role, 'pending']);
        // TODO: Send notification email/in-app notification
        // For now, just return success
        res.status(201).json({
            message: 'Invitation sent',
            invite: newInvite.rows[0],
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.inviteMember = inviteMember;
// Accept an invitation
const acceptInvitation = async (req, res) => {
    try {
        const { inviteId } = req.params;
        // @ts-ignore
        const userId = req.user?.id;
        const invite = await db_1.default.query('SELECT * FROM project_members WHERE id = $1 AND user_id = $2', [inviteId, userId]);
        if (invite.rows.length === 0) {
            return res.status(404).json({ message: 'Invitation not found' });
        }
        if (invite.rows[0].status === 'active') {
            return res.status(400).json({ message: 'Invitation already accepted' });
        }
        if (invite.rows[0].status === 'declined') {
            return res.status(400).json({ message: 'Invitation was declined' });
        }
        await db_1.default.query('UPDATE project_members SET status = $1, joined_at = CURRENT_TIMESTAMP WHERE id = $2', ['active', inviteId]);
        res.json({ message: 'Invitation accepted' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.acceptInvitation = acceptInvitation;
// Decline an invitation
const declineInvitation = async (req, res) => {
    try {
        const { inviteId } = req.params;
        // @ts-ignore
        const userId = req.user?.id;
        const invite = await db_1.default.query('SELECT * FROM project_members WHERE id = $1 AND user_id = $2', [inviteId, userId]);
        if (invite.rows.length === 0) {
            return res.status(404).json({ message: 'Invitation not found' });
        }
        await db_1.default.query('UPDATE project_members SET status = $1 WHERE id = $2', ['declined', inviteId]);
        res.json({ message: 'Invitation declined' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.declineInvitation = declineInvitation;
// Get project members
const getProjectMembers = async (req, res) => {
    try {
        const { id: projectId } = req.params;
        // @ts-ignore
        const userId = req.user?.id;
        // Verify user has access to project
        const project = await db_1.default.query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
        if (project.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }
        const isOwner = project.rows[0].owner_id === userId;
        const membership = await db_1.default.query('SELECT role, status FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
        const hasAccess = isOwner || (membership.rows.length > 0 && membership.rows[0].status === 'active');
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Get all members (including pending)
        const members = await db_1.default.query(`SELECT pm.id, pm.role, pm.status, pm.invited_at, pm.joined_at,
                    u.id as user_id, u.full_name, u.email, u.avatar_url,
                    p.owner_id
             FROM project_members pm
             JOIN users u ON pm.user_id = u.id
             JOIN projects p ON pm.project_id = p.id
             WHERE pm.project_id = $1
             ORDER BY 
                 CASE WHEN pm.user_id = p.owner_id THEN 0 ELSE 1 END,
                 pm.status DESC,
                 pm.joined_at DESC NULLS LAST,
                 pm.invited_at DESC`, [projectId]);
        res.json({ members: members.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getProjectMembers = getProjectMembers;
// Get user's pending invitations
const getMyInvitations = async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        const invitations = await db_1.default.query(`SELECT pm.id, pm.role, pm.status, pm.invited_at,
                    p.id as project_id, p.title_uz, p.title_en, p.title_jp, p.color_code,
                    u.id as inviter_id, u.full_name as inviter_name
             FROM project_members pm
             JOIN projects p ON pm.project_id = p.id
             LEFT JOIN users u ON p.owner_id = u.id
             WHERE pm.user_id = $1 AND pm.status = $2
             ORDER BY pm.invited_at DESC`, [userId, 'pending']);
        res.json({ invitations: invitations.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMyInvitations = getMyInvitations;
