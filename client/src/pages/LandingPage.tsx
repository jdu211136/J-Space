import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sun, Moon, Globe, ArrowRight, Layout, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// --- Components (Reused/Shared) ---

const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);

    // Removed RU as requested, limited to EN, JA, UZ
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

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-space-900 rounded-xl shadow-xl border border-gray-100 dark:border-space-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
                </div>
            )}
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

// --- Main Landing Page ---

const LandingPage = () => {
    const { t } = useTranslation();

    const features = [
        {
            icon: <Globe className="text-violet-500" size={24} />,
            title: t('landing.features.multiLang'),
            desc: t('landing.features.multiLangDesc')
        },
        {
            icon: <Layout className="text-indigo-500" size={24} />,
            title: t('landing.features.kanban'),
            desc: t('landing.features.kanbanDesc')
        },
        {
            icon: <Moon className="text-sky-500" size={24} />,
            title: t('landing.features.darkMode'),
            desc: t('landing.features.darkModeDesc')
        }
    ];

    return (
        <div className="min-h-screen relative overflow-hidden bg-gray-50 dark:bg-space-950 transition-colors duration-500 font-inter text-gray-900 dark:text-gray-100 flex flex-col">

            {/* Background Ambience */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-violet-600/15 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/15 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow delay-1000 pointer-events-none" />

            {/* Navbar */}
            <header className="w-full px-6 py-6 md:px-12 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <span className="text-white font-bold text-xl font-outfit">J</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        J / Space
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <LanguageSelector />
                    <ThemeToggle />
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 text-center mt-[-80px] md:mt-0">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-4xl mx-auto space-y-8"
                >
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-800 dark:from-white dark:via-violet-200 dark:to-indigo-300">
                            {t('landing.heroTitle')}
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 dark:text-space-300 max-w-2xl mx-auto leading-relaxed">
                        {t('landing.heroSubtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link to="/register">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-lg shadow-lg shadow-violet-500/30 flex items-center gap-2 transition-all"
                            >
                                {t('landing.getStarted')} <ArrowRight size={20} />
                            </motion.button>
                        </Link>
                        <Link to="/login">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 rounded-full bg-white/50 dark:bg-space-800/50 backdrop-blur-md border border-gray-200 dark:border-space-700 hover:bg-white/80 dark:hover:bg-space-700/80 text-gray-900 dark:text-white font-medium text-lg transition-all"
                            >
                                {t('landing.signIn')}
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>
            </main>

            {/* Features Grid */}
            <section className="px-6 py-12 md:pb-20 relative z-10">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="p-6 rounded-2xl bg-white/30 dark:bg-space-900/40 backdrop-blur-md border border-white/40 dark:border-space-700 shadow-xl hover:shadow-2xl hover:bg-white/40 dark:hover:bg-space-900/60 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-space-800 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                            <p className="text-gray-600 dark:text-space-400 leading-relaxed">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
