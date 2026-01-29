import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, List, Layout, Calendar, Plus } from 'lucide-react';
import { useCurrentProject } from '../../context/CurrentProjectContext';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { CreateTaskDialog } from './CreateTaskDialog';
import { getLocalizedContent } from '../../utils/getLocalized';

interface Props {
    viewMode: 'list' | 'board' | 'calendar';
    onViewChange: (mode: 'list' | 'board' | 'calendar') => void;
}

const TABS = [
    { id: 'tasks', label: 'Tasks', path: 'tasks' },
    { id: 'overview', label: 'Overview', path: 'overview' },
    { id: 'documents', label: 'Documents', path: 'documents' },
    { id: 'settings', label: 'Settings', path: 'settings' },
];

export const ProjectHeader = ({ viewMode, onViewChange }: Props) => {
    const { project, isLoading } = useCurrentProject();
    const location = useLocation();
    const { i18n, t } = useTranslation();
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

    const getTitle = () => {
        if (!project) return 'Project';

        // Check for JSONB name field first (new format)
        if (project.name && typeof project.name === 'object') {
            return getLocalizedContent(project.name, i18n.language) || 'Untitled Project';
        }

        // Fallback to legacy columns
        if (i18n.language === 'jp' && project.title_jp) return project.title_jp;
        if (i18n.language === 'en' && project.title_en) return project.title_en;
        return project.title_uz || project.title_en || 'Untitled Project';
    };

    const isTasksTab = location.pathname.includes('/tasks');

    // Get icon background color from project
    const getIconStyles = () => {
        if (!project?.color_code) return { backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' };
        const hex = project.color_code;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`, color: hex };
    };

    return (
        <div className="px-8 pt-6 bg-white dark:bg-space-950 border-b border-gray-100 dark:border-space-700 transition-colors">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-space-400 mb-4">
                <NavLink to="/projects" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    {t('common.projects')}
                </NavLink>
                <ChevronRight size={12} />
                <span className="text-gray-900 dark:text-white font-medium">
                    {isLoading ? (
                        <span className="inline-block w-24 h-3 bg-gray-200 dark:bg-space-700 rounded animate-pulse" />
                    ) : (
                        getTitle()
                    )}
                </span>
            </div>

            {/* Title & View Switcher */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    {/* Project Icon */}
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                        style={getIconStyles()}
                    >
                        {getTitle().charAt(0).toUpperCase()}
                    </div>

                    {/* Title */}
                    {isLoading ? (
                        <div className="w-48 h-8 bg-gray-200 dark:bg-space-700 rounded animate-pulse" />
                    ) : (
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {getTitle()}
                        </h1>
                    )}
                </div>

                {/* Actions & View Switcher - Only on Tasks Tab */}
                {isTasksTab && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsCreateTaskOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm text-sm font-medium transition-colors"
                        >
                            <Plus size={16} />
                            <span>{t('actions.new_task')}</span>
                        </button>

                        <div className="flex bg-gray-100 dark:bg-space-800 p-0.5 rounded-lg border border-gray-200/50 dark:border-space-700">
                            <ViewToggle
                                icon={<List size={16} />}
                                label={t('project.views.list')}
                                active={viewMode === 'list'}
                                onClick={() => onViewChange('list')}
                            />
                            <ViewToggle
                                icon={<Layout size={16} />}
                                label={t('project.views.board')}
                                active={viewMode === 'board'}
                                onClick={() => onViewChange('board')}
                            />
                            <ViewToggle
                                icon={<Calendar size={16} />}
                                label={t('project.views.calendar')}
                                active={viewMode === 'calendar'}
                                onClick={() => onViewChange('calendar')}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-8">
                {TABS.map(tab => (
                    <NavLink
                        key={tab.id}
                        to={tab.path}
                        className={({ isActive }) => clsx(
                            "pb-3 text-sm font-medium border-b-2 transition-colors",
                            isActive
                                ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                                : 'border-transparent text-gray-500 dark:text-space-400 hover:text-gray-800 dark:hover:text-white hover:border-gray-200 dark:hover:border-space-600'
                        )}
                    >
                        {t(`project.tabs.${tab.id}`)}
                    </NavLink>
                ))}
            </div>

            <CreateTaskDialog
                isOpen={isCreateTaskOpen}
                onClose={() => setIsCreateTaskOpen(false)}
            />
        </div>
    );
};

// View Toggle Button
const ViewToggle = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            active
                ? "bg-white dark:bg-space-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-space-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-space-700"
        )}
    >
        {icon}
        <span className="hidden xl:inline">{label}</span>
    </button>
);
