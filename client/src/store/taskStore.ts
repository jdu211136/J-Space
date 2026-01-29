import { create } from 'zustand';
import api from '../services/api';

// LocalizedContent type for JSONB multilingual fields
export interface LocalizedContent {
    en: string;
    uz: string;
    ja: string;
    translation_locked?: boolean;
}

export interface Task {
    id: number;
    // JSONB multilingual fields
    title?: LocalizedContent | null;
    description?: LocalizedContent | null;
    // Legacy columns (for backward compatibility)
    title_uz?: string;
    title_jp?: string;
    title_en?: string;
    title_display?: string;
    description_uz?: string;
    description_jp?: string;
    description_en?: string;
    desc_uz?: string;
    desc_en?: string;
    desc_jp?: string;
    // Other fields
    status: 'todo' | 'in_progress' | 'done' | 'reviewed';
    priority: 'low' | 'mid' | 'high';
    start_date: string | null;
    end_date: string | null;
    deadline: string | null; // Legacy field
    project_id: number;
    assigned_to?: string;
    collaborators?: Array<{
        user_id: string;
        full_name?: string;
        email?: string;
        avatar_url?: string;
    }>;
    // Timer tracking - populated when someone has an active timer
    active_timer_user_id?: string | null;
    created_at: string;
    updated_at?: string;
}

interface TaskState {
    tasks: Task[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchTasks: (projectId: string | number) => Promise<void>;
    createTask: (taskData: any) => Promise<void>;
    updateTask: (taskId: number, data: any) => Promise<void>;
    deleteTask: (taskId: number) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    isLoading: false,
    error: null,

    fetchTasks: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.get(`/tasks/project/${projectId}`);
            set({ tasks: res.data.tasks || [], isLoading: false });
        } catch (error: any) {
            console.error("Failed to fetch tasks:", error);
            set({ error: error.message || 'Failed to fetch tasks', isLoading: false });
        }
    },

    createTask: async (taskData) => {
        set({ isLoading: true, error: null });
        try {
            await api.post('/tasks', taskData);
            // Re-fetch to ensure we have the correct display titles and IDs from server
            const projectId = taskData.projectId || taskData.project_id;
            if (projectId) {
                await get().fetchTasks(projectId);
            }
            set({ isLoading: false });
        } catch (error: any) {
            console.error("Failed to create task:", error);
            set({ error: error.message || 'Failed to create task', isLoading: false });
            throw error;
        }
    },

    updateTask: async (taskId, data) => {
        // Optimistic update
        const previousTasks = get().tasks;
        set({
            tasks: previousTasks.map(t => t.id === taskId ? { ...t, ...data } : t)
        });

        try {
            await api.patch(`/tasks/${taskId}`, data);
        } catch (error: any) {
            console.error("Failed to update task:", error);
            // Rollback
            set({ tasks: previousTasks, error: error.message });
            throw error;
        }
    },

    deleteTask: async (taskId) => {
        const previousTasks = get().tasks;
        set({
            tasks: previousTasks.filter(t => t.id !== taskId)
        });

        try {
            await api.delete(`/tasks/${taskId}`);
        } catch (error: any) {
            console.error("Failed to delete task:", error);
            set({ tasks: previousTasks, error: error.message });
            throw error;
        }
    }
}));
