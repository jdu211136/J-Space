import React from 'react';
import { Bell, Search, Globe } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Avatar, IconButton, Badge, Menu, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';

const Topbar = () => {
    const user = useAuthStore((state) => state.user);
    const { t, i18n } = useTranslation();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        handleClose();
    };

    return (
        <header className="h-16 pl-64 fixed top-0 right-0 w-full bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50 z-40 flex items-center justify-between px-8">
            <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700/50 w-96">
                <Search size={18} className="text-slate-400" />
                <input
                    type="text"
                    placeholder={t('common.search_placeholder')}
                    className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 w-full text-sm"
                />
            </div>

            <div className="flex items-center gap-6">
                <IconButton onClick={handleMenu} className="!text-slate-400 hover:!text-indigo-400 transition-colors">
                    <Globe size={20} />
                    <span className="ml-2 text-sm font-medium uppercase">{i18n.language}</span>
                </IconButton>
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                    PaperProps={{
                        style: {
                            backgroundColor: '#1e293b',
                            color: '#e2e8f0',
                            border: '1px solid #334155',
                        },
                    }}
                >
                    <MenuItem onClick={() => changeLanguage('en')}>English</MenuItem>
                    <MenuItem onClick={() => changeLanguage('uz')}>O'zbek</MenuItem>
                    <MenuItem onClick={() => changeLanguage('jp')}>日本語</MenuItem>
                </Menu>

                <IconButton className="!text-slate-400 hover:!text-indigo-400 transition-colors">
                    <Badge badgeContent={3} color="error">
                        <Bell size={20} />
                    </Badge>
                </IconButton>

                <div className="flex items-center gap-3 pl-6 border-l border-slate-700/50">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium text-slate-200">{user?.full_name}</p>
                        <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <Avatar
                        src={user?.avatar_url}
                        alt={user?.full_name}
                        className="!w-10 !h-10 !border-2 !border-indigo-500/20"
                    >
                        {user?.full_name?.charAt(0)}
                    </Avatar>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
