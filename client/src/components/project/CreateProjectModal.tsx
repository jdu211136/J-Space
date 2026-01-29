import { useState, useEffect } from 'react';
import { Modal, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useProjects } from '../../store/projectStore';
import { toast } from 'sonner';
import { Check, Users, X } from 'lucide-react';
import api from '../../services/api';

interface User {
    id: number;
    full_name: string;
    email: string;
    avatar_url?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
}

// Predefined color palette
const COLOR_SWATCHES = [
    '#6366f1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#22C55E', // Green
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
];

export const CreateProjectModal = ({ open, onClose }: Props) => {
    const { t } = useTranslation();
    const { addProject } = useProjects();

    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0]);
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Fetch available users when modal opens
    useEffect(() => {
        if (open) {
            setIsLoadingUsers(true);
            api.get('/users')
                .then(res => setAvailableUsers(res.data.users || []))
                .catch(err => console.error('Failed to load users:', err))
                .finally(() => setIsLoadingUsers(false));
        }
    }, [open]);

    const toggleMember = (userId: number) => {
        setSelectedMembers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Project name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const currentLang = localStorage.getItem('jdu_lang') || 'en';
            const sourceLang = currentLang === 'jp' ? 'ja' : currentLang;

            await addProject({
                titleEn: name.trim(),
                category: 'General',
                colorCode: selectedColor,
                isPublic: false,
                members: selectedMembers,
                sourceLang
            });

            toast.success(t('project.created_success') || 'Project created!');

            // Reset form
            setName('');
            setSelectedColor(COLOR_SWATCHES[0]);
            setSelectedMembers([]);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create project');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setName('');
        setSelectedColor(COLOR_SWATCHES[0]);
        setSelectedMembers([]);
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose} aria-labelledby="create-project-modal">
            <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-space-900 rounded-2xl border border-gray-100 dark:border-space-700 p-6 shadow-2xl outline-none font-inter">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Typography variant="h6" className="text-gray-900 dark:text-white !font-bold">
                        {t('project.create_new')}
                    </Typography>
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-space-800 rounded-lg transition-colors"
                    >
                        <X size={18} className="text-gray-400 dark:text-space-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Project Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-space-400 mb-2">
                            {t('project.name') || 'Project Name'}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('project.name_placeholder') || 'Enter project name...'}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-space-950 border border-gray-200 dark:border-space-700 text-gray-900 dark:text-white 
                                     focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none text-sm
                                     placeholder-gray-400 dark:placeholder-space-500 transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Color Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-space-400 mb-2">
                            {t('project.color') || 'Color'}
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {COLOR_SWATCHES.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-8 h-8 rounded-full transition-all flex items-center justify-center
                                        ${selectedColor === color
                                            ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-space-900 scale-110'
                                            : 'hover:scale-105'}`}
                                    style={{ backgroundColor: color }}
                                >
                                    {selectedColor === color && (
                                        <Check size={14} className="text-white" strokeWidth={3} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Team Members */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-space-400 mb-2">
                            <Users size={14} className="inline mr-1.5" />
                            {t('project.team') || 'Team Members'}
                        </label>

                        {isLoadingUsers ? (
                            <div className="text-center py-4 text-gray-400 dark:text-space-500 text-sm">Loading users...</div>
                        ) : availableUsers.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 dark:text-space-500 text-sm">No other users available</div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-space-700 rounded-xl p-2 space-y-1 bg-gray-50 dark:bg-space-950">
                                {availableUsers.map(user => {
                                    const isSelected = selectedMembers.includes(user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => toggleMember(user.id)}
                                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left
                                                ${isSelected
                                                    ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700'
                                                    : 'hover:bg-white dark:hover:bg-space-800 border border-transparent'}`}
                                        >
                                            {/* Avatar */}
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src =
                                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'U')}&background=random`;
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                                                    {(user.full_name || user.email || 'U')[0].toUpperCase()}
                                                </div>
                                            )}

                                            {/* Name & Email */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {user.full_name || 'Unknown'}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-space-400 truncate">
                                                    {user.email}
                                                </div>
                                            </div>

                                            {/* Checkmark */}
                                            {isSelected && (
                                                <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                                                    <Check size={12} className="text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {selectedMembers.length > 0 && (
                            <div className="mt-2 text-xs text-purple-600 font-medium">
                                {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm text-gray-500 dark:text-space-400 hover:text-gray-700 dark:hover:text-white font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-space-800 transition-colors"
                        >
                            {t('actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium 
                                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-purple-200"
                        >
                            {isSubmitting ? '...' : t('project.create_button') || 'Create Project'}
                        </button>
                    </div>
                </form>
            </Box>
        </Modal>
    );
};
