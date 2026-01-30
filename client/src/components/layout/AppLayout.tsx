import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';
import ErrorBoundary from '../common/ErrorBoundary';

export const AppLayout = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const sidebarWidth = isCollapsed ? 64 : 260;

    return (
        <div className="flex min-h-screen bg-white dark:bg-space-950 font-inter transition-colors duration-300">
            <ErrorBoundary>
                <Sidebar
                    isCollapsed={isCollapsed}
                    onToggleCollapsed={() => setIsCollapsed((v) => !v)}
                />
            </ErrorBoundary>
            <main
                className="flex-1 min-h-screen bg-white dark:bg-space-950 text-gray-900 dark:text-gray-200 relative transition-colors duration-300"
                style={{
                    marginLeft: sidebarWidth,
                    transition: 'margin-left 220ms ease',
                }}
            >
                {/* 
                  Main content area. 
                  "Weeek" style: Pure white canvas. 
                  No global padding here; Views handle their own layout. 
                */}
                <Outlet />
            </main>
        </div>
    );
};
