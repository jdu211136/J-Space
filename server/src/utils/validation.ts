import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    preferredLang: z.enum(['uz', 'jp', 'en']).optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export const projectSchema = z.object({
    titleUz: z.string().optional(),
    titleJp: z.string().optional(),
    titleEn: z.string().optional(),
    descUz: z.string().optional(),
    descJp: z.string().optional(),
    descEn: z.string().optional(),
    category: z.string().min(1, 'Category is required'),
    colorCode: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color code').optional(),
    isPublic: z.boolean().optional(),
});

export const taskSchema = z.object({
    projectId: z.string().uuid(),
    title: z.string().optional(),
    description: z.string().optional(),
    titleUz: z.string().optional(),
    titleJp: z.string().optional(),
    titleEn: z.string().optional(),
    descriptionUz: z.string().optional(),
    descriptionJp: z.string().optional(),
    descriptionEn: z.string().optional(),
    deadline: z.string().datetime().optional(), // Make deadline optional too if user input is minimal
    priority: z.enum(['low', 'mid', 'high']).optional(),
    assignedTo: z.string().uuid().optional(),
});

export const taskStatusSchema = z.object({
    status: z.enum(['todo', 'in_progress', 'done', 'reviewed']),
});

// Partial update schema for PATCH requests
export const taskUpdateSchema = z.object({
    titleUz: z.string().optional(),
    titleEn: z.string().optional(),
    titleJp: z.string().optional(),
    descriptionUz: z.string().optional(),
    descriptionEn: z.string().optional(),
    descriptionJp: z.string().optional(),
    status: z.enum(['todo', 'in_progress', 'done', 'reviewed']).optional(),
    priority: z.enum(['low', 'mid', 'high']).optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(), // Legacy field
    assignedTo: z.string().uuid().nullable().optional(),
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
