import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import { ThemeProvider as AppThemeProvider, useTheme } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import LandingPage from './pages/LandingPage';
import ProjectList from './pages/ProjectList';
import ProjectPage, { TasksTab, OverviewTab, DocumentsTab, SettingsTab } from './pages/ProjectPage';
import CalendarPage from './pages/CalendarPage';
import MyTasks from './components/tasks/MyTasks';
import Settings from './pages/Settings';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './i18n';

// Wrapper component to access theme for Toaster
const ThemedToaster = () => {
  const { isDark } = useTheme();
  return <Toaster richColors position="top-right" theme={isDark ? 'dark' : 'light'} />;
};

function App() {
  return (
    <AppThemeProvider>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Redirect root of protected to my-tasks or projects if visited directly via manual types, but usually / is landing now */}
                <Route path="/dashboard" element={<Navigate to="/my-tasks" replace />} />
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/projects" element={<ProjectList />} />

                {/* Project with nested tabs */}
                <Route path="/projects/:projectId" element={<ProjectPage />}>
                  <Route index element={<Navigate to="tasks" replace />} />
                  <Route path="tasks" element={<TasksTab />} />
                  <Route path="overview" element={<OverviewTab />} />
                  <Route path="documents" element={<DocumentsTab />} />
                  <Route path="settings" element={<SettingsTab />} />
                </Route>

                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/my-tasks" replace />} />
          </Routes>
          <ThemedToaster />
        </BrowserRouter>
      </ThemeProvider>
    </AppThemeProvider>
  );
}

export default App;

