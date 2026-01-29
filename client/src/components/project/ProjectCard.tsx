import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, AlertCircle, CheckCircle2, Folder, Lock, Globe } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

interface Project {
    id: string | number;
    title_uz?: string;
    title_jp?: string;
    title_en?: string;
    name?: { en?: string; uz?: string; ja?: string };
    description_uz?: string;
    description_jp?: string;
    description_en?: string;
    category: string;
    color_code: string;
    is_public: boolean;
    is_starred?: boolean;
    is_archived?: boolean;
    total_tasks?: number;
    completed_tasks?: number;
    overdue_tasks?: number;
    team_avatars?: string[] | null;
    created_at: string;
}

interface ProjectCardProps {
    project: Project;
    onStarToggle?: (projectId: string | number, newStarred: boolean) => void;
}

export const ProjectCard = ({ project, onStarToggle }: ProjectCardProps) => {
    const { i18n } = useTranslation();
    const [isStarred, setIsStarred] = useState(project.is_starred || false);
    const [toggling, setToggling] = useState(false);

    const getTitle = () => {
        // Check for JSONB name field first
        if (project.name && typeof project.name === 'object') {
            const lang = i18n.language === 'jp' ? 'ja' : i18n.language;
            return project.name[lang as keyof typeof project.name] || project.name.en || project.name.uz || 'Project';
        }
        // Fallback to legacy columns
        if (i18n.language === 'jp' && project.title_jp) return project.title_jp;
        if (i18n.language === 'en' && project.title_en) return project.title_en;
        return project.title_uz || project.title_en || 'Project';
    };

    const getDescription = () => {
        if (i18n.language === 'jp' && project.description_jp) return project.description_jp;
        if (i18n.language === 'en' && project.description_en) return project.description_en;
        return project.description_uz || project.description_en || '';
    };

    const handleStarClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (toggling) return;

        setToggling(true);
        try {
            const res = await api.put(`/projects/${project.id}/star`);
            const newStarred = res.data.is_starred;
            setIsStarred(newStarred);
            onStarToggle?.(project.id, newStarred);
            toast.success(newStarred ? 'Project pinned' : 'Project unpinned');
        } catch (err) {
            toast.error('Failed to toggle star');
        } finally {
            setToggling(false);
        }
    };

    // Calculate progress
    const totalTasks = project.total_tasks || 0;
    const completedTasks = project.completed_tasks || 0;
    const overdueTasks = project.overdue_tasks || 0;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Team avatars (limit to 4)
    const avatars = Array.isArray(project.team_avatars) ? project.team_avatars.slice(0, 4) : [];
    const extraAvatars = Array.isArray(project.team_avatars) && project.team_avatars.length > 4
        ? project.team_avatars.length - 4
        : 0;

    return (
        <Link
            to={`/projects/${project.id}`}
            className="group bg-white dark:bg-space-900 border border-gray-200 dark:border-space-700 rounded-xl p-5 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-lg dark:hover:shadow-purple-900/20 shadow-sm flex flex-col"
        >
            {/* Header: Icon + Title + Star */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="p-2.5 rounded-xl"
                        style={{ backgroundColor: `${project.color_code}15`, color: project.color_code }}
                    >
                        <Folder size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                            {getTitle()}
                        </h3>
                        <span className="text-xs text-gray-400 dark:text-space-400 uppercase tracking-wider">
                            {project.category}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {project.is_public ? (
                        <Globe size={14} className="text-gray-400 dark:text-space-400" />
                    ) : (
                        <Lock size={14} className="text-gray-400 dark:text-space-400" />
                    )}
                    <button
                        onClick={handleStarClick}
                        disabled={toggling}
                        className={`p-1.5 rounded-lg transition-all ${isStarred
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                            }`}
                    >
                        <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
                    </button>
                </div>
            </div>

            {/* Description */}
            {getDescription() && (
                <p className="text-gray-500 dark:text-space-400 text-sm line-clamp-2 mb-4 flex-grow">
                    {getDescription()}
                </p>
            )}

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-600 dark:text-space-400 font-medium">Progress</span>
                    <span className="text-gray-500 dark:text-space-500">{completedTasks}/{totalTasks} ({progressPercent}%)</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-space-800 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${progressPercent}%`,
                            backgroundColor: progressPercent === 100 ? '#10B981' : project.color_code
                        }}
                    />
                </div>
            </div>

            {/* Stats Badges */}
            <div className="flex items-center gap-2 mb-4">
                {overdueTasks > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-xs font-medium">
                        <AlertCircle size={12} />
                        <span>{overdueTasks} Overdue</span>
                    </div>
                )}
                {totalTasks > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-space-800 text-gray-600 dark:text-space-400 rounded-md text-xs font-medium">
                        <CheckCircle2 size={12} />
                        <span>{totalTasks} Tasks</span>
                    </div>
                )}
            </div>

            {/* Footer: Team Avatars + Date */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-space-700">
                {/* Team Avatars */}
                <div className="flex items-center">
                    {avatars.length > 0 ? (
                        <div className="flex -space-x-2">
                            {avatars.map((avatar, idx) => (
                                <img
                                    key={idx}
                                    src={avatar}
                                    alt=""
                                    className="w-7 h-7 rounded-full border-2 border-white dark:border-space-900 object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=U&background=random`;
                                    }}
                                />
                            ))}
                            {extraAvatars > 0 && (
                                <div className="w-7 h-7 rounded-full border-2 border-white dark:border-space-900 bg-gray-200 dark:bg-space-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-space-400">
                                    +{extraAvatars}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400 dark:text-space-500">No team yet</span>
                    )}
                </div>
                <span className="text-xs text-gray-400 dark:text-space-500">
                    {new Date(project.created_at).toLocaleDateString()}
                </span>
            </div>
        </Link>
    );
};

export default ProjectCard;
