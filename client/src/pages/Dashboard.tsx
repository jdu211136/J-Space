import React from 'react';
import { useTranslation } from 'react-i18next';
import { FolderKanban, CheckCircle2, Clock, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, color, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
    >
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
                <Icon size={24} />
            </div>
        </div>
    </motion.div>
);

const Dashboard = () => {
    const { t } = useTranslation();

    // Mock data
    const stats = [
        { title: t('dashboard.total_projects'), value: '12', icon: FolderKanban, color: 'indigo' },
        { title: t('dashboard.completed_tasks'), value: '148', icon: CheckCircle2, color: 'emerald' },
        { title: t('dashboard.upcoming_deadlines'), value: '5', icon: Clock, color: 'rose' },
    ];

    const activities = [
        { user: 'Ali', action: 'completed task', target: 'Design Homepage', time: '2 mins ago' },
        { user: 'Sato', action: 'created project', target: 'Mobile App', time: '1 hour ago' },
        { user: 'John', action: 'commented on', target: 'API Integration', time: '3 hours ago' },
    ];

    return (
        <div className="p-8 space-y-8 font-inter">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('common.dashboard')}</h2>
                <p className="text-gray-500">{t('dashboard.welcome')}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} delay={index * 0.1} />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Weekly Goal */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">{t('dashboard.weekly_goal')}</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">32 / 40 tasks completed</span>
                            <span className="text-indigo-600 font-medium">80%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                                style={{ width: '80%' }}
                            />
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            You're doing great! Just 8 more tasks to reach your weekly goal.
                        </p>
                    </div>
                </div>

                {/* Activity Stream */}
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="text-indigo-500" size={20} />
                        <h3 className="text-xl font-bold text-gray-900">{t('dashboard.activity_stream')}</h3>
                    </div>
                    <div className="space-y-6">
                        {activities.map((activity, index) => (
                            <div key={index} className="flex gap-4 relative">
                                {index !== activities.length - 1 && (
                                    <div className="absolute left-2 top-8 w-0.5 h-full bg-gray-100" />
                                )}
                                <div className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200 mt-1 shrink-0" />
                                <div>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-bold text-gray-900">{activity.user}</span> {activity.action}{' '}
                                        <span className="text-indigo-600 font-medium">{activity.target}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
