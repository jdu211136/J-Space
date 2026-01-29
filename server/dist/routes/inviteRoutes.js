"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const memberController_1 = require("../controllers/memberController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken); // Protect all invite routes
router.get('/me', memberController_1.getMyInvitations);
router.post('/:inviteId/accept', memberController_1.acceptInvitation);
router.post('/:inviteId/decline', memberController_1.declineInvitation);
exports.default = router;
