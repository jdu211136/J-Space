import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { X, Calendar, User, Users, CheckSquare, Square, MessageSquare, Trash2, Plus, Clock, Check, FileText, Repeat, ExternalLink, Paperclip, Upload, File, X as XIcon, Search, ChevronDown, Crown, UserPlus, AlertCircle, Play, StopCircle } from 'lucide-react';
import { format, addHours, parseISO } from 'date-fns';
import { useTasks } from '../../hooks/useTasks';
import type { Task } from '../../store/taskStore';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { getLocalizedString } from '../../hooks/useLocalized';
import { useAuthStore } from '../../store/authStore';

interface Props {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
}

interface Subtask {
    id: string;
    text: string;
    completed: boolean;
}

interface Attachment {
    id: string;
    name: string;
    type: 'image' | 'document';
    url: string;
    size: string;
}

interface Comment {
    id: string;
    text: string;
    author: string;
    created_at: string;
}

interface Collaborator {
    user_id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
}

interface SearchedUser {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    is_project_member: boolean;
}

const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do', color: 'bg-gray-100 dark:bg-space-700 text-gray-700 dark:text-space-300' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
    { value: 'done', label: 'Done', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    { value: 'reviewed', label: 'Reviewed', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
];

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', color: 'text-blue-500' },
    { value: 'mid', label: 'Medium', color: 'text-yellow-500' },
    { value: 'high', label: 'High', color: 'text-red-500' },
];

// Helper to format date for datetime-local input
const formatForInput = (date: string | null): string => {
    if (!date) return '';
    try {
        return format(parseISO(date), "yyyy-MM-dd'T'HH:mm");
    } catch {
        return '';
    }
};

