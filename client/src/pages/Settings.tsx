import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Check, User } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const AVATAR_OPTIONS = [
    {
        id: 'man',
        label: 'Man in Suit',
        url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert&clothing=blazerAndShirt'
    },
    {
        id: 'woman',
        label: 'Woman in Suit',
        url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&clothing=blazerAndShirt'
    },
    {
        id: 'robot',
        label: 'Robot',
        url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber'
    }
];

const Settings = () => {
    const { t } = useTranslation();
    const { user, setUser } = useAuthStore();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/users/profile');
            const profile = res.data.user;
            setFullName(profile.full_name || '');
            setEmail(profile.email || '');
            setBio(profile.bio || '');
            setAvatarUrl(profile.avatar_url || '');
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const res = await api.put('/users/profile', {
                full_name: fullName,
                avatar_url: avatarUrl,
                bio: bio
            });

            // Update auth store with new user data
            if (res.data.user && user) {
                setUser({
                    ...user,
                    full_name: res.data.user.full_name,
                    avatar_url: res.data.user.avatar_url
                });
            }

            toast.success(t('settings.success'));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-10 px-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
                <p className="text-gray-500 dark:text-space-400 mt-1">{t('settings.subtitle')}</p>
            </div>

            {/* Avatar Selection */}
            <div className="bg-white dark:bg-space-900 rounded-xl border border-gray-200 dark:border-space-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.select_avatar')}</h2>

                {/* Current Avatar */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-space-800 shadow-lg overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User size={32} />
                        )}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">{fullName || 'Your Name'}</p>
                        <p className="text-sm text-gray-500 dark:text-space-400">{email}</p>
                    </div>
                </div>

                {/* Avatar Options */}
                <div className="flex gap-4">
                    {AVATAR_OPTIONS.map((avatar) => (
                        <button
                            key={avatar.id}
                            onClick={() => setAvatarUrl(avatar.url)}
                            className={`relative w-16 h-16 rounded-full overflow-hidden border-3 transition-all duration-200 hover:scale-110 ${avatarUrl === avatar.url
                                ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-900/50'
                                : 'border-gray-200 dark:border-space-700 hover:border-gray-300 dark:hover:border-space-500'
                                }`}
                        >
                            <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                            {avatarUrl === avatar.url && (
                                <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                    <Check size={20} className="text-purple-600" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Profile Form */}
            <div className="bg-white dark:bg-space-900 rounded-xl border border-gray-200 dark:border-space-700 p-6">
                <div className="space-y-5">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-space-300 mb-2">
                            {t('settings.full_name')}
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-space-600 bg-white dark:bg-space-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                            placeholder={t('settings.full_name')}
                        />
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-space-300 mb-2">
                            {t('settings.email')}
                        </label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-space-700 bg-gray-50 dark:bg-space-800 text-gray-500 dark:text-space-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 dark:text-space-500 mt-1">{t('settings.email_readonly')}</p>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-space-300 mb-2">
                            {t('settings.bio')}
                        </label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-space-600 bg-white dark:bg-space-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"
                            placeholder={t('settings.bio_placeholder')}
                        />
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                {t('settings.saving')}
                            </>
                        ) : (
                            t('settings.save')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
