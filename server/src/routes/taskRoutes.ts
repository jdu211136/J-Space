import express from 'express';
import {
    createTask,
    getTasks,
    updateTaskStatus,
    updateTask,
    deleteTask,
    getTaskCollaborators,
    addTaskCollaborator,
    removeTaskCollaborator
} from '../controllers/taskController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createTask);
router.get('/project/:projectId', getTasks);
router.patch('/:id/status', updateTaskStatus);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

// Collaborator routes
router.get('/:id/collaborators', getTaskCollaborators);
router.post('/:id/collaborators', addTaskCollaborator);
router.delete('/:id/collaborators/:collaboratorId', removeTaskCollaborator);

export default router;
