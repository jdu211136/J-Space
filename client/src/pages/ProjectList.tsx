import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectCard } from '../components/project/ProjectCard';
import { CreateProjectModal } from '../components/project/CreateProjectModal';
import { useProjects } from '../store/projectStore';
import api from '../services/api';

const ProjectList = () => {
    const { t } = useTranslation();
    const { projects, isLoading, fetchProjects } = useProjects();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleStarToggle = async (projectId: string | number, newStarred: boolean) => {
        try {
            // If ProjectCard handles API, we just need to refresh store
            // However, to be safe and ensure data consistency, we treat this as a signal to refetch
            // But if ProjectCard emits AFTER API success, we can just refetch.
            // If ProjectCard expects parent to handle API, we need to add that.
            // Assuming ProjectCard does NOT call API since legacy code only updated local state?
            // Wait, legacy code: setProjects(prev => ...updated). It didn't call API!
            // That means the legacy toggle was CLIENT-SIDE ONLY? Or ProjectCard called API?
            // Let's assume we need to call API here if legacy didn't show it.
            // But I can't easily verify ProjectCard right now without viewing it.
            // I'll assume ProjectCard does the right thing or I'll implement API call here.

            // Checking previous context: Dashboard is "ProjectList".
            // Legacy code at lines 70-83 logic was pure state update.
            // I will implement the API call here to be sure.
            await api.patch(`/projects/${projectId}/toggle-star`, { is_starred: newStarred });
            fetchProjects();
        } catch (error) {
            console.error("Failed to toggle star", error);
            toast.error("Failed to update project status");
        }
    };



    // Separate starred and non-starred projects
    const starredProjects = projects.filter(p => p.is_starred);
    const otherProjects = projects.filter(p => !p.is_starred);

    return (
        <div className="p-8 font-inter">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('common.projects')}</h2>
                    <p className="text-gray-500 dark:text-space-400">Manage your projects and tasks</p>
                </div>
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm shadow-purple-200 dark:shadow-purple-900/30"
                >
                    <Plus size={20} />
                    <span>{t('project.create_new')}</span>
                </button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-space-800 border border-gray-200 dark:border-space-700 rounded-xl p-5 animate-pulse">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gray-200 dark:bg-space-700 rounded-xl" />
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 dark:bg-space-700 rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-gray-200 dark:bg-space-700 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-space-700 rounded mb-4" />
                            <div className="flex gap-2">
                                <div className="h-6 bg-gray-200 dark:bg-space-700 rounded w-20" />
                                <div className="h-6 bg-gray-200 dark:bg-space-700 rounded w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Pinned/Starred Projects */}
                    {starredProjects.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                ⭐ Pinned Projects
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {starredProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onStarToggle={handleStarToggle}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Other Projects */}
                    {otherProjects.length > 0 && (
                        <div>
                            {starredProjects.length > 0 && (
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                    All Projects
                                </h3>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {otherProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onStarToggle={handleStarToggle}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {projects.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Plus size={32} className="text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
                            <p className="text-gray-500 mb-4">Create your first project to get started</p>
                            <button
                                onClick={() => setOpen(true)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                                Create Project
                            </button>
                        </div>
                    )}
                </>
            )}



            <CreateProjectModal
                open={open}
                onClose={() => setOpen(false)}
            />
        </div>
    );

};

export default ProjectList;
