import { useState } from 'react';
import { Outlet, Navigate, useLocation, useOutletContext } from 'react-router-dom';
import { CurrentProjectProvider } from '../context/CurrentProjectContext';
import { ProjectHeader } from '../components/project/ProjectHeader';
import { BoardView } from '../components/views/BoardView';
import { ListView } from '../components/views/ListView';
import { CalendarView } from '../components/views/CalendarView';
import MembersTab from '../components/project/MembersTab';
import { ProjectSettings } from '../components/project/ProjectSettings';

type ViewMode = 'list' | 'board' | 'calendar';

interface OutletContext {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
}

const ProjectPage = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const location = useLocation();

    // Check if we're at the base project route without a tab
    const isBaseRoute = /^\/projects\/[^/]+\/?$/.test(location.pathname);

    // If at base route, redirect to tasks
    if (isBaseRoute) {
        return <Navigate to="tasks" replace />;
    }

    return (
        <CurrentProjectProvider>
            <div className="flex flex-col h-full font-inter">
                <ProjectHeader viewMode={viewMode} onViewChange={setViewMode} />

                {/* Tab Content */}
                <div className="flex-1 bg-white dark:bg-space-950 overflow-hidden transition-colors duration-300">
                    <Outlet context={{ viewMode, setViewMode } satisfies OutletContext} />
                </div>
            </div>
        </CurrentProjectProvider>
    );
};

// Hook to use view mode in child routes
export const useViewMode = () => {
    return useOutletContext<OutletContext>();
};

// Tasks Tab Component (uses view mode from parent context)
export const TasksTab = () => {
    const { viewMode } = useViewMode();

    return (
        <div className="h-full p-6 overflow-hidden">
            {viewMode === 'list' && <ListView />}
            {viewMode === 'board' && <BoardView />}
            {viewMode === 'calendar' && <CalendarView />}
        </div>
    );
};

// Overview Tab Component
export const OverviewTab = () => {
    return (
        <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Project Overview</h2>
            <p className="text-gray-500 dark:text-space-400">Overview content coming soon...</p>
        </div>
    );
};

// Documents Tab Component
export const DocumentsTab = () => {
    return (
        <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Documents</h2>
            <p className="text-gray-500 dark:text-space-400">Documents list coming soon...</p>
        </div>
    );
};

// Settings Tab Component - includes Members and Danger Zone (Archive/Delete)
export const SettingsTab = () => {
    return (
        <div className="h-full overflow-y-auto">
            <MembersTab />
            <div className="border-t border-gray-200 dark:border-space-700 mt-6">
                <ProjectSettings />
            </div>
        </div>
    );
};

export default ProjectPage;

