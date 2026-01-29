import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    type DragEndEvent,
    type DragStartEvent,
    useDroppable
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { KanbanCard } from './KanbanCard';
import { TaskDrawer } from '../task/TaskDrawer';
import type { Task } from '../../store/taskStore';
import clsx from 'clsx';
import { toast } from 'sonner';

// Status columns with exact backend ENUM values
const COLUMNS = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-200' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-200' },
    { id: 'done', title: 'Done', color: 'bg-green-200' },
    { id: 'reviewed', title: 'Reviewed', color: 'bg-purple-200' }
] as const;

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'reviewed';

// Droppable Column Component
const DroppableColumn = ({ id, children }: { id: string; children: React.ReactNode }) => {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "flex-1 flex flex-col gap-3 min-h-[300px] p-3 rounded-xl transition-colors",
                isOver ? "bg-purple-50 ring-2 ring-purple-200" : "bg-gray-50/50"
            )}
        >
            {children}
        </div>
    );
};

export const BoardView = () => {
    const { projectId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const { tasks, isLoading, fetchTasks, updateTask } = useTasks();
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Get taskId from URL
    const taskId = searchParams.get('taskId');
    const selectedTask = tasks.find(t => String(t.id) === taskId) || null;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (projectId) fetchTasks(projectId);
    }, [projectId, fetchTasks]);

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks.find(t => t.id === event.active.id);
        setActiveTask(task || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveTask(null);

        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as number;
        const overId = over.id as string;

        // Determine the new status
        let newStatus: TaskStatus;

        // Check if dropped on a column
        const columnMatch = COLUMNS.find(c => c.id === overId);
        if (columnMatch) {
            newStatus = columnMatch.id;
        } else {
            // Dropped on another task - get that task's status
            const overTask = tasks.find(t => t.id === parseInt(overId));
            if (overTask) {
                newStatus = overTask.status;
            } else {
                return; // Invalid drop target
            }
        }

        const task = tasks.find(t => t.id === activeId);
        if (!task || task.status === newStatus) return;

        // Optimistic update with rollback
        try {
            await updateTask(activeId, { status: newStatus });
            toast.success(`Task moved to ${COLUMNS.find(c => c.id === newStatus)?.title}`);
        } catch {
            toast.error('Failed to update task status');
        }
    };

    const handleDragCancel = () => {
        setActiveTask(null);
    };

    const handleCardClick = (task: Task) => {
        setSearchParams({ taskId: String(task.id) });
    };

    const handleCloseDrawer = () => {
        setSearchParams({});
    };

    if (isLoading && tasks.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Loading tasks...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="h-full flex flex-col font-inter">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full items-start overflow-x-auto pb-6">
                        {COLUMNS.map(column => {
                            const columnTasks = tasks.filter(t => t.status === column.id);

                            return (
                                <div key={column.id} className="flex flex-col min-w-[280px] h-full">
                                    {/* Column Header */}
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <div className="flex items-center gap-2">
                                            <div className={clsx("w-2 h-2 rounded-full", column.color)} />
                                            <h3 className="text-sm font-semibold text-gray-700">
                                                {column.title}
                                            </h3>
                                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                                                {columnTasks.length}
                                            </span>
                                        </div>
                                        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                                            <Plus size={14} className="text-gray-400 hover:text-purple-600" />
                                        </button>
                                    </div>

                                    {/* Droppable Column */}
                                    <SortableContext
                                        id={column.id}
                                        items={columnTasks.map(t => t.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <DroppableColumn id={column.id}>
                                            {columnTasks.length === 0 ? (
                                                <div className="text-center py-8 text-gray-400 text-sm">
                                                    Drop tasks here
                                                </div>
                                            ) : (
                                                columnTasks.map(task => (
                                                    <KanbanCard
                                                        key={task.id}
                                                        task={task}
                                                        onClick={() => handleCardClick(task)}
                                                    />
                                                ))
                                            )}
                                        </DroppableColumn>
                                    </SortableContext>
                                </div>
                            );
                        })}
                    </div>

                    {/* Drag Overlay */}
                    <DragOverlay>
                        {activeTask && (
                            <div className="opacity-90 rotate-3">
                                <KanbanCard task={activeTask} />
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
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
