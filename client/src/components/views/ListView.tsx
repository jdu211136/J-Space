import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Calendar, Flag, User as UserIcon, CheckCircle2, ChevronRight, ChevronDown, Clock } from 'lucide-react';
import { format, isToday, isTomorrow, isAfter, isBefore, startOfToday, addDays, isSameDay, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useTasks } from '../../hooks/useTasks';
import { TaskDrawer } from '../task/TaskDrawer';
import type { Task } from '../../store/taskStore';
import clsx from 'clsx';
import { getLocalizedContent } from '../../utils/getLocalized';

// Format task date range for display (unchanged)
const formatDateRange = (task: Task): { text: string; isOverdue: boolean } => {
    // ... same as before
    const now = new Date();
    const startDate = task.start_date ? parseISO(task.start_date) : null;
    const endDate = task.end_date ? parseISO(task.end_date) : (task.deadline ? parseISO(task.deadline) : null);

    if (!startDate && !endDate) return { text: '-', isOverdue: false };
    const isOverdue = endDate ? isBefore(endDate, now) && task.status !== 'done' : false;

    if (!startDate && endDate) return { text: format(endDate, 'MMM d, HH:mm'), isOverdue };
    if (startDate && !endDate) return { text: format(startDate, 'MMM d, HH:mm'), isOverdue: false };

    if (startDate && endDate) {
        if (isSameDay(startDate, endDate)) {
            return { text: `${format(startDate, 'MMM d')}, ${format(startDate, 'HH:mm')} – ${format(endDate, 'HH:mm')}`, isOverdue };
        }
        return { text: `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}`, isOverdue };
    }
    return { text: '-', isOverdue: false };
};

export const ListView = () => {
    const { projectId } = useParams();
    const { t, i18n } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { tasks, isLoading, fetchTasks } = useTasks();

    const taskId = searchParams.get('taskId');
    const selectedTask = tasks.find(t => String(t.id) === taskId) || null;

    useEffect(() => {
        if (projectId) fetchTasks(projectId);
    }, [projectId, fetchTasks]);

    const groupedTasks = useMemo(() => {
        const groups: Record<string, typeof tasks> = {
            overdue: [],
            today: [],
            tomorrow: [],
            upcoming: [],
            noDate: []
        };

        const today = startOfToday();
        const tomorrow = addDays(today, 1);
        const now = new Date();

        tasks.forEach(task => {
            const endDate = task.end_date || task.deadline;

            if (!endDate) {
                groups.noDate.push(task);
                return;
            }

            const date = new Date(endDate);

            // Check overdue
            if (isBefore(date, now) && task.status !== 'done') {
                groups.overdue.push(task);
            } else if (isToday(date)) {
                groups.today.push(task);
            } else if (isTomorrow(date)) {
                groups.tomorrow.push(task);
            } else if (isAfter(date, tomorrow)) {
                groups.upcoming.push(task);
            } else {
                groups.today.push(task);
            }
        });

        return groups;
    }, [tasks]);


    const handleTaskClick = (task: Task) => {
        setSearchParams({ taskId: String(task.id) });
    };

    const handleCloseDrawer = () => {
        setSearchParams({});
    };

    if (isLoading && tasks.length === 0) {
        return <div className="p-8 text-gray-500 text-sm">{t('my_tasks.loading')}</div>;
    }

    return (
        <>
            <div className="flex flex-col h-full bg-white dark:bg-space-900 rounded-xl shadow-sm border border-gray-100 dark:border-space-700 overflow-hidden font-inter">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_120px_120px_180px_100px_80px] gap-4 px-6 py-3 border-b border-gray-100 dark:border-space-700 bg-gray-50/50 dark:bg-space-950 text-xs font-medium text-gray-500 dark:text-space-400 uppercase tracking-wider">
                    <div>{t('columns.name')}</div>
                    <div>{t('columns.assignee')}</div>
                    <div>{t('columns.status')}</div>
                    <div>{t('columns.date')}</div>
                    <div>{t('columns.priority')}</div>
                    <div></div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <TaskSection title={t('dashboard.overdue')} tasks={groupedTasks.overdue} onTaskClick={handleTaskClick} isOverdueSection currentLang={i18n.language} />
                    <TaskSection title={t('dashboard.today')} tasks={groupedTasks.today} onTaskClick={handleTaskClick} currentLang={i18n.language} />
                    <TaskSection title={t('dashboard.tomorrow')} tasks={groupedTasks.tomorrow} onTaskClick={handleTaskClick} currentLang={i18n.language} />
                    <TaskSection title={t('dashboard.upcoming')} tasks={groupedTasks.upcoming} onTaskClick={handleTaskClick} currentLang={i18n.language} />
                    <TaskSection title={t('dashboard.no_date')} tasks={groupedTasks.noDate} onTaskClick={handleTaskClick} currentLang={i18n.language} />


                </div>
            </div>

            <TaskDrawer
                task={selectedTask}
                isOpen={!!taskId}
                onClose={handleCloseDrawer}
            />
        </>
    );
};

