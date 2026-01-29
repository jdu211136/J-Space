import { create } from 'zustand';
import api from '../services/api';

interface Project {
    id: number;
    title_uz?: string;
    title_jp?: string;
    title_en?: string;
    description_uz?: string;
    description_jp?: string;
    description_en?: string;
    category: string;
    color_code: string; // e.g., "#FF0000"
    is_public: boolean;
    is_starred?: boolean;
    total_tasks?: number;
    completed_tasks?: number;
    overdue_tasks?: number;
    team_avatars?: string[];
    created_at: string;
}

interface ProjectState {
    projects: Project[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchProjects: () => Promise<void>;
    addProject: (projectData: any) => Promise<void>;
}

export const useProjects = create<ProjectState>((set, get) => ({
    projects: [],
    isLoading: false,
    error: null,

    fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await api.get('/projects');
            // Backend returns { projects: [...] }
            set({ projects: res.data.projects || [], isLoading: false });
        } catch (error: any) {
            console.error("Failed to fetch projects:", error);
            set({ error: error.message || 'Failed to fetch projects', isLoading: false });
        }
    },

    addProject: async (projectData: any) => {
        set({ isLoading: true, error: null });
        try {
            await api.post('/projects', projectData);
            // Optimistically update or re-fetch
            // For simplicity, we re-fetch to ensure sync with backend IDs
            await get().fetchProjects();
        } catch (error: any) {
            console.error("Failed to add project:", error);
            set({ error: error.message || 'Failed to add project', isLoading: false });
            throw error; // Re-throw to let components handle specific UI feedback (like toasts)
        }
    }
}));
