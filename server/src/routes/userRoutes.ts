import express from 'express';
import { searchUsers, getProfile, updateProfile, getAllUsers } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken); // Protect all user routes

router.get('/', getAllUsers);        // GET /users - all users for member selection
router.get('/search', searchUsers);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;