// Task Section Component
interface TaskSectionProps {
    title: string;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    isOverdueSection?: boolean;
    currentLang: string;
}

const TaskSection = ({ title, tasks, onTaskClick, isOverdueSection, currentLang }: TaskSectionProps) => {
    const [isOpen, setIsOpen] = useState(true);

    if (tasks.length === 0 && title !== 'Today') return null;

    return (
        <div className="mb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "w-full flex items-center gap-2 px-6 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
                    isOverdueSection ? "text-red-500 bg-red-50/50 dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/30" : "text-gray-400 dark:text-space-400 hover:bg-gray-50 dark:hover:bg-space-800"
                )}
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {title}
                <span className={clsx(
                    "ml-2 px-1.5 py-0.5 rounded-full text-[10px]",
                    isOverdueSection ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" : "bg-gray-100 dark:bg-space-800 text-gray-500 dark:text-space-400"
                )}>{tasks.length}</span>
            </button>

            {isOpen && (
                <div className="divide-y divide-gray-50 dark:divide-space-800">
                    {tasks.map((task) => {
                        const { text: dateText, isOverdue } = formatDateRange(task);

                        return (
                            <div
                                key={task.id}
                                className="grid grid-cols-[1fr_120px_120px_180px_100px_80px] gap-4 px-6 py-3 hover:bg-gray-50/80 dark:hover:bg-space-800 transition-colors cursor-pointer items-center group text-sm"
                                onClick={() => onTaskClick(task)}
                            >
                                {/* Name */}
                                <div className="flex items-center gap-3 font-medium text-gray-900 dark:text-white min-w-0">
                                    <div className={clsx(
                                        "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                                        task.status === 'done' ? "bg-green-500 border-green-500 text-white" : "border-gray-300 dark:border-space-600 hover:border-purple-500"
                                    )}>
                                        {task.status === 'done' && <CheckCircle2 size={12} />}
                                    </div>
                                    <span className={clsx("truncate", task.status === 'done' && "text-gray-400 dark:text-space-500 line-through")}>
                                        {getLocalizedContent(task.title as any, currentLang) || task.title_display || task.title_en || task.title_uz}
                                    </span>
                                </div>

                                {/* Assignee */}
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-space-700 flex items-center justify-center text-gray-500 dark:text-space-400">
                                        <UserIcon size={12} />
                                    </div>
                                    <span className="text-gray-500 dark:text-space-400 text-xs truncate">Unassigned</span>
                                </div>

                                {/* Status */}
                                <div>
                                    <span className={clsx(
                                        "px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wide",
                                        task.status === 'done' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                                            task.status === 'in_progress' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                                                task.status === 'reviewed' ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "bg-gray-100 dark:bg-space-700 text-gray-700 dark:text-space-300"
                                    )}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Date - with range support */}
                                <div className={clsx(
                                    "flex items-center gap-1.5 text-xs",
                                    isOverdue ? "text-red-500 font-medium" : "text-gray-500"
                                )}>
                                    {task.start_date && task.end_date ? (
                                        <Clock size={12} />
                                    ) : (
                                        <Calendar size={12} />
                                    )}
                                    <span className="truncate">{dateText}</span>
                                </div>

                                {/* Priority */}
                                <div className="flex items-center gap-1.5">
                                    <Flag size={12} className={clsx(
                                        task.priority === 'high' ? "text-red-500" :
                                            task.priority === 'mid' ? "text-yellow-500" : "text-blue-500"
                                    )} fill="currentColor" fillOpacity={0.2} />
                                    <span className="text-xs capitalize text-gray-700 dark:text-space-300">{task.priority}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
