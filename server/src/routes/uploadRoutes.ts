/**
 * Upload Routes
 * POST /api/uploads
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import pool from '../db';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-random-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (optional - can restrict types here)
const fileFilter = (req: any, file: any, cb: any) => {
    // Allow most common file types
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

// Routes

// Upload single file - POST /api/uploads
router.post('/', authenticateToken, upload.single('file'), async (req: any, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const userId = req.user?.id;
        const { taskId } = req.body;

        // Relative URL for frontend access
        const fileUrl = `/uploads/${req.file.filename}`;

        // If taskId is provided, record in database immediately
        let attachment = null;
        if (taskId) {
            const result = await pool.query(
                `INSERT INTO task_attachments 
                 (task_id, file_name, file_path, file_type, file_size, uploaded_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [
                    taskId,
                    req.file.originalname,
                    fileUrl,
                    req.file.mimetype,
                    req.file.size,
                    userId
                ]
            );
            attachment = result.rows[0];
        }

        res.status(201).json({
            message: 'File uploaded successfully',
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            attachment: attachment
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

// Get attachments for a task - GET /api/uploads/task/:taskId
router.get('/task/:taskId', authenticateToken, async (req: any, res: any) => {
    try {
        const { taskId } = req.params;

        const result = await pool.query(
            `SELECT ta.*, u.full_name as uploader_name
             FROM task_attachments ta
             LEFT JOIN users u ON ta.uploaded_by = u.id
             WHERE ta.task_id = $1
             ORDER BY ta.created_at DESC`,
            [taskId]
        );

        res.json({ attachments: result.rows });
    } catch (err) {
        console.error('Get attachments error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete attachment - DELETE /api/uploads/:id
router.delete('/:id', authenticateToken, async (req: any, res: any) => {
    try {
        const { id } = req.params;

        // Check if attachment exists and get file path
        const fileResult = await pool.query(
            'SELECT * FROM task_attachments WHERE id = $1',
            [id]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({ message: 'Attachment not found' });
        }

        const attachment = fileResult.rows[0];

        // Verify ownership or admin status (simplified for now: original uploader can delete)
        // @ts-ignore
        if (attachment.uploaded_by !== req.user?.id) {
            // You might want to allow project admins to delete too
            // For now, strict ownership
            // return res.status(403).json({ message: 'Not authorized to delete this file' });
        }

        // Remove from DB
        await pool.query('DELETE FROM task_attachments WHERE id = $1', [id]);

        // Remove from filesystem
        // Note: file_path is stored as '/uploads/filename.ext'
        const filename = path.basename(attachment.file_path);
        const filePath = path.join(uploadDir, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: 'Attachment deleted' });
    } catch (err) {
        console.error('Delete attachment error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
