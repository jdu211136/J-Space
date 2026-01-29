import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { UserPlus, Mail, Clock, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import clsx from 'clsx';
import { format } from 'date-fns';

interface Member {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    status: 'pending' | 'active' | 'declined';
    invited_at: string;
    joined_at?: string;
}

const MembersTab = () => {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
    const [isInviting, setIsInviting] = useState(false);

    useEffect(() => {
        if (projectId) {
            fetchMembers();
        }
    }, [projectId]);

    const fetchMembers = async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/projects/${projectId}/members`);
            setMembers(res.data.members || []);
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('errors.general'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
            toast.error(t('errors.invalid_email'));
            return;
        }

        try {
            setIsInviting(true);
            await api.post(`/projects/${projectId}/invite`, {
                email: inviteEmail.trim(),
                role: inviteRole,
            });
            toast.success(t('toasts.invitation_sent'));
            setInviteEmail('');
            fetchMembers();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to send invitation');
        } finally {
            setIsInviting(false);
        }
    };

    const handleResendInvite = async (memberId: string) => {
        try {
            await api.post(`/projects/${projectId}/invite`, {
                email: members.find(m => m.id === memberId)?.email,
                role: members.find(m => m.id === memberId)?.role,
            });
            toast.success(t('toasts.invitation_sent'));
            fetchMembers();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to resend invitation');
        }
    };

    const getRoleBadge = (role: string) => {
        const configs = {
            owner: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: t('roles.owner') },
            admin: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: t('roles.admin') },
            member: { bg: 'bg-gray-100 dark:bg-space-700', text: 'text-gray-700 dark:text-space-300', label: t('roles.member') },
            viewer: { bg: 'bg-gray-50 dark:bg-space-800', text: 'text-gray-600 dark:text-space-400', label: t('roles.viewer') },
        };
        const config = configs[role as keyof typeof configs] || configs.member;
        return (
            <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', config.bg, config.text)}>
                {config.label}
            </span>
        );
    };

    const activeMembers = members.filter(m => m.status === 'active');
    const pendingMembers = members.filter(m => m.status === 'pending');

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Members</h2>
                <p className="text-gray-500 dark:text-space-400">Manage who has access to this project</p>
            </div>

            {/* Invite Section */}
            <div className="bg-white dark:bg-space-900 border border-gray-200 dark:border-space-700 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <UserPlus size={20} className="text-purple-600" />
                    {t('members.invite')}
                </h3>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                            placeholder={t('members.enter_email')}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-space-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white dark:bg-space-950 dark:placeholder-space-500"
                        />
                    </div>
                    <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-space-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white dark:bg-space-950"
                    >
                        <option value="member">{t('roles.member')}</option>
                        <option value="admin">{t('roles.admin')}</option>
                        <option value="viewer">{t('roles.viewer')}</option>
                    </select>
                    <button
                        onClick={handleInvite}
                        disabled={isInviting || !inviteEmail.trim()}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Mail size={16} />
                        {isInviting ? '...' : t('members.send_invite')}
                    </button>
                </div>
            </div>

            {/* Active Members */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Active Members ({activeMembers.length})
                </h3>
                {isLoading ? (
                    <div className="text-center py-8 text-gray-400 dark:text-space-500">Loading...</div>
                ) : activeMembers.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-space-500">{t('members.no_members')}</div>
                ) : (
                    <div className="bg-white dark:bg-space-900 border border-gray-200 dark:border-space-700 rounded-lg divide-y divide-gray-100 dark:divide-space-700">
                        {activeMembers.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-space-800 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold border-2 border-white dark:border-space-800 shadow-sm">
                                        {member.avatar_url ? (
                                            <img
                                                src={member.avatar_url}
                                                alt={member.full_name}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            member.full_name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{member.full_name}</div>
                                        <div className="text-sm text-gray-500 dark:text-space-400">{member.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {getRoleBadge(member.role)}
                                    {member.joined_at && (
                                        <span className="text-xs text-gray-400">
                                            Joined {format(new Date(member.joined_at), 'MMM d, yyyy')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pending Invitations */}
            {pendingMembers.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Pending Invitations ({pendingMembers.length})
                    </h3>
                    <div className="bg-white dark:bg-space-900 border border-gray-200 dark:border-space-700 rounded-lg divide-y divide-gray-100 dark:divide-space-700">
                        {pendingMembers.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-space-800 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-space-700 flex items-center justify-center">
                                        <UserIcon size={20} className="text-gray-400 dark:text-space-500" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{member.full_name || member.email}</div>
                                        <div className="text-sm text-gray-500 dark:text-space-400 flex items-center gap-2">
                                            <Clock size={12} />
                                            Invited {format(new Date(member.invited_at), 'MMM d, yyyy')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                        Pending...
                                    </span>
                                    {getRoleBadge(member.role)}
                                    <button
                                        onClick={() => handleResendInvite(member.id)}
                                        className="px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                    >
                                        Resend
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MembersTab;
