import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Archive, Trash2, AlertTriangle, ArrowLeft, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import { useProjects } from '../../store/projectStore';

interface Project {
    id: string;
    is_archived: boolean;
    title_en?: string;
    title_uz?: string;
    name?: any;
}

export const ProjectSettings = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { fetchProjects } = useProjects();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [archiving, setArchiving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const loadProject = async () => {
            try {
                const res = await api.get(`/projects/${projectId}`);
                setProject(res.data.project);
            } catch (err) {
                console.error('Failed to load project:', err);
                toast.error(t('errors.load_project'));
            } finally {
                setLoading(false);
            }
        };
        if (projectId) loadProject();
    }, [projectId, t]);

    const handleArchive = async () => {
        if (!project) return;
        setArchiving(true);
        try {
            const newStatus = !project.is_archived;
            await api.put(`/projects/${projectId}/archive`, { is_archived: newStatus });
            setProject({ ...project, is_archived: newStatus });
            toast.success(newStatus ? t('settings.project_archived') : t('settings.project_unarchived'));
            fetchProjects(); // Refresh sidebar
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('errors.archive_failed'));
        } finally {
            setArchiving(false);
        }
    };

    const handleDelete = async () => {
        if (!project) return;

        const confirmed = window.confirm(t('settings.delete_confirm'));
        if (!confirmed) return;

        setDeleting(true);
        try {
            await api.delete(`/projects/${projectId}`);
            toast.success(t('settings.project_deleted'));
            fetchProjects();
            navigate('/my-tasks');
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('errors.delete_failed'));
        } finally {
            setDeleting(false);
        }
    };

    const getProjectName = () => {
        if (!project) return '';
        if (project.name && typeof project.name === 'object') {
            return project.name.en || project.name.uz || project.name.ja || 'Project';
        }
        return project.title_en || project.title_uz || 'Project';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-8 text-center text-gray-500">
                {t('errors.project_not_found')}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 font-inter">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <button
                    onClick={() => navigate(`/projects/${projectId}`)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-space-800 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} className="text-gray-500 dark:text-space-400" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('settings.project_settings')}</h1>
                    <p className="text-sm text-gray-500 dark:text-space-400">{getProjectName()}</p>
                </div>
            </div>

            {/* Archive Status Badge */}
            {project.is_archived && (
                <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <Archive size={18} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">{t('settings.project_is_archived')}</span>
                </div>
            )}

            {/* Danger Zone */}
            <div className="border-2 border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
                <div className="bg-red-50 dark:bg-red-900/30 px-4 py-3 border-b border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-500" />
                        <h2 className="font-semibold text-red-700 dark:text-red-400">{t('settings.danger_zone')}</h2>
                    </div>
                </div>

                <div className="p-4 space-y-4 bg-white dark:bg-space-900">
                    {/* Archive Action */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-space-800 rounded-lg">
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                                {project.is_archived ? t('settings.unarchive_project') : t('settings.archive_project')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-space-400 mt-1">
                                {project.is_archived
                                    ? t('settings.unarchive_description')
                                    : t('settings.archive_description')
                                }
                            </p>
                        </div>
                        <button
                            onClick={handleArchive}
                            disabled={archiving}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${project.is_archived
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                } disabled:opacity-50`}
                        >
                            {project.is_archived ? (
                                <>
                                    <ArchiveRestore size={16} />
                                    {archiving ? '...' : t('settings.unarchive')}
                                </>
                            ) : (
                                <>
                                    <Archive size={16} />
                                    {archiving ? '...' : t('settings.archive')}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Delete Action */}
                    <div className="flex items-center justify-between p-4 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{t('settings.delete_project')}</h3>
                            <p className="text-sm text-gray-500 dark:text-space-400 mt-1">
                                {t('settings.delete_description')}
                            </p>
                        </div>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            {deleting ? '...' : t('settings.delete')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectSettings;
