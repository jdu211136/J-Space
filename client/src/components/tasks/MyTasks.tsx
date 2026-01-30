import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLocalizedString } from '../../hooks/useLocalized';
import { PulseIndicator } from '../common/PulseIndicator';
import { Circle, CheckCircle2, Plus, Flag, User as UserIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { isToday, isBefore, isAfter, startOfToday, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useProjects } from '../../store/projectStore';
import { TaskDrawer } from '../task/TaskDrawer';
import type { Task } from '../../store/taskStore';
import { toast } from 'sonner';

type FilterType = 'all' | 'assigned' | 'delegated' | 'private';

interface TaskWithProject extends Task {
    project?: {
        id: string | number;
        title_uz?: string;
        title_en?: string;
        title_jp?: string;
        color_code?: string;
    };
}

const MyTasks = () => {
    const { user } = useAuthStore();
    const { projects } = useProjects();
    const { i18n, t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [tasks, setTasks] = useState<TaskWithProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        overdue: true,
        today: true,
        upcoming: true,
        noDate: true,
    });
    const [creatingGroups, setCreatingGroups] = useState<Record<string, boolean>>({});
    const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const taskId = searchParams.get('taskId');
    const selectedTask = tasks.find(t => String(t.id) === taskId) || null;

    // Fetch all tasks across all projects
    useEffect(() => {
        const fetchAllTasks = async () => {
            setIsLoading(true);
            try {
                const allTasks: TaskWithProject[] = [];

                for (const project of projects) {
                    try {
                        const res = await api.get(`/tasks/project/${project.id}`);
                        const projectTasks = (res.data.tasks || []).map((task: Task) => ({
                            ...task,
                            project: {
                                id: project.id,
                                title_uz: project.title_uz,
                                title_en: project.title_en,
                                title_jp: project.title_jp,
                                color_code: project.color_code,
                            },
                        }));
                        allTasks.push(...projectTasks);
                    } catch (err) {
                        console.error(`Failed to fetch tasks for project ${project.id}`);
                    }
                }

                setTasks(allTasks);
            } catch (err) {
                toast.error('Failed to load tasks');
            } finally {
                setIsLoading(false);
            }
        };

        if (projects.length > 0) {
            fetchAllTasks();
        } else {
            setIsLoading(false);
        }
    }, [projects]);

    // Filter tasks based on active filter
    const filteredTasks = useMemo(() => {
        if (!user) return tasks;

        switch (activeFilter) {
            case 'assigned':
                // Match tasks where user is responsible OR is a collaborator
                return tasks.filter(t => {
                    const isResponsible = t.assigned_to === user.id;
                    const isCollaborator = (t as any).collaborators?.some(
                        (c: { user_id: string }) => c.user_id === user.id
                    );
                    return isResponsible || isCollaborator;
                });
            case 'delegated':
                // Tasks assigned to others (not me and not null)
                return tasks.filter(t => t.assigned_to && t.assigned_to !== user.id);
            case 'private':
                // Tasks without assignee (private/personal)
                return tasks.filter(t => !t.assigned_to);
            default:
                return tasks;
        }
    }, [tasks, activeFilter, user]);

    // Group tasks by date
    const groupedTasks = useMemo(() => {
        const groups: Record<string, TaskWithProject[]> = {
            overdue: [],
            today: [],
            upcoming: [],
            noDate: [],
        };

        const now = new Date();
        const today = startOfToday();

        filteredTasks.forEach(task => {
            const endDate = task.end_date || task.deadline;

            if (!endDate) {
                groups.noDate.push(task);
                return;
            }

            const date = parseISO(endDate);

            if (isBefore(date, now) && task.status !== 'done') {
                groups.overdue.push(task);
            } else if (isToday(date)) {
                groups.today.push(task);
            } else if (isAfter(date, today)) {
                groups.upcoming.push(task);
            } else {
                groups.today.push(task);
            }
        });

        return groups;
    }, [filteredTasks]);

    const handleTaskClick = (task: Task) => {
        setSearchParams({ taskId: String(task.id) });
    };

    const handleCloseDrawer = async () => {
        setSearchParams({});
        // Refresh tasks after drawer closes to sync any changes
        setIsLoading(true);
        try {
            const allTasks: TaskWithProject[] = [];
            for (const project of projects) {
                try {
                    const res = await api.get(`/tasks/project/${project.id}`);
                    const projectTasks = (res.data.tasks || []).map((task: Task) => ({
                        ...task,
                        project: {
                            id: project.id,
                            title_uz: project.title_uz,
                            title_en: project.title_en,
                            title_jp: project.title_jp,
                            color_code: project.color_code,
                        },
                    }));
                    allTasks.push(...projectTasks);
                } catch (err) {
                    console.error(`Failed to fetch tasks for project ${project.id}`);
                }
            }
            setTasks(allTasks);
        } catch (err) {
            // Silent fail on refresh
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckboxClick = async (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus = task.status === 'done' ? 'todo' : 'done';

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === task.id ? { ...t, status: newStatus } : t
        ));

        try {
            await api.patch(`/tasks/${task.id}`, { status: newStatus });
            toast.success(newStatus === 'done' ? 'Task completed' : 'Task reopened');
        } catch {
            // Rollback
            setTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: task.status } : t
            ));
            toast.error('Failed to update task');
        }
    };

    const handleQuickAddClick = (groupKey: string) => {
        setCreatingGroups(prev => ({ ...prev, [groupKey]: true }));
        setTimeout(() => {
            inputRefs.current[groupKey]?.focus();
        }, 0);
    };

    const handleQuickAddKeyDown = async (groupKey: string, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newTaskTitles[groupKey]?.trim()) {
            const title = newTaskTitles[groupKey].trim();
            setNewTaskTitles(prev => ({ ...prev, [groupKey]: '' }));
            setCreatingGroups(prev => ({ ...prev, [groupKey]: false }));

            // Determine date based on group
            let endDate: Date | null = null;
            const now = new Date();

            if (groupKey === 'overdue') {
                endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
            } else if (groupKey === 'today') {
                endDate = now;
            } else if (groupKey === 'upcoming') {
                endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next week
            }

            // Find first project to assign task to
            const firstProject = projects[0];
            if (!firstProject) {
                toast.error('No projects available');
                return;
            }

            // Optimistic update
            const tempTask: TaskWithProject = {
                id: Date.now(), // Temporary ID
                title_uz: title,
                title_en: title,
                status: 'todo',
                priority: 'mid',
                project_id: firstProject.id,
                start_date: null,
                end_date: endDate?.toISOString() || null,
                deadline: endDate?.toISOString() || null,
                assigned_to: user?.id,
                created_at: new Date().toISOString(),
                project: {
                    id: firstProject.id,
                    title_uz: firstProject.title_uz,
                    title_en: firstProject.title_en,
                    color_code: firstProject.color_code,
                },
            };

            setTasks(prev => [...prev, tempTask]);

            try {
                const res = await api.post('/tasks', {
                    projectId: firstProject.id,
                    titleUz: title,
                    titleEn: title,
                    deadline: endDate?.toISOString(),
                    priority: 'mid',
                    assignedTo: user?.id,
                });

                // Replace temp task with real one
                const createdTask = res.data.task || res.data;
                setTasks(prev => prev.map(t =>
                    t.id === tempTask.id ? { ...createdTask, project: tempTask.project } : t
                ));
                toast.success('Task created');
            } catch {
                // Remove temp task on error
                setTasks(prev => prev.filter(t => t.id !== tempTask.id));
                toast.error('Failed to create task');
            }
        } else if (e.key === 'Escape') {
            setCreatingGroups(prev => ({ ...prev, [groupKey]: false }));
            setNewTaskTitles(prev => ({ ...prev, [groupKey]: '' }));
        }
    };

    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const getProjectName = (task: TaskWithProject) => {
        if (!task.project) return 'Unknown';
        return task.project.title_en || task.project.title_uz || 'Project';
    };

    const getProjectColor = (task: TaskWithProject) => {
        return task.project?.color_code || '#6366f1';
    };

    const getTaskDisplayName = (task: TaskWithProject) => {
        if (task.title) {
            return getLocalizedString(task.title, i18n.language as any);
        }
        return task.title_display || task.title_en || task.title_uz || 'Untitled';
    };

    const formatTaskId = (id: number | string) => {
        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
        return `#${String(numId).padStart(4, '0')}`;
    };

    const getStatusBadge = (status: Task['status']) => {
        return (
            <span
                className={clsx(
                    'px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                    status === 'todo' && "bg-gray-100 dark:bg-space-800 text-gray-700 dark:text-space-300",
                    status === 'in_progress' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                    status === 'reviewed' && "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
                    status === 'done' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                )}
            >
                {(status || 'todo').replace('_', ' ').toUpperCase()}
            </span>
        );
    };


    const getPriorityIcon = (priority: Task['priority']) => {
        const colors = {
            high: 'text-red-500',
            mid: 'text-orange-500',
            low: 'text-blue-500',
        };
        return <Flag size={14} className={colors[priority]} fill="currentColor" fillOpacity={0.2} />;
    };

    const GroupSection = ({ groupKey, title, tasks: groupTasks, color }: { groupKey: string; title: string; tasks: TaskWithProject[]; color?: string }) => {
        const isExpanded = expandedGroups[groupKey];
        const isCreating = creatingGroups[groupKey];

        return (
            <div className="mb-6">
                <button
                    onClick={() => toggleGroup(groupKey)}
                    className={clsx(
                        "w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors mb-2",
                        color === 'red' ? "text-[#FF4D4F] hover:bg-red-50 dark:hover:bg-red-900/20" : "text-gray-500 dark:text-space-400 hover:bg-gray-50 dark:hover:bg-space-800"
                    )}
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {title}
                    <span className={clsx(
                        "ml-2 px-1.5 py-0.5 rounded-full text-[10px]",
                        color === 'red' ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-gray-100 dark:bg-space-700 text-gray-500 dark:text-space-400"
                    )}>
                        {groupTasks.length}
                    </span>
                </button>

                {isExpanded && (
                    <div className="border border-gray-100 dark:border-space-700 rounded-lg overflow-hidden bg-white dark:bg-space-900">
                        {groupTasks.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-300 dark:text-space-500">
                                {t('my_tasks.no_tasks')}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-space-800">
                                {groupTasks.map(task => {
                                    const isCompleted = task.status === 'done';
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleTaskClick(task)}
                                            className="grid grid-cols-[40px_1fr_140px_180px_140px_100px_80px] gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-space-800 transition-colors cursor-pointer items-center group text-sm"
                                        >
                                            {/* Checkbox */}
                                            <div className="flex items-center justify-center">
                                                <motion.button
                                                    onClick={(e) => handleCheckboxClick(task, e)}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="focus:outline-none"
                                                >
                                                    {isCompleted ? (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                        >
                                                            <CheckCircle2 size={20} className="text-purple-600" fill="currentColor" />
                                                        </motion.div>
                                                    ) : (
                                                        <Circle size={20} className="text-gray-300 group-hover:text-purple-500 transition-colors" />
                                                    )}
                                                </motion.button>
                                            </div>

                                            {/* Task Name */}
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className={clsx(
                                                        "font-medium text-gray-900 dark:text-gray-100 truncate",
                                                        isCompleted && "line-through opacity-50"
                                                    )}
                                                >
                                                    {getTaskDisplayName(task)}
                                                </span>
                                                <PulseIndicator
                                                    isActive={task.active_timer_user_id === user?.id}
                                                    size="sm"
                                                />
                                            </div>

                                            {/* ID */}
                                            <div className="text-xs text-gray-400 font-mono">
                                                {formatTaskId(task.id)}
                                            </div>

                                            {/* Assignee */}
                                            <div className="flex items-center gap-2">
                                                {task.assigned_to ? (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-space-800 shadow-sm">
                                                        {user?.id === task.assigned_to ? (user.full_name?.charAt(0) || 'U') : '?'}
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-space-700 flex items-center justify-center">
                                                        <UserIcon size={14} className="text-gray-400 dark:text-space-400" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Project */}
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className="w-4 h-4 rounded flex-shrink-0"
                                                    style={{ backgroundColor: getProjectColor(task) }}
                                                />
                                                <span className="text-xs text-gray-600 dark:text-space-400 truncate">
                                                    {getProjectName(task)}
                                                </span>
                                            </div>

                                            {/* Status */}
                                            <div>
                                                {getStatusBadge(task.status)}
                                            </div>

                                            {/* Priority */}
                                            <div className="flex items-center gap-1">
                                                {getPriorityIcon(task.priority)}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Quick Add Row */}
                                <div
                                    className={clsx(
                                        "px-4 py-3 border-t border-gray-100 dark:border-space-700",
                                        isCreating ? "bg-purple-50 dark:bg-purple-900/20" : "hover:bg-gray-50 dark:hover:bg-space-800 cursor-pointer transition-colors"
                                    )}
                                    onClick={() => !isCreating && handleQuickAddClick(groupKey)}
                                >
                                    {isCreating ? (
                                        <input
                                            ref={(el) => { inputRefs.current[groupKey] = el; }}
                                            type="text"
                                            value={newTaskTitles[groupKey] || ''}
                                            onChange={(e) => setNewTaskTitles(prev => ({ ...prev, [groupKey]: e.target.value }))}
                                            onKeyDown={(e) => handleQuickAddKeyDown(groupKey, e)}
                                            onBlur={() => {
                                                if (!newTaskTitles[groupKey]?.trim()) {
                                                    setCreatingGroups(prev => ({ ...prev, [groupKey]: false }));
                                                }
                                            }}
                                            placeholder={t('my_tasks.quick_add_placeholder')}
                                            className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-500 bg-white dark:bg-space-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Plus size={16} className="text-gray-400" />
                                            <span>{t('my_tasks.quick_add')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">{t('my_tasks.loading')}</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="h-full flex flex-col bg-white dark:bg-space-950 font-inter">
                {/* Header with Filters */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-space-800 shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('my_tasks.title')}</h1>
                        <p className="text-sm text-gray-500 dark:text-space-400">{t('my_tasks.subtitle')}</p>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex items-center gap-2">
                        {(['all', 'assigned', 'delegated', 'private'] as FilterType[]).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                                    activeFilter === filter
                                        ? "bg-purple-600 text-white shadow-sm"
                                        : "bg-gray-100 dark:bg-space-800 text-gray-600 dark:text-space-400 hover:bg-gray-200 dark:hover:bg-space-700"
                                )}
                            >
                                {t(`my_tasks.tabs.${filter}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sticky Table Header */}
                <div className="sticky top-0 z-10 bg-white dark:bg-space-950 border-b border-gray-100 dark:border-space-800 px-8 py-3 shrink-0">
                    <div className="grid grid-cols-[40px_1fr_140px_180px_140px_100px_80px] gap-4 text-xs font-semibold text-gray-500 dark:text-space-400 uppercase tracking-wider">
                        <div></div>
                        <div>{t('columns.name')}</div>
                        <div>{t('columns.id')}</div>
                        <div>{t('columns.assignee')}</div>
                        <div>{t('columns.project')}</div>
                        <div>{t('columns.status')}</div>
                        <div>{t('columns.priority')}</div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                    <GroupSection groupKey="overdue" title={t('my_tasks.groups.overdue').toUpperCase()} tasks={groupedTasks.overdue} color="red" />
                    <GroupSection groupKey="today" title={t('my_tasks.groups.today').toUpperCase()} tasks={groupedTasks.today} />
                    <GroupSection groupKey="upcoming" title={t('my_tasks.groups.upcoming').toUpperCase()} tasks={groupedTasks.upcoming} />
                    <GroupSection groupKey="noDate" title={t('my_tasks.groups.no_date').toUpperCase()} tasks={groupedTasks.noDate} />
                </div>
            </div>

            {/* Task Drawer */}
            <TaskDrawer
                task={selectedTask}
                isOpen={!!taskId}
                onClose={handleCloseDrawer}
            />
        </>
    );
};

export default MyTasks;
