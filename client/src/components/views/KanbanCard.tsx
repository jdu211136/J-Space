import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User as UserIcon, Calendar, MessageSquare, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import type { Task } from '../../store/taskStore';
import clsx from 'clsx';
import { useLocalized } from '../../hooks/useLocalized';
import { PulseIndicator } from '../common/PulseIndicator';
import { useAuthStore } from '../../store/authStore';

interface Props {
    task: Task;
    onClick?: () => void;
}

export const KanbanCard = ({ task, onClick }: Props) => {
    const { user } = useAuthStore();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Get localized title from JSONB or fallback to legacy columns
    const taskTitle = useLocalized(task.title)
        || task.title_display
        || task.title_en
        || task.title_uz
        || 'Untitled Task';

    // Check if current user has an active timer on this task
    const isMyActiveTimer = task.active_timer_user_id === user?.id;

    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case 'high': return { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
            case 'mid': return { dot: 'bg-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50' };
            case 'low': return { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' };
            default: return { dot: 'bg-gray-400', text: 'text-gray-500', bg: 'bg-gray-50' };
        }
    };

    const priorityStyles = getPriorityStyles(task.priority);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={clsx(
                "bg-white p-4 rounded-xl border shadow-sm transition-all cursor-grab active:cursor-grabbing group",
                isDragging
                    ? "opacity-50 shadow-xl border-purple-400 ring-2 ring-purple-200"
                    : "border-gray-100 hover:border-purple-200 hover:shadow-md"
            )}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
        >
            {/* Project indicator */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-400 to-indigo-500" />
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Project
                </span>
                {/* Active Timer Pulse */}
                <PulseIndicator isActive={isMyActiveTimer} size="sm" className="ml-auto" />
            </div>

            {/* Task Title */}
            <h4 className={clsx(
                "font-medium text-sm mb-3 leading-snug transition-colors flex items-center gap-2",
                task.status === 'done'
                    ? "text-gray-400 line-through"
                    : "text-gray-900 group-hover:text-purple-700"
            )}>
                {taskTitle}
            </h4>

            {/* Priority Tag */}
            <div className="flex flex-wrap gap-2 mb-4">
                <span className={clsx(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                    priorityStyles.bg, priorityStyles.text
                )}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", priorityStyles.dot)} />
                    {task.priority}
                </span>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div className="flex items-center gap-3">
                    {/* Date */}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar size={12} />
                        {task.deadline ? format(new Date(task.deadline), 'MMM d') : '-'}
                    </div>

                    {/* Subtasks indicator (mock) */}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <CheckSquare size={12} />
                        <span>0/0</span>
                    </div>

                    {/* Comments indicator (mock) */}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MessageSquare size={12} />
                        <span>0</span>
                    </div>
                </div>

                {/* Assignee Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 ring-2 ring-white">
                    <UserIcon size={14} />
                </div>
            </div>
        </div>
    );
};
