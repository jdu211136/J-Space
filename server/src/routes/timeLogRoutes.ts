/**
 * Time Log Routes
 * /api/time-logs
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
    startTimer,
    stopTimer,
    getActiveTimer,
    getTaskTimeLogs,
    getMyTimeLogs
} from '../controllers/timeLogController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Timer operations
router.post('/start', startTimer);
router.post('/stop', stopTimer);

// Get active timer for current user
router.get('/active', getActiveTimer);

// Get time logs for a specific task
router.get('/task/:taskId', getTaskTimeLogs);

// Get current user's time logs
router.get('/my', getMyTimeLogs);

export default router;
