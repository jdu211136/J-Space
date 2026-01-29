import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export interface ProjectDetails {
    id: number;
    title_uz?: string;
    title_en?: string;
    title_jp?: string;
    description_uz?: string;
    description_en?: string;
    description_jp?: string;
    // JSONB multilingual fields
    name?: { en?: string; uz?: string; ja?: string };
    description?: { en?: string; uz?: string; ja?: string };
    category: string;
    color_code: string;
    is_public: boolean;
    is_starred?: boolean;
    is_archived?: boolean;
    created_at: string;
    members?: { id: number; full_name: string; email: string }[];
}

interface CurrentProjectContextType {
    project: ProjectDetails | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

const CurrentProjectContext = createContext<CurrentProjectContextType | undefined>(undefined);

export const CurrentProjectProvider = ({ children }: { children: ReactNode }) => {
    const { projectId } = useParams();
    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProject = async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/projects/${projectId}`);
            setProject(res.data.project || res.data);
        } catch (err: any) {
            console.error('Failed to fetch project:', err);
            setError(err.message || 'Failed to load project');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
    }, [projectId]);

    return (
        <CurrentProjectContext.Provider value={{ project, isLoading, error, refetch: fetchProject }}>
            {children}
        </CurrentProjectContext.Provider>
    );
};

export const useCurrentProject = () => {
    const context = useContext(CurrentProjectContext);
    if (context === undefined) {
        throw new Error('useCurrentProject must be used within a CurrentProjectProvider');
    }
    return context;
};
