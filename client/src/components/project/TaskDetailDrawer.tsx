import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, User, Flag, MessageSquare, Clock, CheckCircle2, Plus, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalizedContent } from '../../utils/getLocalized';
import api from '../../services/api';
import { toast } from 'sonner';

interface TaskUser {
    id: number;
    user_id?: number;
    full_name: string;
    email: string;
    avatar_url?: string;
}

interface Task {
    id: number;
    project_id: number;
    title?: string | { en?: string; uz?: string; ja?: string };
    title_display?: string;
    description?: string | { en?: string; uz?: string; ja?: string };
    status: string;
    priority: string;
    deadline?: string;
    start_date?: string;
    end_date?: string;
    assigned_to?: number;
    assignee_name?: string;
    assignee_avatar?: string;
    collaborators?: TaskUser[];
    created_at?: string;
}

interface TaskDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    onUpdate?: () => void;
}

const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do', color: 'bg-gray-100 dark:bg-space-700 text-gray-700 dark:text-space-300' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
    { value: 'done', label: 'Done', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
];

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', color: 'bg-slate-100 dark:bg-space-700 text-slate-600 dark:text-space-400' },
    { value: 'mid', label: 'Medium', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
    { value: 'high', label: 'High', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
];

export const TaskDetailDrawer = ({ isOpen, onClose, task, onUpdate }: TaskDetailDrawerProps) => {
    const { i18n } = useTranslation();
    const [isUpdating, setIsUpdating] = useState(false);
    const [projectMembers, setProjectMembers] = useState<TaskUser[]>([]);
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
    const [showCollaboratorDropdown, setShowCollaboratorDropdown] = useState(false);
    const [localTask, setLocalTask] = useState<Task | null>(null);

    // Sync local task with prop
    useEffect(() => {
        if (task) {
            setLocalTask(task);
        }
    }, [task]);

    // Fetch project members when drawer opens
    useEffect(() => {
        if (isOpen && task?.project_id) {
            api.get(`/members/project/${task.project_id}`)
                .then(res => {
                    const members = res.data.members || res.data || [];
                    setProjectMembers(members.map((m: any) => ({
                        id: m.user_id || m.id,
                        full_name: m.full_name,
                        email: m.email,
                        avatar_url: m.avatar_url
                    })));
                })
                .catch(err => console.error('Failed to load members:', err));
        }
    }, [isOpen, task?.project_id]);

    if (!localTask) return null;

    // Get localized title
    const getTitle = () => {
        if (localTask.title && typeof localTask.title === 'object') {
            return getLocalizedContent(localTask.title, i18n.language);
        }
        return localTask.title_display || localTask.title || 'Untitled Task';
    };

    // Get localized description
    const getDescription = () => {
        if (localTask.description && typeof localTask.description === 'object') {
            return getLocalizedContent(localTask.description, i18n.language);
        }
        return typeof localTask.description === 'string' ? localTask.description : '';
    };

    const handleStatusChange = async (newStatus: string) => {
        setIsUpdating(true);
        try {
            await api.patch(`/tasks/${localTask.id}`, { status: newStatus });
            setLocalTask(prev => prev ? { ...prev, status: newStatus } : null);
            toast.success('Status updated');
            onUpdate?.();
        } catch (err) {
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handlePriorityChange = async (newPriority: string) => {
        setIsUpdating(true);
        try {
            await api.patch(`/tasks/${localTask.id}`, { priority: newPriority });
            setLocalTask(prev => prev ? { ...prev, priority: newPriority } : null);
            toast.success('Priority updated');
            onUpdate?.();
        } catch (err) {
            toast.error('Failed to update priority');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAssigneeChange = async (userId: number | null) => {
        setIsUpdating(true);
        setShowAssigneeDropdown(false);
        try {
            await api.patch(`/tasks/${localTask.id}`, { assignedTo: userId });
            const selectedUser = projectMembers.find(m => m.id === userId);
            setLocalTask(prev => prev ? {
                ...prev,
                assigned_to: userId || undefined,
                assignee_name: selectedUser?.full_name || undefined,
                assignee_avatar: selectedUser?.avatar_url || undefined
            } : null);
            toast.success(userId ? 'Assignee updated' : 'Assignee removed');
            onUpdate?.();
        } catch (err) {
            toast.error('Failed to update assignee');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddCollaborator = async (userId: number) => {
        setShowCollaboratorDropdown(false);
        try {
            await api.post(`/tasks/${localTask.id}/collaborators`, { userId, autoInvite: true });
            const selectedUser = projectMembers.find(m => m.id === userId);
            if (selectedUser) {
                setLocalTask(prev => prev ? {
                    ...prev,
                    collaborators: [...(prev.collaborators || []), {
                        id: selectedUser.id,
                        user_id: selectedUser.id,
                        full_name: selectedUser.full_name,
                        email: selectedUser.email,
                        avatar_url: selectedUser.avatar_url
                    }]
                } : null);
            }
            toast.success('Collaborator added');
            onUpdate?.();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to add collaborator');
        }
    };

    const handleRemoveCollaborator = async (userId: number) => {
        try {
            await api.delete(`/tasks/${localTask.id}/collaborators/${userId}`);
            setLocalTask(prev => prev ? {
                ...prev,
                collaborators: (prev.collaborators || []).filter(c => (c.user_id || c.id) !== userId)
            } : null);
            toast.success('Collaborator removed');
            onUpdate?.();
        } catch (err) {
            toast.error('Failed to remove collaborator');
        }
    };

    const currentStatus = STATUS_OPTIONS.find(s => s.value === localTask.status) || STATUS_OPTIONS[0];
    const currentPriority = PRIORITY_OPTIONS.find(p => p.value === localTask.priority) || PRIORITY_OPTIONS[0];
    const currentAssignee = projectMembers.find(m => m.id === localTask.assigned_to);
    const collaborators = localTask.collaborators || [];

    // Filter out already assigned/collaborator users from dropdown
    const collaboratorIds = collaborators.map(c => c.user_id || c.id);
    const availableForCollaboration = projectMembers.filter(
        m => m.id !== localTask.assigned_to && !collaboratorIds.includes(m.id)
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Drawer Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white dark:bg-space-900 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-space-700">
                            <div className="flex-1 pr-4">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                    {getTitle()}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-space-400">
                                    Task #{localTask.id}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-space-800 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-gray-500 dark:text-space-400" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Properties Grid */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-space-400 uppercase tracking-wider">
                                    Properties
                                </h3>

                                {/* Status */}
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-space-400">
                                        <CheckCircle2 size={16} />
                                        <span>Status</span>
                                    </div>
                                    <select
                                        value={localTask.status}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        disabled={isUpdating}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer ${currentStatus.color}`}
                                    >
                                        {STATUS_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Priority */}
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-space-400">
                                        <Flag size={16} />
                                        <span>Priority</span>
                                    </div>
                                    <select
                                        value={localTask.priority}
                                        onChange={(e) => handlePriorityChange(e.target.value)}
                                        disabled={isUpdating}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer ${currentPriority.color}`}
                                    >
                                        {PRIORITY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Assignee - Clickable Dropdown */}
                                <div className="flex items-center justify-between py-2 relative">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-space-400">
                                        <User size={16} />
                                        <span>Assignee</span>
                                    </div>
                                    <button
                                        onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-space-800 rounded-lg transition-colors"
                                    >
                                        {currentAssignee ? (
                                            <>
                                                {currentAssignee.avatar_url ? (
                                                    <img
                                                        src={currentAssignee.avatar_url}
                                                        alt=""
                                                        className="w-6 h-6 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-medium">
                                                        {currentAssignee.full_name[0].toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-sm text-gray-900 dark:text-white">{currentAssignee.full_name}</span>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-400 dark:text-space-500">Unassigned</span>
                                        )}
                                    </button>

                                    {/* Assignee Dropdown */}
                                    {showAssigneeDropdown && (
                                        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-space-800 border border-gray-200 dark:border-space-700 rounded-xl shadow-lg z-10 overflow-hidden">
                                            <div className="p-2 border-b border-gray-100 dark:border-space-700">
                                                <button
                                                    onClick={() => handleAssigneeChange(null)}
                                                    className="w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-space-400 hover:bg-gray-50 dark:hover:bg-space-700 rounded-lg"
                                                >
                                                    Unassign
                                                </button>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto p-2">
                                                {projectMembers.map(member => (
                                                    <button
                                                        key={member.id}
                                                        onClick={() => handleAssigneeChange(member.id)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-space-700 rounded-lg"
                                                    >
                                                        {member.avatar_url ? (
                                                            <img src={member.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium flex items-center justify-center">
                                                                {member.full_name[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span className="text-sm text-gray-900 dark:text-white">{member.full_name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Due Date */}
                                {localTask.deadline && (
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-space-400">
                                            <Calendar size={16} />
                                            <span>Due Date</span>
                                        </div>
                                        <span className="text-sm text-gray-900 dark:text-white">
                                            {new Date(localTask.deadline).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}

                                {/* Created */}
                                {localTask.created_at && (
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-space-400">
                                            <Clock size={16} />
                                            <span>Created</span>
                                        </div>
                                        <span className="text-sm text-gray-500 dark:text-space-400">
                                            {new Date(localTask.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Collaborators / Co-workers */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-gray-500 dark:text-space-400 uppercase tracking-wider flex items-center gap-2">
                                        <UserPlus size={14} />
                                        Co-workers
                                    </h3>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowCollaboratorDropdown(!showCollaboratorDropdown)}
                                            className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                        >
                                            <Plus size={14} />
                                            Add
                                        </button>

                                        {/* Collaborator Dropdown */}
                                        {showCollaboratorDropdown && (
                                            <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-space-800 border border-gray-200 dark:border-space-700 rounded-xl shadow-lg z-10 overflow-hidden">
                                                <div className="max-h-48 overflow-y-auto p-2">
                                                    {availableForCollaboration.length === 0 ? (
                                                        <p className="text-sm text-gray-400 dark:text-space-500 p-3 text-center">No members available</p>
                                                    ) : (
                                                        availableForCollaboration.map(member => (
                                                            <button
                                                                key={member.id}
                                                                onClick={() => handleAddCollaborator(member.id)}
                                                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-space-700 rounded-lg"
                                                            >
                                                                {member.avatar_url ? (
                                                                    <img src={member.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium flex items-center justify-center">
                                                                        {member.full_name[0].toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <span className="text-sm text-gray-900 dark:text-white">{member.full_name}</span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Collaborator List */}
                                {collaborators.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {collaborators.map(collab => (
                                            <div
                                                key={collab.user_id || collab.id}
                                                className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-space-800 rounded-lg group"
                                            >
                                                {collab.avatar_url ? (
                                                    <img src={collab.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-medium flex items-center justify-center">
                                                        {collab.full_name[0].toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-xs text-gray-700 dark:text-space-300">{collab.full_name}</span>
                                                <button
                                                    onClick={() => handleRemoveCollaborator(collab.user_id || collab.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-space-700 rounded transition-all"
                                                >
                                                    <X size={12} className="text-gray-500 dark:text-space-400" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 dark:text-space-500 italic">No co-workers assigned</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-space-400 uppercase tracking-wider">
                                    Description
                                </h3>
                                <div className="bg-gray-50 dark:bg-space-800 rounded-xl p-4 min-h-[100px]">
                                    {getDescription() ? (
                                        <p className="text-sm text-gray-700 dark:text-space-300 whitespace-pre-wrap">
                                            {getDescription()}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-400 dark:text-space-500 italic">
                                            No description provided
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Comments Section (UI Placeholder) */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-space-400 uppercase tracking-wider flex items-center gap-2">
                                    <MessageSquare size={14} />
                                    Comments
                                </h3>

                                {/* Comment Input */}
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-medium flex-shrink-0">
                                        You
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Write a comment..."
                                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-space-800 border border-gray-200 dark:border-space-700 rounded-lg text-sm text-gray-900 dark:text-white
                                                 placeholder-gray-400 dark:placeholder-space-500 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 focus:border-purple-300 dark:focus:border-purple-700"
                                    />
                                </div>

                                {/* Comments List Placeholder */}
                                <div className="text-center py-8 text-gray-400 dark:text-space-500 text-sm">
                                    No comments yet
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-space-700 bg-gray-50 dark:bg-space-800">
                            <button
                                onClick={onClose}
                                className="w-full py-2 text-sm text-gray-600 dark:text-space-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default TaskDetailDrawer;
