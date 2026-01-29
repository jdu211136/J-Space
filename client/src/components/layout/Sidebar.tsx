import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Plus, ChevronDown, ChevronLeft, ChevronRight, Settings, Search, Globe, Archive, LayoutGrid, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import { useProjects } from '../../store/projectStore';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { CreateProjectModal } from '../project/CreateProjectModal';
import { InvitationsDropdown } from '../notifications/InvitationsDropdown';
import { motion } from 'framer-motion';
import { Menu, MenuItem } from '@mui/material';
import api from '../../services/api';
import { toast } from 'sonner';
import { isLocalizedContent } from '../../hooks/useLocalized';

interface SidebarProps {
    isCollapsed: boolean;
    onToggleCollapsed: () => void;
}

export const Sidebar = ({ isCollapsed, onToggleCollapsed }: SidebarProps) => {
    const { logout, user } = useAuthStore();
    const { projects, isLoading, fetchProjects } = useProjects();
    const navigate = useNavigate();
    const location = useLocation();

    const [projectsOpen, setProjectsOpen] = useState(true);
    const [archivedOpen, setArchivedOpen] = useState(false);
    const [archivedProjects, setArchivedProjects] = useState<any[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);

    const { t, i18n } = useTranslation();

    // Fetch active projects
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Fetch archived projects - reload when active projects list changes
    useEffect(() => {
        const loadArchived = async () => {
            try {
                const res = await api.get('/projects/archived');
                setArchivedProjects(res.data.projects || []);
            } catch (err) {
                console.error('Failed to load archived projects:', err);
                setArchivedProjects([]);
            }
        };
        loadArchived();
    }, [projects]); // Re-run when projects array changes (after archive/unarchive)

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    // Language switcher state
    const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
    const openLangMenu = (e: React.MouseEvent<HTMLElement>) => setLangAnchorEl(e.currentTarget);
    const closeLangMenu = () => setLangAnchorEl(null);

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('jdu_lang', lang);
        closeLangMenu();
        toast.success(`Language changed to ${lang === 'en' ? 'English' : lang === 'uz' ? 'O\'zbekcha' : '日本語'}`);
    };

    // Get project title - supports both JSONB name and legacy title_* columns
    const getTitle = (project: any) => {
        // Check for JSONB name field first
        if (project.name && isLocalizedContent(project.name)) {
            const lang = i18n.language === 'jp' ? 'ja' : i18n.language;
            return project.name[lang] || project.name.en || project.name.uz || 'Project';
        }
        // Fallback to legacy columns
        if (i18n.language === 'jp' && project.title_jp) return project.title_jp;
        if (i18n.language === 'ja' && project.title_jp) return project.title_jp;
        if (i18n.language === 'en' && project.title_en) return project.title_en;
        return project.title_uz || project.title_en || 'Project';
    };

    const sidebarWidth = isCollapsed ? 64 : 260;

    const sortedProjects = useMemo(() => {
        // Backend returns ORDER BY created_at DESC already, but keep stable in UI.
        return [...projects];
    }, [projects]);

    const getLightColor = (hex: string) => {
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return 'rgba(107, 114, 128, 0.15)';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, 0.16)`;
    };

    const getTextColor = (hex: string) => {
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return '#6B7280';
        return hex;
    };

    const openProfileMenu = (e: React.MouseEvent<HTMLElement>) => setProfileAnchorEl(e.currentTarget);
    const closeProfileMenu = () => setProfileAnchorEl(null);

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // ignore
        } finally {
            logout();
            navigate('/login');
        }
    };

    return (
        <>
            <motion.aside
                animate={{ width: sidebarWidth }}
                transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
                className="h-screen bg-[#F7F8FA] dark:bg-space-900 border-r border-[#E5E7EB] dark:border-space-700 flex flex-col fixed left-0 top-0 z-50 text-sm font-inter overflow-hidden transition-colors duration-200"
                style={{ width: sidebarWidth }}
            >
                {/* Top Header */}
                <div className={clsx("pt-4", isCollapsed ? "px-2" : "px-4")}>
                    <div className={clsx("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
                        {!isCollapsed && (
                            <button
                                type="button"
                                onClick={() => navigate('/projects')}
                                className="flex items-center gap-2 group hover:bg-gray-200/50 dark:hover:bg-space-800 px-2 py-2 -ml-2 rounded-lg transition-colors"
                            >
                                {/* Image Logo */}
                                <img
                                    src="/logo.png"
                                    alt="J / Space"
                                    className="w-10 h-10 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                                />

                                {/* Brand Text */}
                                <div className="flex items-center text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    <span>J</span>
                                    <span className="text-violet-500 mx-1.5 opacity-60">/</span>
                                    <span>Space</span>
                                </div>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onToggleCollapsed}
                            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            className={clsx(
                                "h-9 w-9 rounded-lg border border-gray-200 dark:border-space-700 bg-white dark:bg-space-800 shadow-sm hover:bg-gray-50 dark:hover:bg-space-700 transition-colors flex items-center justify-center",
                                isCollapsed ? "" : "ml-2"
                            )}
                        >
                            {isCollapsed ? (
                                <ChevronRight size={16} className="text-gray-600" />
                            ) : (
                                <ChevronLeft size={16} className="text-gray-600" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Search (hidden when collapsed) */}
                {!isCollapsed && (
                    <div className="px-4 mt-3 mb-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-space-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder={t('sidebar.search')}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-space-800 border border-gray-200 dark:border-space-700 rounded-lg text-sm text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-space-500 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 focus:border-purple-300 dark:focus:border-purple-600 transition-all shadow-sm"
                            />
                        </div>
                    </div>
                )}

                {/* 3. Dashboard */}
                <div className={clsx("mb-2 mt-4", isCollapsed ? "px-2" : "px-3")}>
                    <NavItem
                        icon={<LayoutGrid size={18} className={isActive('/projects') ? "text-purple-600" : "text-gray-500"} />}
                        label={t('sidebar.dashboard')}
                        active={isActive('/projects')}
                        onClick={() => navigate('/projects')}
                        isCollapsed={isCollapsed}
                    />
                </div>

                {/* 4. Invitations */}
                <div className={clsx("mb-2", isCollapsed ? "px-2" : "px-3")}>
                    <InvitationsDropdown isCollapsed={isCollapsed} />
                </div>

                {/* 5. My Tasks */}
                <div className={clsx("mb-2", isCollapsed ? "px-2" : "px-3")}>
                    <NavItem
                        icon={<CheckCircle size={18} className={isActive('/my-tasks') ? "text-purple-600" : "text-gray-500"} />}
                        label={t('sidebar.my_tasks')}
                        active={isActive('/my-tasks')}
                        onClick={() => navigate('/my-tasks')}
                        isCollapsed={isCollapsed}
                    />
                </div>

                {/* 4. Projects Section */}
                <div className={clsx("flex-1 overflow-y-auto py-2 custom-scrollbar", isCollapsed ? "px-2" : "px-3")}>
                    <div
                        className={clsx(
                            "flex items-center justify-between group text-gray-500 dark:text-space-400 hover:text-gray-900 dark:hover:text-white mb-1 px-3 py-1.5",
                            isCollapsed ? "cursor-default" : "cursor-pointer"
                        )}
                        onClick={() => setProjectsOpen(!projectsOpen)}
                    >
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
                            {!isCollapsed && (
                                <>
                                    {projectsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    {t('sidebar.projects')}
                                </>
                            )}
                        </div>
                        <button
                            type="button"
                            className={clsx(
                                "p-1 rounded hover:bg-white/70 transition-colors",
                                isCollapsed ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCreateModalOpen(true);
                            }}
                            aria-label={t('sidebar.create_project')}
                        >
                            <Plus size={14} className="text-gray-500 hover:text-purple-600" />
                        </button>
                    </div>

                    {projectsOpen && (
                        <div className="space-y-0.5">
                            {/* Skeleton Loader */}
                            {isLoading && projects.length === 0 && (
                                <div className="space-y-2 mt-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={clsx("flex items-center gap-3 px-3 py-2 animate-pulse", isCollapsed && "justify-center")}>
                                            <div className="w-5 h-5 rounded bg-gray-200" />
                                            {!isCollapsed && <div className="h-3 bg-gray-200 rounded flex-1" />}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Project List */}
                            {sortedProjects.map((p: any) => (
                                <ProjectItem
                                    key={p.id}
                                    label={getTitle(p)}
                                    color={p.color_code}
                                    active={location.pathname.startsWith(`/projects/${p.id}`)}
                                    onClick={() => navigate(`/projects/${p.id}`)}
                                    bgColor={getLightColor(p.color_code)}
                                    textColor={getTextColor(p.color_code)}
                                    isCollapsed={isCollapsed}
                                />
                            ))}

                            {/* Archived Section */}
                            {archivedProjects.length > 0 && !isCollapsed && (
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <div
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 cursor-pointer"
                                        onClick={() => setArchivedOpen(!archivedOpen)}
                                    >
                                        {archivedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        <Archive size={12} />
                                        {t('sidebar.archived')}
                                        <span className="ml-1 text-[10px] bg-gray-200 px-1.5 py-0.5 rounded-full">
                                            {archivedProjects.length}
                                        </span>
                                    </div>
                                    {archivedOpen && (
                                        <div className="space-y-0.5 mt-1 opacity-60">
                                            {archivedProjects.map((p: any) => (
                                                <ProjectItem
                                                    key={p.id}
                                                    label={getTitle(p)}
                                                    color="#9CA3AF"
                                                    active={location.pathname.startsWith(`/projects/${p.id}`)}
                                                    onClick={() => navigate(`/projects/${p.id}/tasks`)}
                                                    bgColor="rgba(156, 163, 175, 0.15)"
                                                    textColor="#9CA3AF"
                                                    isCollapsed={isCollapsed}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 5. Bottom Section with Theme Toggle & Language Switcher */}
                <div className="p-3 border-t border-gray-200 dark:border-space-700 mt-auto bg-[#F7F8FA] dark:bg-space-900 space-y-2 transition-colors">
                    {/* Theme Toggle */}
                    <ThemeToggleButton isCollapsed={isCollapsed} />

                    {/* Language Switcher */}
                    <button
                        type="button"
                        onClick={openLangMenu}
                        className={clsx(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-space-800 hover:shadow-sm transition-all text-sm",
                            isCollapsed ? "justify-center" : ""
                        )}
                    >
                        <Globe size={16} className="text-gray-500 dark:text-space-400" />
                        {!isCollapsed && (
                            <>
                                <span className="text-gray-600 dark:text-space-400">
                                    {i18n.language === 'en' ? '🇺🇸 EN' : i18n.language === 'uz' ? '🇺🇿 UZ' : '🇯🇵 JA'}
                                </span>
                                <ChevronDown size={12} className="text-gray-400 dark:text-space-500 ml-auto" />
                            </>
                        )}
                    </button>

                    {/* User Profile */}
                    <button
                        type="button"
                        onClick={openProfileMenu}
                        className={clsx(
                            "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-space-800 hover:shadow-sm transition-all",
                            isCollapsed ? "justify-center" : ""
                        )}
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm overflow-hidden">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt={user.full_name || 'User'} className="w-full h-full object-cover" />
                            ) : (
                                user?.full_name?.charAt(0) || 'U'
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.full_name || 'User'}</p>
                                <Settings size={14} className="text-gray-400 hover:text-gray-600" />
                            </div>
                        )}
                    </button>
                </div>
            </motion.aside>

            {/* Create Project Modal */}
            <CreateProjectModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {/* Language Switcher Menu */}
            <Menu
                anchorEl={langAnchorEl}
                open={Boolean(langAnchorEl)}
                onClose={closeLangMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <MenuItem onClick={() => changeLanguage('en')} selected={i18n.language === 'en'}>
                    🇺🇸 English
                </MenuItem>
                <MenuItem onClick={() => changeLanguage('uz')} selected={i18n.language === 'uz'}>
                    🇺🇿 O'zbekcha
                </MenuItem>
                <MenuItem onClick={() => changeLanguage('ja')} selected={i18n.language === 'ja' || i18n.language === 'jp'}>
                    🇯🇵 日本語
                </MenuItem>
            </Menu>

            {/* Profile Menu */}
            <Menu
                anchorEl={profileAnchorEl}
                open={Boolean(profileAnchorEl)}
                onClose={closeProfileMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <MenuItem
                    onClick={() => {
                        closeProfileMenu();
                        navigate('/settings');
                    }}
                >
                    {t('sidebar.profile')}
                </MenuItem>
                <MenuItem
                    onClick={async () => {
                        closeProfileMenu();
                        await handleLogout();
                    }}
                >
                    {t('sidebar.logout')}
                </MenuItem>
            </Menu>
        </>
    );
};

// --- Helper Components ---

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
    count?: number;
    compact?: boolean;
    isCollapsed?: boolean;
}

const NavItem = ({ icon, label, active, onClick, count, compact, isCollapsed }: NavItemProps) => (
    <button
        onClick={onClick}
        className={clsx(
            "w-full flex items-center px-3 rounded-lg transition-all duration-200 group relative",
            compact ? "py-1.5 text-xs" : "py-2 text-sm",
            active
                ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-800"
                : "text-gray-600 dark:text-space-400 hover:bg-white/60 dark:hover:bg-space-800 hover:text-gray-900 dark:hover:text-white",
            isCollapsed ? "justify-center" : ""
        )}
    >
        <div className={clsx("flex items-center justify-center", active ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-space-400 group-hover:text-gray-700 dark:group-hover:text-white")}>
            {icon}
        </div>
        {!isCollapsed && (
            <>
                <span className="ml-3 font-medium truncate">{label}</span>
                {count !== undefined && (
                    <span className={clsx("ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold", active ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400" : "bg-gray-100 dark:bg-space-700 text-gray-500 dark:text-space-400")}>{count}</span>
                )}
            </>
        )}
    </button>
);

// Theme Toggle Button Component
const ThemeToggleButton = ({ isCollapsed }: { isCollapsed: boolean }) => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={clsx(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-space-800 hover:shadow-sm transition-all text-sm",
                isCollapsed ? "justify-center" : ""
            )}
        >
            {isDark ? (
                <Sun size={16} className="text-amber-400" />
            ) : (
                <Moon size={16} className="text-gray-500" />
            )}
            {!isCollapsed && (
                <span className="text-gray-600 dark:text-space-400">
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                </span>
            )}
        </button>
    );
};

interface ProjectItemProps {
    label: string;
    color?: string;
    active: boolean;
    onClick: () => void;
    bgColor: string;
    textColor: string;
    isCollapsed: boolean;
}

const ProjectItem = ({ label, active, onClick, bgColor, textColor, isCollapsed }: ProjectItemProps) => {
    const safeLabel = label || 'Project';
    const firstLetter = safeLabel.charAt(0).toUpperCase();

    return (
        <button
            onClick={onClick}
            className={clsx(
                "w-full flex items-center px-3 py-1.5 rounded-lg transition-all duration-200 text-sm group",
                active
                    ? "bg-purple-50 text-purple-700 border border-purple-100"
                    : "text-gray-600 hover:bg-white/60 hover:text-gray-900",
                isCollapsed ? "justify-center" : ""
            )}
        >
            <div
                className={clsx(
                    "flex items-center justify-center rounded-md font-bold text-xs",
                    isCollapsed ? "w-6 h-6" : "w-6 h-6 mr-3"
                )}
                style={{ backgroundColor: bgColor, color: textColor }}
            >
                {firstLetter}
            </div>
            {!isCollapsed && <span className="font-medium truncate">{safeLabel}</span>}
        </button>
    );
};
