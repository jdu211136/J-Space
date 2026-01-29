"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const taskController_1 = require("../controllers/taskController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/', taskController_1.createTask);
router.get('/project/:projectId', taskController_1.getTasks);
router.patch('/:id/status', taskController_1.updateTaskStatus);
router.patch('/:id', taskController_1.updateTask);
router.delete('/:id', taskController_1.deleteTask);
// Collaborator routes
router.get('/:id/collaborators', taskController_1.getTaskCollaborators);
router.post('/:id/collaborators', taskController_1.addTaskCollaborator);
router.delete('/:id/collaborators/:collaboratorId', taskController_1.removeTaskCollaborator);
exports.default = router;
