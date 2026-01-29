import express from 'express';
import { acceptInvitation, declineInvitation, getMyInvitations } from '../controllers/memberController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken); // Protect all invite routes

router.get('/me', getMyInvitations);
router.post('/:inviteId/accept', acceptInvitation);
router.post('/:inviteId/decline', declineInvitation);

export default router;
