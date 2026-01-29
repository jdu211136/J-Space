"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const projectController_1 = require("../controllers/projectController");
const memberController_1 = require("../controllers/memberController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken); // Protect all project routes
router.post('/', projectController_1.createProject);
router.get('/', projectController_1.getProjects);
router.get('/:id', projectController_1.getProjectById);
// Member management routes
router.post('/:id/invite', memberController_1.inviteMember);
router.get('/:id/members', memberController_1.getProjectMembers);
exports.default = router;
