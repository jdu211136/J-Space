import { useState, useEffect } from 'react';
import { X as XIcon, User, Flag, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useCurrentProject } from '../../context/CurrentProjectContext';
import { useTasks } from '../../hooks/useTasks';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface Member {
    user_id: string;
    full_name: string;
}

export const CreateTaskDialog = ({ isOpen, onClose }: Props) => {
    const { t } = useTranslation();
    const { project } = useCurrentProject();
    const { fetchTasks } = useTasks();
    const [members, setMembers] = useState<Member[]>([]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'mid' | 'high'>('mid');
    const [deadline, setDeadline] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && project) {
            api.get(`/projects/${project.id}/members`)
                .then(res => setMembers(res.data.members))
                .catch(console.error);
        }
    }, [isOpen, project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !project) return;

        setLoading(true);
        try {
            // Get current language for auto-translation
            const currentLang = localStorage.getItem('jdu_lang') || 'en';

            await api.post('/tasks', {
                projectId: project.id,
                title,
                description,
                priority,
                deadline: deadline || undefined,
                assignedTo: assignedTo || undefined,
                sourceLang: currentLang === 'jp' ? 'ja' : currentLang // Send source language for auto-translation
            });

            toast.success(t('toasts.task_created'));
            fetchTasks(project.id);
            onClose();
            // Reset
            setTitle('');
            setDescription('');
            setPriority('mid');
            setDeadline('');
            setAssignedTo('');
        } catch (err) {
            console.error('Create task error:', err);
            toast.error(t('errors.create_task'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/25 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-space-900 dark:border dark:border-space-700 p-6 shadow-xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('actions.create_task')}</h3>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-space-800 text-gray-500 dark:text-space-400 transition-colors">
                                <XIcon size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-space-400 mb-1">{t('task_form.title_label')}</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={t('task_form.placeholder_title')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-space-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white dark:bg-space-950 dark:text-white dark:placeholder-space-500"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-space-400 mb-1">{t('task_form.desc_label')}</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder={t('task_form.placeholder_desc')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-space-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none bg-white dark:bg-space-950 dark:text-white dark:placeholder-space-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-space-400 mb-1">{t('task_form.priority_label')}</label>
                                    <div className="relative">
                                        <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-space-500" size={16} />
                                        <select
                                            value={priority}
                                            onChange={(e: any) => setPriority(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-space-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none bg-white dark:bg-space-950 dark:text-white py-2.5"
                                        >
                                            <option value="low">{t('priority.low')}</option>
                                            <option value="mid">{t('priority.mid')}</option>
                                            <option value="high">{t('priority.high')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-space-400 mb-1">{t('task_form.deadline_label')}</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-space-500" size={16} />
                                        <input
                                            type="datetime-local"
                                            value={deadline}
                                            onChange={(e) => setDeadline(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-space-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white dark:bg-space-950 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-space-400 mb-1">{t('task_form.assignee_label')}</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-space-500" size={16} />
                                    <select
                                        value={assignedTo}
                                        onChange={(e) => setAssignedTo(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-space-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none bg-white dark:bg-space-950 dark:text-white py-2.5"
                                    >
                                        <option value="">{t('task_form.unassigned')}</option>
                                        {members.map(m => (
                                            <option key={m.user_id} value={m.user_id}>
                                                {m.full_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-space-400 hover:bg-gray-100 dark:hover:bg-space-800 rounded-lg transition-colors"
                                >
                                    {t('actions.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !title.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Creating...' : t('actions.create_task')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
