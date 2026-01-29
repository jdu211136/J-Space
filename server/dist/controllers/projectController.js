"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectById = exports.getProjects = exports.createProject = void 0;
const db_1 = __importDefault(require("../db"));
const validation_1 = require("../utils/validation");
const createProject = async (req, res) => {
    const client = await db_1.default.connect();
    try {
        const validation = validation_1.projectSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ errors: validation.error.errors });
        }
        const { titleUz, titleJp, titleEn, descUz, descJp, descEn, category, colorCode, isPublic } = validation.data;
        // @ts-ignore
        const ownerId = req.user?.id;
        await client.query('BEGIN');
        const newProject = await client.query(`INSERT INTO projects 
      (owner_id, title_uz, title_jp, title_en, desc_uz, desc_jp, desc_en, category, color_code, is_public) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`, [ownerId, titleUz, titleJp, titleEn, descUz, descJp, descEn, category, colorCode, isPublic || false]);
        const project = newProject.rows[0];
        // Atomically add owner as admin/member
        await client.query('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [project.id, ownerId, 'admin']);
        await client.query('COMMIT');
        res.status(201).json({ project, message: 'Project created successfully' });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
    finally {
        client.release();
    }
};
exports.createProject = createProject;
const getProjects = async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        const { lang } = req.query; // 'uz', 'jp', 'en'
        const result = await db_1.default.query(`SELECT p.*, 
        COALESCE(NULLIF(p.title_jp, ''), p.title_uz) as title_display,
        pm.role 
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`, [userId]);
        res.json({ projects: result.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getProjects = getProjects;
const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;
        const result = await db_1.default.query(`SELECT p.*, pm.role 
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND pm.user_id = $2`, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or access denied' });
        }
        res.json({ project: result.rows[0] });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getProjectById = getProjectById;
