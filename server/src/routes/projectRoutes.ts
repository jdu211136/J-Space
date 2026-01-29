import express from 'express';
import {
    createProject,
    getProjects,
    getProjectById,
    getArchivedProjects,
    toggleProjectArchive,
    deleteProject,
    toggleProjectStar
} from '../controllers/projectController';
import { inviteMember, getProjectMembers } from '../controllers/memberController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken); // Protect all project routes

// Project CRUD routes
router.post('/', createProject);
router.get('/', getProjects);

// IMPORTANT: Place /archived BEFORE /:id to avoid route conflict
router.get('/archived', getArchivedProjects);

// Single project routes
router.get('/:id', getProjectById);
router.delete('/:id', deleteProject);

// Archive toggle
router.put('/:id/archive', toggleProjectArchive);

// Star/Pin toggle
router.put('/:id/star', toggleProjectStar);

// Member management routes
router.post('/:id/invite', inviteMember);
router.get('/:id/members', getProjectMembers);

export default router;

