import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Sun, Moon, Globe, ArrowRight, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';

// --- Validation Schema ---
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

type LoginForm = z.infer<typeof loginSchema>;

// --- Components ---

const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'ja', label: '日本語', flag: '🇯🇵' },
        { code: 'uz', label: 'Oʻzbek', flag: '🇺🇿' },
    ];

    const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

    const handleLanguageChange = (code: string) => {
        i18n.changeLanguage(code);
        localStorage.setItem('jdu_lang', code);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 dark:bg-space-800/50 backdrop-blur-md border border-gray-200 dark:border-space-700 hover:border-violet-500/50 transition-all text-sm font-medium text-gray-700 dark:text-gray-200"
            >
                <Globe size={14} className="text-violet-500" />
                <span>{currentLang.code.toUpperCase()}</span>
                <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-space-900 rounded-xl shadow-xl border border-gray-100 dark:border-space-700 overflow-hidden z-50"
                    >
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${i18n.language === lang.code
                                    ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-space-800'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-base">{lang.flag}</span>
                                    {lang.label}
                                </span>
                                {i18n.language === lang.code && <Check size={14} />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ThemeToggle = () => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white/50 dark:bg-space-800/50 backdrop-blur-md border border-gray-200 dark:border-space-700 hover:border-violet-500/50 text-gray-700 dark:text-yellow-400 transition-all shadow-sm group"
            aria-label="Toggle Theme"
        >
            {isDark ? (
                <Moon size={18} className="transition-transform group-hover:-rotate-12" />
            ) : (
                <Sun size={18} className="text-amber-500 transition-transform group-hover:rotate-45" />
            )}
        </button>
    );
};

const LoginPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const setUser = useAuthStore((state) => state.setUser);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        try {
            const response = await api.post('/auth/login', data);
            setUser(response.data.user);
            toast.success(t('auth.login_title'));
            navigate('/my-tasks');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-space-950 transition-colors duration-500 font-inter text-gray-900 dark:text-gray-100">
            {/* --- Ambient Background Glow --- */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow delay-1000" />

            {/* --- Header / Navbar --- */}
            <header className="absolute top-0 left-0 right-0 p-6 md:p-8 flex justify-between items-center z-10">
                {/* Logo */}
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <span className="text-white font-bold text-xl font-outfit">J</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        J / Space
                    </span>
                </Link>

                {/* Controls */}
                <div className="flex items-center gap-4">
                    <LanguageSelector />
                    <ThemeToggle />
                </div>
            </header>

            {/* --- Main Content (Login Card) --- */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md mx-4 relative z-20"
            >
                <div className="bg-white/70 dark:bg-space-900/60 backdrop-blur-xl border border-white/20 dark:border-space-700 rounded-3xl p-8 md:p-10 shadow-2xl dark:shadow-space-950/50">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 mb-2">
                            {t('auth.welcome')}
                        </h1>
                        <p className="text-gray-500 dark:text-space-400">
                            {t('auth.login_subtitle', 'Enter your credentials to access your account')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email Input */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-space-300 block">
                                {t('auth.email')}
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-3.5 text-gray-400 dark:text-space-500 group-focus-within:text-violet-500 transition-colors" size={20} />
                                <input
                                    {...register('email')}
                                    type="email"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50/50 dark:bg-space-950/50 border border-gray-200 dark:border-space-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-space-600 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>
                            {errors.email && (
                                <p className="text-sm text-red-500 pl-1">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password Input */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-space-300 block">
                                    {t('auth.password')}
                                </label>
                                <a href="#" className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors">
                                    {t('auth.forgot_password', 'Forgot password?')}
                                </a>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-3.5 text-gray-400 dark:text-space-500 group-focus-within:text-violet-500 transition-colors" size={20} />
                                <input
                                    {...register('password')}
                                    type="password"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50/50 dark:bg-space-950/50 border border-gray-200 dark:border-space-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-space-600 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && (
                                <p className="text-sm text-red-500 pl-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>{t('auth.login_button')}</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-space-800 text-center">
                        <p className="text-gray-500 dark:text-space-400 text-sm">
                            {t('auth.no_account')}{' '}
                            <Link
                                to="/register"
                                className="font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors inline-block"
                            >
                                {t('auth.register_button')}
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;