export const TaskDrawer = ({ task, isOpen, onClose }: Props) => {
    const { t } = useTranslation();
    const { updateTask, deleteTask } = useTasks();
    const { projectId } = useParams();

    // Form state
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState('todo');
    const [priority, setPriority] = useState('mid');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const [assignedTo, setAssignedTo] = useState<string | null>(null);

    // Assignee dropdown state
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [projectMembers, setProjectMembers] = useState<any[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const assigneeDropdownRef = useRef<HTMLDivElement>(null);

    // Collaborators state
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [rolePopoverUser, setRolePopoverUser] = useState<SearchedUser | null>(null);
    const [showInviteConfirm, setShowInviteConfirm] = useState(false);
    const [pendingCollabUser, setPendingCollabUser] = useState<SearchedUser | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Subtasks
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [newSubtask, setNewSubtask] = useState('');

    // Attachments
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Comments
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');

    // Timer state
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timerLoading, setTimerLoading] = useState(false);
    const { user } = useAuthStore();

    const titleRef = useRef<HTMLTextAreaElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);

    // Fetch project members for assignee dropdown
    useEffect(() => {
        if (projectId && isOpen) {
            fetchProjectMembers();
        }
    }, [projectId, isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
                setAssigneeDropdownOpen(false);
            }
        };
        if (assigneeDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [assigneeDropdownOpen]);

    const fetchProjectMembers = async () => {
        try {
            setIsLoadingMembers(true);
            const res = await api.get(`/projects/${projectId}/members`);
            // Filter only active members
            const activeMembers = (res.data.members || []).filter((m: any) => m.status === 'active');
            setProjectMembers(activeMembers);
        } catch (err) {
            console.error('Failed to fetch project members:', err);
        } finally {
            setIsLoadingMembers(false);
        }
    };

    // Global user search with debounce
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (assigneeSearch.trim().length < 2) {
            setSearchedUsers([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                setIsSearching(true);
                const res = await api.get(`/users/search`, {
                    params: { query: assigneeSearch, projectId }
                });
                setSearchedUsers(res.data.users || []);
            } catch (err) {
                console.error('Failed to search users:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [assigneeSearch, projectId]);

    // Populate form from task
    useEffect(() => {
        if (task) {
            // Get current language for extracting localized content
            const currentLang = (localStorage.getItem('jdu_lang') || 'en') as 'en' | 'uz' | 'ja';

            // Handle JSONB title OR legacy columns
            const localizedTitle = task.title
                ? getLocalizedString(task.title, currentLang)
                : (task.title_display || task.title_en || task.title_uz || '');
            setTitle(localizedTitle);

            // Handle JSONB description OR legacy columns
            const localizedDesc = task.description
                ? getLocalizedString(task.description, currentLang)
                : (task.desc_en || task.desc_uz || task.description_en || task.description_uz || '');
            setDescription(localizedDesc);

            setStatus(task.status);
            setPriority(task.priority);
            setStartDate(formatForInput(task.start_date));
            setEndDate(formatForInput(task.end_date || task.deadline));
            setIsCompleted(task.status === 'done');
            setAssignedTo(task.assigned_to || null);
            // Load collaborators from task
            setCollaborators(task.collaborators || []);
            setSubtasks([
                { id: '1', text: 'Research competitors', completed: true },
                { id: '2', text: 'Create wireframes', completed: false },
            ]);
            setAttachments([]);
            setComments([]);

            // Sync timer state with task
            setIsTimerActive(task.active_timer_user_id === user?.id);
        }
    }, [task, user?.id]);

    // Timer toggle handler
    const handleTimerToggle = async () => {
        if (!task) return;

        setTimerLoading(true);
        try {
            if (isTimerActive) {
                // Stop timer
                await api.post('/time-logs/stop', { taskId: task.id });
                setIsTimerActive(false);
                toast.success('Timer stopped');
            } else {
                // Start timer
                await api.post('/time-logs/start', { taskId: task.id });
                setIsTimerActive(true);
                toast.success('Timer started - tracking your work');
            }
        } catch (err: any) {
            const message = err.response?.data?.message || 'Timer operation failed';
            toast.error(message);
        } finally {
            setTimerLoading(false);
        }
    };

    // Auto-resize textareas
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
        }
    }, [title]);

    useEffect(() => {
        if (descriptionRef.current) {
            descriptionRef.current.style.height = 'auto';
            descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
        }
    }, [description]);

    // Subtask progress
    const completedSubtasks = subtasks.filter(s => s.completed).length;
    const totalSubtasks = subtasks.length;
    const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    const handleCompleteToggle = async () => {
        if (!task) return;
        const newCompleted = !isCompleted;
        setIsCompleted(newCompleted);
        const newStatus = newCompleted ? 'done' : 'todo';
        setStatus(newStatus);
        try {
            await updateTask(task.id, { status: newStatus });
            toast.success(newCompleted ? 'Task completed!' : 'Task reopened');
        } catch {
            setIsCompleted(!newCompleted);
            toast.error('Failed to update status');
        }
    };

    // Get current language code (mapped to backend format)
    const getCurrentLangCode = () => {
        const lang = localStorage.getItem('jdu_lang') || 'en';
        // Map 'ja' to 'ja' and 'jp' to 'ja' for consistency
        if (lang === 'jp') return 'ja';
        return lang as 'en' | 'uz' | 'ja';
    };

    const handleTitleBlur = async () => {
        if (!task) return;

        // Get the original title for comparison
        const currentLang = getCurrentLangCode();
        const originalTitle = task.title
            ? getLocalizedString(task.title, currentLang)
            : (task.title_display || task.title_en || task.title_uz || '');

        if (title !== originalTitle) {
            try {
                // Send only the specific language field being edited
                // Backend TranslationService.extractLanguageUpdates expects: title_en, title_uz, title_ja
                const fieldName = `title_${currentLang}` as 'title_en' | 'title_uz' | 'title_ja';
                await updateTask(task.id, { [fieldName]: title });
                toast.success('Title saved');
            } catch {
                toast.error('Failed to update title');
            }
        }
    };

    const handleDescriptionBlur = async () => {
        if (!task) return;

        const currentLang = getCurrentLangCode();
        try {
            // Send only the specific language field being edited
            const fieldName = `description_${currentLang}` as 'description_en' | 'description_uz' | 'description_ja';
            await updateTask(task.id, { [fieldName]: description });
        } catch {
            toast.error('Failed to update description');
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        setStatus(newStatus);
        setIsCompleted(newStatus === 'done');
        if (task) {
            try {
                await updateTask(task.id, { status: newStatus });
            } catch {
                toast.error('Failed to update status');
            }
        }
    };

    const handlePriorityChange = async (newPriority: string) => {
        setPriority(newPriority);
        if (task) {
            try {
                await updateTask(task.id, { priority: newPriority });
            } catch {
                toast.error('Failed to update priority');
            }
        }
    };

    // Handle user click in dropdown - directly assign as responsible for project members
    const handleUserClick = (user: SearchedUser) => {
        if (!user.is_project_member) {
            // Non-project member - show invite confirmation
            setPendingCollabUser(user);
            setShowInviteConfirm(true);
        } else {
            // Project member - directly make responsible (single click assignment)
            handleMakeResponsible(user);
        }
    };

    // Make user the Responsible (assignee)
    const handleMakeResponsible = async (user: SearchedUser) => {
        setAssignedTo(user.id);
        setAssigneeDropdownOpen(false);
        setAssigneeSearch('');
        setRolePopoverUser(null);
        if (task) {
            try {
                await updateTask(task.id, { assignedTo: user.id });
                toast.success('Responsible updated');
            } catch {
                toast.error('Failed to update responsible');
                setAssignedTo(task.assigned_to || null);
            }
        }
    };

    // Add user as collaborator (co-worker)
    const handleAddAsCollaborator = async (user: SearchedUser, autoInvite = false) => {
        if (!task) return;
        try {
            const res = await api.post(`/tasks/${task.id}/collaborators`, {
                userId: user.id,
                autoInvite
            });

            if (res.data.requiresInvite) {
                setPendingCollabUser(user);
                setShowInviteConfirm(true);
                return;
            }

            setCollaborators(prev => [...prev, {
                user_id: user.id,
                full_name: user.full_name,
                email: user.email,
                avatar_url: user.avatar_url
            }]);
            toast.success('Co-worker added');
            setAssigneeDropdownOpen(false);
            setAssigneeSearch('');
            setRolePopoverUser(null);
        } catch (err: any) {
            if (err.response?.data?.requiresInvite) {
                setPendingCollabUser(user);
                setShowInviteConfirm(true);
            } else {
                toast.error('Failed to add co-worker');
            }
        }
    };

    // Confirm invite and add
    const handleConfirmInvite = async () => {
        if (pendingCollabUser) {
            await handleAddAsCollaborator(pendingCollabUser, true);
            setShowInviteConfirm(false);
            setPendingCollabUser(null);
        }
    };

    // Remove collaborator
    const handleRemoveCollaborator = async (userId: string) => {
        if (!task) return;
        try {
            await api.delete(`/tasks/${task.id}/collaborators/${userId}`);
            setCollaborators(prev => prev.filter(c => c.user_id !== userId));
            toast.success('Co-worker removed');
        } catch {
            toast.error('Failed to remove co-worker');
        }
    };

    const handleAssigneeChange = async (userId: string | null) => {
        setAssignedTo(userId);
        setAssigneeDropdownOpen(false);
        setAssigneeSearch('');
        if (task) {
            try {
                await updateTask(task.id, { assignedTo: userId });
                toast.success(userId ? 'Assignee updated' : 'Assignee removed');
            } catch {
                toast.error('Failed to update assignee');
                // Rollback
                setAssignedTo(task.assigned_to || null);
            }
        }
    };

    // Use searched users when typing, otherwise show project members
    const displayUsers = assigneeSearch.trim().length >= 2 ? searchedUsers : projectMembers.map(m => ({
        id: m.user_id,
        full_name: m.full_name,
        email: m.email,
        avatar_url: m.avatar_url,
        is_project_member: true
    } as SearchedUser));

    const selectedMember = projectMembers.find(m => m.user_id === assignedTo);


    // Date range handlers
    const handleStartDateChange = (value: string) => {
        setStartDate(value);

        // Auto-set end date to +1 hour if not set
        if (value && !endDate) {
            const endDateValue = addHours(new Date(value), 1);
            setEndDate(format(endDateValue, "yyyy-MM-dd'T'HH:mm"));
        }
    };

    const handleStartDateBlur = async () => {
        if (!task || !startDate) return;
        try {
            await updateTask(task.id, { startDate: new Date(startDate).toISOString() });
        } catch {
            toast.error('Failed to update start date');
        }
    };

    const handleEndDateChange = (value: string) => {
        // Validate: end date must be >= start date
        if (startDate && value && new Date(value) < new Date(startDate)) {
            toast.error('End date cannot be before start date');
            return;
        }
        setEndDate(value);
    };

    const handleEndDateBlur = async () => {
        if (!task || !endDate) return;
        try {
            await updateTask(task.id, {
                endDate: new Date(endDate).toISOString(),
                deadline: new Date(endDate).toISOString() // Also update legacy field
            });
        } catch {
            toast.error('Failed to update end date');
        }
    };

    const handleClearDates = async () => {
        if (!task) return;
        setStartDate('');
        setEndDate('');
        try {
            await updateTask(task.id, { startDate: null, endDate: null, deadline: null });
            toast.success('Dates cleared');
        } catch {
            toast.error('Failed to clear dates');
        }
    };

    // Subtask handlers
    const handleAddSubtask = async () => {
        if (!newSubtask.trim()) return;
        const tempId = `temp-${Date.now()}`;
        const newItem: Subtask = { id: tempId, text: newSubtask, completed: false };
        setSubtasks(prev => [...prev, newItem]);
        setNewSubtask('');
        toast.success('Subtask added');
    };

    const handleToggleSubtask = async (id: string) => {
        setSubtasks(prev => prev.map(s =>
            s.id === id ? { ...s, completed: !s.completed } : s
        ));
    };

    const handleDeleteSubtask = (id: string) => {
        setSubtasks(prev => prev.filter(s => s.id !== id));
    };

    // Attachment handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        handleFiles(files);
    };

    // Fetch attachments when task opens
    useEffect(() => {
        const fetchAttachments = async () => {
            if (!task) return;
            try {
                const res = await api.get(`/uploads/task/${task.id}`);
                const mappedAttachments: Attachment[] = res.data.attachments.map((a: any) => ({
                    id: a.id,
                    name: a.file_name,
                    type: a.file_type?.startsWith('image/') ? 'image' : 'document',
                    url: `http://localhost:5001${a.file_path}`,
                    size: formatFileSize(a.file_size || 0)
                }));
                setAttachments(mappedAttachments);
            } catch (err) {
                console.error('Failed to fetch attachments');
            }
        };

        if (task) {
            fetchAttachments();
        } else {
            setAttachments([]);
        }
    }, [task]);

    const handleFiles = async (files: File[]) => {
        if (!task) return;

        const uploadPromises = files.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('taskId', String(task.id)); // Ensure string

            try {
                const res = await api.post('/uploads', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                return {
                    id: res.data.attachment.id,
                    name: res.data.originalName,
                    type: file.type.startsWith('image/') ? 'image' : 'document',
                    url: `http://localhost:5001${res.data.url}`, // Full URL for development
                    size: formatFileSize(file.size)
                };
            } catch (err) {
                console.error('Upload failed', err);
                toast.error(`Failed to upload ${file.name}`);
                return null;
            }
        });

        toast.promise(Promise.all(uploadPromises), {
            loading: 'Uploading files...',
            success: (results) => {
                const successful = results.filter(Boolean) as Attachment[];
                setAttachments(prev => [...prev, ...successful]);
                return `Uploaded ${successful.length} file(s)`;
            },
            error: 'Upload failed'
        });
    };

    const handleRemoveAttachment = async (id: string) => {
        try {
            await api.delete(`/uploads/${id}`);
            setAttachments(prev => prev.filter(a => a.id !== id));
            toast.success('Attachment removed');
        } catch (err) {
            toast.error('Failed to remove attachment');
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Comment handlers
    const handleAddComment = async () => {
        if (!newComment.trim() || !task) return;
        const newItem: Comment = {
            id: `comment-${Date.now()}`,
            text: newComment,
            author: 'You',
            created_at: new Date().toISOString(),
        };
        setComments(prev => [...prev, newItem]);
        setNewComment('');
        try {
            await api.post('/comments', { taskId: task.id, text: newComment });
        } catch {
            toast.error('Failed to add comment');
        }
    };

    const handleCommentKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleAddComment();
        }
    };

    const handleDelete = async () => {
        if (task && confirm('Are you sure you want to delete this task?')) {
            try {
                await deleteTask(task.id);
                toast.success('Task deleted');
                onClose();
            } catch {
                toast.error('Failed to delete task');
            }
        }
    };

    if (!isOpen || !task) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed top-0 right-0 h-screen w-[500px] bg-white dark:bg-space-900 shadow-2xl z-50 flex flex-col animate-slide-in-right font-inter">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-space-700 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCompleteToggle}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                isCompleted
                                    ? "bg-green-500 text-white border-green-500 shadow-sm"
                                    : "bg-white dark:bg-space-800 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-space-600 hover:bg-purple-50 dark:hover:bg-space-700"
                            )}
                        >
                            <Check size={16} />
                            {isCompleted ? 'Completed' : 'Complete'}
                        </button>

                        <button
                            onClick={handleTimerToggle}
                            disabled={timerLoading}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors",
                                isTimerActive
                                    ? "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                                    : "border-gray-200 dark:border-space-700 text-gray-600 dark:text-space-400 hover:bg-gray-50 dark:hover:bg-space-800",
                                timerLoading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isTimerActive ? (
                                <>
                                    <StopCircle size={16} className="text-purple-600 dark:text-purple-400" />
                                    {timerLoading ? 'Stopping...' : 'Stop Timer'}
                                </>
                            ) : (
                                <>
                                    <Play size={16} />
                                    {timerLoading ? 'Starting...' : 'Start Timer'}
                                </>
                            )}
                        </button>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-space-800 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500 dark:text-space-400" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-6">
                        {/* Title */}
                        <textarea
                            ref={titleRef}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            className={clsx(
                                "w-full text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 mb-6 resize-none overflow-hidden",
                                isCompleted ? "text-gray-400 dark:text-space-500 line-through" : "text-gray-900 dark:text-white"
                            )}
                            placeholder={t('task_form.placeholder_title')}
                            rows={1}
                        />

                        {/* Properties Grid */}
                        <div className="space-y-4 mb-8">
                            {/* Assignee Row */}
                            <div className="flex items-center">
                                <div className="w-28 text-sm text-gray-500 dark:text-space-400 flex items-center gap-2">
                                    <User size={14} />Assignee
                                </div>
                                <div className="flex-1 relative" ref={assigneeDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-space-800 cursor-pointer border border-gray-200 dark:border-space-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        {selectedMember ? (
                                            <>
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold border border-white dark:border-space-700">
                                                    {selectedMember.avatar_url ? (
                                                        <img
                                                            src={selectedMember.avatar_url}
                                                            alt={selectedMember.full_name}
                                                            className="w-full h-full rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        selectedMember.full_name?.charAt(0).toUpperCase() || '?'
                                                    )}
                                                </div>
                                                <span className="text-sm text-gray-900 dark:text-white flex-1 text-left">
                                                    {selectedMember.full_name}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-space-700 flex items-center justify-center">
                                                    <User size={14} className="text-gray-400 dark:text-space-500" />
                                                </div>
                                                <span className="text-sm text-gray-500 dark:text-space-400 flex-1 text-left">{t('task_form.unassigned')}</span>
                                            </>
                                        )}
                                        <ChevronDown size={16} className="text-gray-400 dark:text-space-500" />
                                    </button>

                                    {assigneeDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-space-800 border border-gray-200 dark:border-space-700 rounded-lg shadow-lg max-h-64 overflow-hidden">
                                            <div className="p-2 border-b border-gray-100 dark:border-space-700">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-2 top-2.5 text-gray-400 dark:text-space-500" />
                                                    <input
                                                        type="text"
                                                        value={assigneeSearch}
                                                        onChange={(e) => setAssigneeSearch(e.target.value)}
                                                        placeholder={t('task_form.search_members')}
                                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-space-700 rounded-lg bg-white dark:bg-space-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-space-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="overflow-y-auto max-h-48">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAssigneeChange(null)}
                                                    className={clsx(
                                                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-space-700 transition-colors",
                                                        !assignedTo && "bg-purple-50 dark:bg-purple-900/30"
                                                    )}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-space-700 flex items-center justify-center">
                                                        <User size={14} className="text-gray-400 dark:text-space-500" />
                                                    </div>
                                                    <span className="text-gray-900 dark:text-white">{t('task_form.unassigned')}</span>
                                                </button>
                                                {isLoadingMembers || isSearching ? (
                                                    <div className="px-3 py-4 text-center text-sm text-gray-400 dark:text-space-400">Loading...</div>
                                                ) : displayUsers.length === 0 ? (
                                                    <div className="px-3 py-4 text-center text-sm text-gray-400 dark:text-space-400">
                                                        {assigneeSearch ? 'No users found' : 'No members'}
                                                    </div>
                                                ) : (
                                                    displayUsers.map((user) => (
                                                        <div key={user.id} className="relative">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUserClick(user)}
                                                                className={clsx(
                                                                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-space-700 transition-colors",
                                                                    assignedTo === user.id && "bg-purple-50 dark:bg-purple-900/30"
                                                                )}
                                                            >
                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold border border-white dark:border-space-900">
                                                                    {user.avatar_url ? (
                                                                        <img
                                                                            src={user.avatar_url}
                                                                            alt={user.full_name}
                                                                            className="w-full h-full rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        user.full_name?.charAt(0).toUpperCase() || '?'
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 text-left">
                                                                    <div className="text-gray-900 dark:text-gray-200 font-medium flex items-center gap-1">
                                                                        {user.full_name}
                                                                        {!user.is_project_member && (
                                                                            <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">Not in project</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 dark:text-space-400">{user.email}</div>
                                                                </div>
                                                                {/* Checkmark for selected assignee */}
                                                                {assignedTo === user.id && (
                                                                    <Check size={16} className="text-purple-600 ml-auto" />
                                                                )}
                                                                {/* Checkmark for collaborators */}
                                                                {collaborators.some(c => c.user_id === user.id) && assignedTo !== user.id && (
                                                                    <Check size={16} className="text-blue-500 ml-auto" />
                                                                )}
                                                            </button>

                                                            {/* Role selection popover */}
                                                            {rolePopoverUser?.id === user.id && (
                                                                <div className="absolute left-full top-0 ml-2 bg-white dark:bg-space-800 border border-gray-200 dark:border-space-700 rounded-lg shadow-lg z-50 w-48">
                                                                    <button
                                                                        onClick={() => handleMakeResponsible(user)}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors text-left text-gray-700 dark:text-gray-300"
                                                                    >
                                                                        <Crown size={14} className="text-yellow-500" />
                                                                        <span>Make Responsible</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleAddAsCollaborator(user)}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-left text-gray-700 dark:text-gray-300"
                                                                    >
                                                                        <Users size={14} className="text-blue-500" />
                                                                        <span>Add as Co-worker</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Co-workers Row */}
                            <div className="flex items-center">
                                <div className="w-28 text-sm text-gray-500 dark:text-space-400 flex items-center gap-2">
                                    <Users size={14} />Co-workers
                                </div>
                                <div className="flex-1 flex items-center gap-1">
                                    {collaborators.length === 0 ? (
                                        <span className="text-sm text-gray-400 dark:text-space-500">{t('task_form.no_coworkers')}</span>
                                    ) : (
                                        <div className="flex -space-x-2">
                                            {collaborators.slice(0, 5).map((collab) => (
                                                <div
                                                    key={collab.user_id}
                                                    className="relative group"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white dark:border-space-800 shadow-sm cursor-pointer hover:z-10 hover:scale-110 transition-transform">
                                                        {collab.avatar_url ? (
                                                            <img
                                                                src={collab.avatar_url}
                                                                alt={collab.full_name}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            collab.full_name?.charAt(0).toUpperCase() || '?'
                                                        )}
                                                    </div>
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                                        {collab.full_name}
                                                        <button
                                                            onClick={() => handleRemoveCollaborator(collab.user_id)}
                                                            className="ml-2 text-red-300 hover:text-red-100"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {collaborators.length > 5 && (
                                                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-space-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-space-300 border-2 border-white dark:border-space-800">
                                                    +{collaborators.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setAssigneeDropdownOpen(true)}
                                        className="ml-2 p-1.5 rounded-full border border-dashed border-gray-300 dark:border-space-600 hover:border-purple-400 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                                        title="Add co-worker"
                                    >
                                        <UserPlus size={12} className="text-gray-400 dark:text-space-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Invite Confirmation Modal */}
                            {showInviteConfirm && pendingCollabUser && (
                                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]">
                                    <div className="bg-white dark:bg-space-800 rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 dark:border-space-700">
                                        <div className="flex items-center gap-3 mb-4">
                                            <AlertCircle size={24} className="text-orange-500" />
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Not in Project</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-space-300 mb-4">
                                            <span className="font-medium text-gray-800 dark:text-gray-200">{pendingCollabUser.full_name}</span> ({pendingCollabUser.email}) is not a member of this project. Would you like to invite them?
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => {
                                                    setShowInviteConfirm(false);
                                                    setPendingCollabUser(null);
                                                }}
                                                className="flex-1 px-4 py-2 border border-gray-200 dark:border-space-600 rounded-lg text-sm text-gray-600 dark:text-space-400 hover:bg-gray-50 dark:hover:bg-space-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleConfirmInvite}
                                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                                            >
                                                Invite & Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Period Section - Date Range */}
                            <div className="p-4 bg-gray-50 dark:bg-space-800 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-space-300 flex items-center gap-2">
                                        <Calendar size={14} className="text-purple-500" />
                                        Period
                                    </h4>
                                    {(startDate || endDate) && (
                                        <button
                                            onClick={handleClearDates}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-space-700 rounded transition-colors"
                                            title="Clear dates"
                                        >
                                            <XIcon size={14} className="text-gray-400 dark:text-space-400" />
                                        </button>
                                    )}
                                </div>

                                {/* Start Date/Time */}
                                <div className="flex items-center gap-3">
                                    <div className="w-16 text-xs text-gray-500 dark:text-space-400 font-medium">Start</div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-space-500" />
                                            <input
                                                type="datetime-local"
                                                value={startDate}
                                                onChange={(e) => handleStartDateChange(e.target.value)}
                                                onBlur={handleStartDateBlur}
                                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-space-600 bg-white dark:bg-space-900 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 focus:border-purple-300 dark:focus:border-purple-600 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* End Date/Time */}
                                <div className="flex items-center gap-3">
                                    <div className="w-16 text-xs text-gray-500 dark:text-space-400 font-medium">End</div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-space-500" />
                                            <input
                                                type="datetime-local"
                                                value={endDate}
                                                onChange={(e) => handleEndDateChange(e.target.value)}
                                                onBlur={handleEndDateBlur}
                                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-space-600 bg-white dark:bg-space-900 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 focus:border-purple-300 dark:focus:border-purple-600 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Repeat Option */}
                                <button className="flex items-center gap-2 text-xs text-gray-500 dark:text-space-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                    <Repeat size={12} />
                                    Add repeat schedule
                                </button>
                            </div>

                            {/* Status Row */}
                            <div className="flex items-center">
                                <div className="w-28 text-sm text-gray-500 dark:text-space-400 flex items-center gap-2">
                                    <CheckSquare size={14} />Status
                                </div>
                                <select
                                    value={status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    className={clsx(
                                        "px-3 py-2 rounded-lg border border-gray-200 dark:border-space-700 bg-white dark:bg-space-900 text-sm font-medium outline-none cursor-pointer",
                                        STATUS_OPTIONS.find(s => s.value === status)?.color
                                    )}
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Priority Row */}
                            <div className="flex items-center">
                                <div className="w-28 text-sm text-gray-500 dark:text-space-400 flex items-center gap-2">
                                    <FileText size={14} />Priority
                                </div>
                                <select
                                    value={priority}
                                    onChange={(e) => handlePriorityChange(e.target.value)}
                                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-space-700 bg-white dark:bg-space-900 text-sm font-medium outline-none cursor-pointer text-gray-900 dark:text-white"
                                >
                                    {PRIORITY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value} className={opt.color}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Project Row */}
                            <div className="flex items-center">
                                <div className="w-28 text-sm text-gray-500 dark:text-space-400 flex items-center gap-2">
                                    <ExternalLink size={14} />Project
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-space-800 cursor-pointer">
                                    <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/30" />
                                    <span className="text-sm text-gray-700 dark:text-space-300">Current Project</span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <FileText size={16} className="text-gray-400 dark:text-space-500" />Description
                            </h3>
                            <textarea
                                ref={descriptionRef}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={handleDescriptionBlur}
                                placeholder={t('task_form.placeholder_desc')}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-space-700 bg-white dark:bg-space-900 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 focus:border-purple-300 dark:focus:border-purple-600 outline-none resize-none min-h-[80px]"
                                rows={2}
                            />
                        </div>

                        {/* Subtasks with Progress */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <CheckSquare size={16} className="text-gray-400 dark:text-space-500" />
                                    Subtasks
                                    {totalSubtasks > 0 && (
                                        <span className="text-xs bg-gray-100 dark:bg-space-800 text-gray-500 dark:text-space-400 px-1.5 py-0.5 rounded-full">
                                            {completedSubtasks}/{totalSubtasks}
                                        </span>
                                    )}
                                </h3>
                            </div>

                            {totalSubtasks > 0 && (
                                <div className="mb-3">
                                    <div className="h-1.5 bg-gray-100 dark:bg-space-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1 mb-3">
                                {subtasks.map(st => (
                                    <div
                                        key={st.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-space-800 group transition-colors"
                                    >
                                        <button onClick={() => handleToggleSubtask(st.id)}>
                                            {st.completed ? (
                                                <CheckSquare size={18} className="text-green-500" />
                                            ) : (
                                                <Square size={18} className="text-gray-300 dark:text-space-500 hover:text-purple-500 dark:hover:text-purple-400" />
                                            )}
                                        </button>
                                        <span className={clsx("flex-1 text-sm", st.completed ? "line-through text-gray-400 dark:text-space-500" : "text-gray-700 dark:text-gray-200")}>
                                            {st.text}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteSubtask(st.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-space-700 rounded transition-all"
                                        >
                                            <XIcon size={14} className="text-gray-400 dark:text-space-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newSubtask}
                                    onChange={(e) => setNewSubtask(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                    placeholder={t('task_form.add_subtask')}
                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-space-700 bg-white dark:bg-space-900 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 focus:border-purple-300 dark:focus:border-purple-600 outline-none"
                                />
                                <button onClick={handleAddSubtask} className="p-2 bg-gray-100 dark:bg-space-800 hover:bg-gray-200 dark:hover:bg-space-700 rounded-lg transition-colors">
                                    <Plus size={16} className="text-gray-600 dark:text-space-400" />
                                </button>
                            </div>
                        </div>

                        {/* Attachments */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Paperclip size={16} className="text-gray-400 dark:text-space-500" />
                                Attachments
                                {attachments.length > 0 && (
                                    <span className="text-xs bg-gray-100 dark:bg-space-800 text-gray-500 dark:text-space-400 px-1.5 py-0.5 rounded-full">
                                        {attachments.length}
                                    </span>
                                )}
                            </h3>

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={clsx(
                                    "relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                                    isDragging
                                        ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20"
                                        : "border-gray-200 dark:border-space-700 hover:border-purple-300 hover:bg-gray-50 dark:hover:bg-space-800"
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <Upload size={24} className={clsx("mx-auto mb-2", isDragging ? "text-purple-500" : "text-gray-400 dark:text-space-500")} />
                                <p className="text-sm text-gray-500 dark:text-space-400">
                                    {isDragging ? "Drop files here" : "Drag & drop or click to upload"}
                                </p>
                            </div>

                            {attachments.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    {attachments.map(att => (
                                        <div key={att.id} className="relative group bg-gray-50 dark:bg-space-800 rounded-lg p-3 border border-gray-100 dark:border-space-700">
                                            <button
                                                onClick={() => handleRemoveAttachment(att.id)}
                                                className="absolute -top-2 -right-2 p-1 bg-white dark:bg-space-700 border border-gray-200 dark:border-space-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <XIcon size={12} className="text-gray-500 dark:text-space-300" />
                                            </button>
                                            {att.type === 'image' ? (
                                                <img src={att.url} alt={att.name} className="w-full h-16 object-cover rounded mb-2" />
                                            ) : (
                                                <div className="w-full h-16 bg-gray-100 dark:bg-space-900/50 rounded flex items-center justify-center mb-2">
                                                    <File size={24} className="text-gray-400 dark:text-space-500" />
                                                </div>
                                            )}
                                            <p className="text-xs font-medium text-gray-700 dark:text-space-300 truncate">{att.name}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-space-500">{att.size}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Comments */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <MessageSquare size={16} className="text-gray-400 dark:text-space-500" />
                                Comments
                            </h3>
                            <div className="space-y-3">
                                {comments.length === 0 && (
                                    <p className="text-sm text-gray-400 dark:text-space-500 py-2">{t('task_form.no_comments')}</p>
                                )}
                                {comments.map(c => (
                                    <div key={c.id} className="p-3 bg-gray-50 dark:bg-space-800 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-gray-700 dark:text-space-300">{c.author}</span>
                                            <span className="text-[10px] text-gray-400 dark:text-space-500">{format(new Date(c.created_at), 'MMM d, HH:mm')}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-space-400">{c.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="shrink-0 border-t border-gray-100 dark:border-space-700 bg-white dark:bg-space-900">
                    <div className="px-6 py-3 flex items-center gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={handleCommentKeyDown}
                            placeholder={t('task_form.add_comment')}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-space-700 bg-white dark:bg-space-800 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 focus:border-purple-300 dark:focus:border-purple-600 outline-none"
                        />
                        <button
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-space-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            Send
                        </button>
                    </div>

                    <div className="px-6 py-3 border-t border-gray-50 dark:border-space-800 flex justify-end">
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Trash2 size={16} />
                            Delete Task
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
