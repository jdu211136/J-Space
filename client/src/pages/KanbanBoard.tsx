import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { Modal, Box, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Components for Kanban ---

import { useLocalized } from '../hooks/useLocalized';
import { TaskDetailDrawer } from '../components/project/TaskDetailDrawer';

const SortableItem = ({ id, task, onTaskClick }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    // Dynamic Title Localization
    const title = useLocalized(task.title);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleClick = (e: React.MouseEvent) => {
        // Only trigger if not dragging
        if (e.detail === 1) {
            onTaskClick?.(task);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleClick}
            className="bg-white dark:bg-space-800 p-4 rounded-xl border border-gray-200 dark:border-space-700 mb-3 shadow-sm hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors cursor-pointer"
        >
            <h4 className="text-gray-900 dark:text-white font-medium mb-1">{title || task.title_display}</h4>
            <div className="flex justify-between items-center mt-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                    task.priority === 'mid' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                    {task.priority}
                </span>
                <span className="text-xs text-gray-500 dark:text-space-400">{new Date(task.deadline).toLocaleDateString()}</span>
            </div>
        </div>
    );
};

const Column = ({ id, title, tasks, onTaskClick }: any) => {
    const { t } = useTranslation();
    return (
        <div className="bg-gray-50 dark:bg-space-900 border border-gray-200 dark:border-space-700 rounded-2xl p-4 flex flex-col h-full min-h-[500px]">
            <h3 className="text-gray-600 dark:text-space-400 font-medium mb-4 flex justify-between items-center">
                {title}
                <span className="bg-gray-200 dark:bg-space-800 text-gray-600 dark:text-space-400 text-xs px-2 py-1 rounded-full">{tasks.length}</span>
            </h3>
            <SortableContext id={id} items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 flex flex-col">
                    {tasks.length === 0 && (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-space-700 rounded-xl text-gray-400 dark:text-space-500 text-sm min-h-[100px]">
                            {t('kanban.drop_placeholder')}
                        </div>
                    )}
                    {tasks.map((task: any) => (
                        <SortableItem key={task.id} id={task.id} task={task} onTaskClick={onTaskClick} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

// --- Main Kanban Board ---

const taskSchema = z.object({
    titleUz: z.string().optional(),
    titleJp: z.string().optional(),
    titleEn: z.string().optional(),
    deadline: z.string().min(1, 'Deadline is required'),
    priority: z.enum(['low', 'mid', 'high']),
}).refine(data => data.titleUz || data.titleJp || data.titleEn, {
    message: "At least one title is required",
    path: ["titleUz"],
});

type TaskForm = z.infer<typeof taskSchema>;

const KanbanBoard = () => {
    const { projectId } = useParams();
    const { t } = useTranslation();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TaskForm>({
        resolver: zodResolver(taskSchema),
        defaultValues: { priority: 'mid' }
    });

    const fetchTasks = async () => {
        try {
            const response = await api.get(`/tasks/project/${projectId}`);
            setTasks(response.data.tasks);
        } catch (error) {
            toast.error(t('errors.load_tasks'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [projectId]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Find the task
        const task = tasks.find(t => t.id === activeId);
        if (!task) return;

        // Determine new status
        // Check if dropped on a column container
        let newStatus = overId;
        const validStatuses = ['todo', 'in_progress', 'done', 'reviewed'];

        // If dropped on another task, find that task's status
        if (!validStatuses.includes(newStatus as string)) {
            const overTask = tasks.find(t => t.id === overId);
            if (overTask) {
                newStatus = overTask.status;
            } else {
                return; // Invalid drop
            }
        }

        if (task.status !== newStatus) {
            // Optimistic update
            const oldStatus = task.status;
            setTasks(tasks.map(t => t.id === activeId ? { ...t, status: newStatus } : t));

            try {
                await api.patch(`/tasks/${activeId}/status`, { status: newStatus });
            } catch (error) {
                // Revert
                setTasks(tasks.map(t => t.id === activeId ? { ...t, status: oldStatus } : t));
                toast.error(t('errors.update_status'));
            }
        }
    };

    const onSubmit = async (data: TaskForm) => {
        try {
            await api.post('/tasks', {
                ...data,
                projectId,
                deadline: new Date(data.deadline).toISOString(),
            });
            toast.success(t('toasts.task_created'));
            setCreateOpen(false);
            reset();
            fetchTasks();
        } catch (error) {
            toast.error(t('errors.create_task'));
        }
    };

    const columns = ['todo', 'in_progress', 'done', 'reviewed'];

    if (loading) return <div>{t('my_tasks.loading')}</div>;

    return (
        <div className="h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('common.projects')}</h2>
                <button
                    onClick={() => setCreateOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
                >
                    <Plus size={18} /> {t('actions.new_task')}
                </button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full items-start">
                    {columns.map(status => (
                        <Column
                            key={status}
                            id={status}
                            title={t(`kanban.${status}`)}
                            tasks={tasks.filter(t => t.status === status)}
                            onTaskClick={(task: any) => setSelectedTask(task)}
                        />
                    ))}
                </div>
            </DndContext>

            <Modal
                open={isCreateOpen}
                onClose={() => setCreateOpen(false)}
            >
                <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-space-900 rounded-2xl border border-gray-200 dark:border-space-700 p-8 shadow-2xl outline-none">
                    <Typography variant="h6" className="text-gray-900 dark:text-white !font-bold !mb-6">{t('actions.create_task')}</Typography>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <input {...register('titleUz')} placeholder={t('project.title_uz')} className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-space-950 border border-gray-200 dark:border-space-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-space-500 outline-none" />
                            <input {...register('titleJp')} placeholder={t('project.title_jp')} className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-space-950 border border-gray-200 dark:border-space-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-space-500 outline-none" />
                            <input {...register('titleEn')} placeholder={t('project.title_en')} className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-space-950 border border-gray-200 dark:border-space-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-space-500 outline-none" />
                        </div>
                        {errors.titleUz && <p className="text-xs text-red-400">{errors.titleUz.message}</p>}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-space-400 mb-1">{t('task_form.deadline')}</label>
                                <input type="datetime-local" {...register('deadline')} className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-space-950 border border-gray-200 dark:border-space-700 text-gray-900 dark:text-white outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-space-400 mb-1">{t('task_form.priority')}</label>
                                <select {...register('priority')} className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-space-950 border border-gray-200 dark:border-space-700 text-gray-900 dark:text-white outline-none">
                                    <option value="low">{t('priority.low')}</option>
                                    <option value="mid">{t('priority.mid')}</option>
                                    <option value="high">{t('priority.high')}</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg mt-4">{isSubmitting ? '...' : t('actions.create_task')}</button>
                    </form>
                </Box>
            </Modal>

            {/* Task Detail Drawer */}
            <TaskDetailDrawer
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                onUpdate={fetchTasks}
            />
        </div>
    );
};

export default KanbanBoard;
