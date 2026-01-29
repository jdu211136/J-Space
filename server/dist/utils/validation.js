"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskUpdateSchema = exports.taskStatusSchema = exports.taskSchema = exports.projectSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    fullName: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    preferredLang: zod_1.z.enum(['uz', 'jp', 'en']).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.projectSchema = zod_1.z.object({
    titleUz: zod_1.z.string().optional(),
    titleJp: zod_1.z.string().optional(),
    titleEn: zod_1.z.string().optional(),
    descUz: zod_1.z.string().optional(),
    descJp: zod_1.z.string().optional(),
    descEn: zod_1.z.string().optional(),
    category: zod_1.z.string().min(1, 'Category is required'),
    colorCode: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color code').optional(),
    isPublic: zod_1.z.boolean().optional(),
});
exports.taskSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
    titleUz: zod_1.z.string().optional(),
    titleJp: zod_1.z.string().optional(),
    titleEn: zod_1.z.string().optional(),
    deadline: zod_1.z.string().datetime(),
    priority: zod_1.z.enum(['low', 'mid', 'high']).optional(),
    assignedTo: zod_1.z.string().uuid().optional(),
});
exports.taskStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['todo', 'in_progress', 'done', 'reviewed']),
});
// Partial update schema for PATCH requests
exports.taskUpdateSchema = zod_1.z.object({
    titleUz: zod_1.z.string().optional(),
    titleEn: zod_1.z.string().optional(),
    titleJp: zod_1.z.string().optional(),
    descriptionUz: zod_1.z.string().optional(),
    descriptionEn: zod_1.z.string().optional(),
    descriptionJp: zod_1.z.string().optional(),
    status: zod_1.z.enum(['todo', 'in_progress', 'done', 'reviewed']).optional(),
    priority: zod_1.z.enum(['low', 'mid', 'high']).optional(),
    startDate: zod_1.z.string().nullable().optional(),
    endDate: zod_1.z.string().nullable().optional(),
    deadline: zod_1.z.string().nullable().optional(), // Legacy field
    assignedTo: zod_1.z.string().uuid().nullable().optional(),
}).refine((data) => {
    // Validate that endDate >= startDate if both are set
    if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
}, {
    message: 'End date must be equal to or later than start date',
    path: ['endDate'],
});
