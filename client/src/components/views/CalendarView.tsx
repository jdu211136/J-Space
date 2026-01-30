import { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    addMonths,
    subMonths,
    parseISO,
    isWithinInterval,
    startOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { TaskDrawer } from '../task/TaskDrawer';
import type { Task } from '../../store/taskStore';
import clsx from 'clsx';
import { toast } from 'sonner';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Project colors cycling
const getProjectColor = (projectId: number): string => {
    const colors = [
        'bg-purple-500',
        'bg-blue-500',
        'bg-green-500',
        'bg-yellow-500',
        'bg-red-500',
        'bg-pink-500',
        'bg-indigo-500',
    ];
    return colors[projectId % colors.length];
};

// Get task position within week for multi-day spanning


export const CalendarView = () => {
    const { projectId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const { tasks, isLoading, fetchTasks, updateTask } = useTasks();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    const taskId = searchParams.get('taskId');
    const selectedTask = tasks.find(t => String(t.id) === taskId) || null;

    useEffect(() => {
        if (projectId) fetchTasks(projectId);
    }, [projectId, fetchTasks]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calendarStart = startOfWeek(monthStart);
        const calendarEnd = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }, [currentMonth]);

    // Group tasks by their occurrence on each day (supporting multi-day tasks)
    const tasksByDate = useMemo(() => {
        const grouped: Record<string, Task[]> = {};

        tasks.forEach(task => {
            const startDate = task.start_date ? parseISO(task.start_date) : null;
            const endDate = task.end_date ? parseISO(task.end_date) : (task.deadline ? parseISO(task.deadline) : null);

            if (!startDate && !endDate) return;

            // For tasks with just end date (legacy)
            if (!startDate && endDate) {
                const dateKey = format(endDate, 'yyyy-MM-dd');
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(task);
                return;
            }

            // For tasks with start date only
            if (startDate && !endDate) {
                const dateKey = format(startDate, 'yyyy-MM-dd');
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(task);
                return;
            }

            // Multi-day tasks: add to each day in range
            if (startDate && endDate) {
                const days = eachDayOfInterval({
                    start: startOfDay(startDate),
                    end: startOfDay(endDate)
                });
                days.forEach(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    if (!grouped[dateKey].find(t => t.id === task.id)) {
                        grouped[dateKey].push(task);
                    }
                });
            }
        });

        return grouped;
    }, [tasks]);

    // Get task bar metadata for rendering multi-day bars
    const getTaskBarInfo = (task: Task, day: Date): { isStart: boolean; isEnd: boolean; isMiddle: boolean } => {
        const startDate = task.start_date ? startOfDay(parseISO(task.start_date)) : null;
        const endDate = task.end_date ? startOfDay(parseISO(task.end_date)) : null;
        const dayStart = startOfDay(day);

        return {
            isStart: startDate ? isSameDay(dayStart, startDate) : !startDate && !!endDate && isSameDay(dayStart, endDate),
            isEnd: endDate ? isSameDay(dayStart, endDate) : false,
            isMiddle: !!startDate && !!endDate && isWithinInterval(dayStart, { start: startDate, end: endDate }) && !isSameDay(dayStart, startDate) && !isSameDay(dayStart, endDate)
        };
    };

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const handleToday = () => setCurrentMonth(new Date());

    const handleTaskClick = (task: Task) => {
        setSearchParams({ taskId: String(task.id) });
    };

    const handleCloseDrawer = () => {
        setSearchParams({});
    };

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        if (!draggedTask) return;

        const newDeadline = format(targetDate, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

        try {
            await updateTask(draggedTask.id, {
                endDate: newDeadline,
                deadline: newDeadline
            });
            toast.success(`Task rescheduled to ${format(targetDate, 'MMM d')}`);
        } catch {
            toast.error('Failed to reschedule task');
        }

        setDraggedTask(null);
    };

    const handleDragEnd = () => {
        setDraggedTask(null);
    };

    if (isLoading && tasks.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Loading calendar...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="h-full flex flex-col font-inter bg-white dark:bg-space-900 rounded-xl shadow-sm border border-gray-100 dark:border-space-700 overflow-hidden">
                {/* Calendar Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-space-700">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h2>
                        <button
                            onClick={handleToday}
                            className="px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                        >
                            Today
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-space-800 rounded-lg transition-colors">
                            <ChevronLeft size={20} className="text-gray-600 dark:text-space-400" />
                        </button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-space-800 rounded-lg transition-colors">
                            <ChevronRight size={20} className="text-gray-600 dark:text-space-400" />
                        </button>
                    </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-gray-100 dark:border-space-700">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 dark:text-space-400 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-hidden">
                    {calendarDays.map((day, index) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayTasks = tasksByDate[dateKey] || [];
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isCurrentDay = isToday(day);

                        return (
                            <div
                                key={index}
                                className={clsx(
                                    "border-r border-b border-gray-50 dark:border-space-800 p-1 min-h-[100px] transition-colors relative",
                                    !isCurrentMonth && "bg-gray-50/50 dark:bg-space-950/50",
                                    draggedTask && "hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                )}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, day)}
                            >
                                {/* Day Number */}
                                <div className={clsx(
                                    "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full mx-auto",
                                    isCurrentDay
                                        ? "bg-purple-600 text-white"
                                        : isCurrentMonth
                                            ? "text-gray-900 dark:text-white"
                                            : "text-gray-400 dark:text-space-500"
                                )}>
                                    {format(day, 'd')}
                                </div>

                                {/* Task Bars with multi-day support */}
                                <div className="space-y-0.5 overflow-hidden">
                                    {dayTasks.slice(0, 4).map(task => {
                                        const { isStart, isEnd, isMiddle } = getTaskBarInfo(task, day);

                                        return (
                                            <div
                                                key={`${task.id}-${dateKey}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task)}
                                                onDragEnd={handleDragEnd}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTaskClick(task);
                                                }}
                                                className={clsx(
                                                    "py-1 text-[10px] text-white font-medium cursor-pointer transition-all hover:opacity-80 truncate",
                                                    getProjectColor(task.project_id),
                                                    task.status === 'done' && "opacity-50",
                                                    // Multi-day bar styling
                                                    isStart && !isEnd && "rounded-l pl-1.5 pr-0 -mr-1",
                                                    isEnd && !isStart && "rounded-r pr-1.5 pl-0 -ml-1",
                                                    isStart && isEnd && "rounded px-1.5",
                                                    isMiddle && "px-0 -mx-1",
                                                    !isStart && !isEnd && !isMiddle && "rounded px-1.5"
                                                )}
                                            >
                                                {(isStart || (!isStart && !isEnd && !isMiddle)) && (
                                                    <span className={clsx(task.status === 'done' && "line-through")}>
                                                        {task.title_display || task.title_en || task.title_uz}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {dayTasks.length > 4 && (
                                        <div className="text-[9px] text-gray-500 dark:text-space-400 font-medium text-center">
                                            +{dayTasks.length - 4} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
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
