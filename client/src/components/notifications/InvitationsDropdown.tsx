import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';
import clsx from 'clsx';
import { format } from 'date-fns';

interface Invitation {
    id: string;
    project_id: string;
    title_uz?: string;
    title_en?: string;
    title_jp?: string;
    color_code?: string;
    role: string;
    status: string;
    invited_at: string;
    inviter_name?: string;
}

interface Props {
    isCollapsed: boolean;
}

export const InvitationsDropdown = ({ isCollapsed }: Props) => {
    const { t } = useTranslation();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchInvitations();
        // Poll for new invitations every 30 seconds
        const interval = setInterval(fetchInvitations, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const fetchInvitations = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/invites/me');
            setInvitations(res.data.invitations || []);
        } catch (err) {
            console.error('Failed to fetch invitations:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async (inviteId: string, projectId: string) => {
        try {
            await api.post(`/invites/${inviteId}/accept`);
            toast.success('Invitation accepted');
            setInvitations(prev => prev.filter(inv => inv.id !== inviteId));
            fetchInvitations();
            navigate(`/projects/${projectId}`);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to accept invitation');
        }
    };

    const handleDecline = async (inviteId: string) => {
        try {
            await api.post(`/invites/${inviteId}/decline`);
            toast.success('Invitation declined');
            setInvitations(prev => prev.filter(inv => inv.id !== inviteId));
            fetchInvitations();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to decline invitation');
        }
    };

    const getProjectTitle = (invitation: Invitation) => {
        return invitation.title_en || invitation.title_uz || invitation.title_jp || 'Untitled Project';
    };

    const pendingCount = invitations.filter(inv => inv.status === 'pending').length;

    if (isCollapsed) {
        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/60 dark:hover:bg-space-800 transition-colors relative"
                    aria-label="Notifications"
                >
                    <Bell size={18} className="text-gray-500 dark:text-space-400" />
                    {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                            {pendingCount > 9 ? '9+' : pendingCount}
                        </span>
                    )}
                </button>
                {isOpen && (
                    <div className="absolute left-full ml-2 top-0 w-80 bg-white dark:bg-space-900 border border-gray-200 dark:border-space-700 rounded-lg shadow-xl z-50">
                        <InvitationsList
                            invitations={invitations}
                            isLoading={isLoading}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                            getProjectTitle={getProjectTitle}
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative mb-2 px-3" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/60 dark:hover:bg-space-800 transition-colors relative group"
            >
                <div className="relative">
                    <Bell size={18} className={clsx("transition-colors", pendingCount > 0 ? "text-purple-600" : "text-gray-500 dark:text-space-400")} />
                    {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                            {pendingCount > 9 ? '9+' : pendingCount}
                        </span>
                    )}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-space-300 group-hover:text-gray-900 dark:group-hover:text-white">{t('sidebar.invitations')}</span>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-space-900 border border-gray-200 dark:border-space-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
                    <InvitationsList
                        invitations={invitations}
                        isLoading={isLoading}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                        getProjectTitle={getProjectTitle}
                    />
                </div>
            )}
        </div>
    );
};

interface InvitationsListProps {
    invitations: Invitation[];
    isLoading: boolean;
    onAccept: (inviteId: string, projectId: string) => void;
    onDecline: (inviteId: string) => void;
    getProjectTitle: (invitation: Invitation) => string;
}

const InvitationsList = ({ invitations, isLoading, onAccept, onDecline, getProjectTitle }: InvitationsListProps) => {
    const { t } = useTranslation();
    const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

    return (
        <>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-space-800 bg-gray-50 dark:bg-space-950 flex items-center justify-center">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('sidebar.invitations')}</h3>
            </div>
            <div className="overflow-y-auto max-h-80">
                {isLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-space-500">Loading...</div>
                ) : pendingInvitations.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-space-400">{t('dashboard.no_activity')}</div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {pendingInvitations.map((invitation) => (
                            <div key={invitation.id} className="p-4 hover:bg-gray-50 dark:hover:bg-space-800 transition-colors">
                                <div className="flex items-start gap-3 mb-3">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                        style={{ backgroundColor: invitation.color_code || '#6366f1' }}
                                    >
                                        {getProjectTitle(invitation).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                                            {getProjectTitle(invitation)}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-space-400">
                                            Invited {format(new Date(invitation.invited_at), 'MMM d, yyyy')}
                                            {invitation.inviter_name && ` by ${invitation.inviter_name}`}
                                        </div>
                                        <div className="text-xs text-gray-400 dark:text-space-500 mt-1">
                                            Role: <span className="capitalize">{invitation.role}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onAccept(invitation.id, invitation.project_id)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <CheckCircle2 size={16} />
                                        {t('actions.accept')}
                                    </button>
                                    <button
                                        onClick={() => onDecline(invitation.id)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-space-800 hover:bg-gray-200 dark:hover:bg-space-700 text-gray-700 dark:text-space-300 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <XCircle size={16} />
                                        {t('actions.decline')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};
