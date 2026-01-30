import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CalendarPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                // Fetch all projects first to get project IDs
                const projectsRes = await api.get('/projects');
                const projects = projectsRes.data.projects;

                let allTasks: any[] = [];

                // Then fetch tasks for each project
                // Note: In a real app, you'd have an endpoint to get all tasks for the user across projects
                for (const project of projects) {
                    try {
                        const tasksRes = await api.get(`/tasks/project/${project.id}`);
                        const projectTasks = tasksRes.data.tasks.map((task: any) => ({
                            id: task.id,
                            title: task.title_display, // Backend handles fallback logic
                            start: task.deadline,
                            backgroundColor: getPriorityColor(task.priority),
                            borderColor: getPriorityColor(task.priority),
                            extendedProps: {
                                projectId: project.id,
                                status: task.status,
                                priority: task.priority
                            }
                        }));
                        allTasks = [...allTasks, ...projectTasks];
                    } catch (err) {
                        console.error(`Failed to load tasks for project ${project.id}`);
                    }
                }
                setEvents(allTasks);

            } catch (error) {
                toast.error('Failed to load calendar events');
            }
        };

        fetchTasks();
    }, [i18n.language]);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return '#ef4444'; // red-500
            case 'mid': return '#eab308'; // yellow-500
            case 'low': return '#3b82f6'; // blue-500
            default: return '#6366f1'; // indigo-500
        }
    };

    const handleEventClick = (info: any) => {
        const projectId = info.event.extendedProps.projectId;
        navigate(`/projects/${projectId}`);
    };

    return (
        <div className="h-[calc(100vh-120px)] bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">{t('common.calendar')}</h2>
                    <p className="text-slate-400">View your deadlines</p>
                </div>
            </div>

            <div className="calendar-wrapper h-full text-slate-200">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    events={events}
                    eventClick={handleEventClick}
                    height="100%"
                    dayMaxEvents={true}
                    firstDay={1}
                />
            </div>

            <style>{`
                .fc {
                    --fc-border-color: #334155;
                    --fc-page-bg-color: transparent;
                    --fc-neutral-bg-color: #1e293b;
                    --fc-list-event-hover-bg-color: #334155;
                    --fc-today-bg-color: #1e293b66;
                }
                .fc-col-header-cell-cushion, .fc-daygrid-day-number {
                    color: #e2e8f0;
                    text-decoration: none !important;
                }
                .fc-button-primary {
                    background-color: #4f46e5 !important;
                    border-color: #4f46e5 !important;
                }
                .fc-button-primary:hover {
                    background-color: #4338ca !important;
                    border-color: #4338ca !important;
                }
                .fc-button-active {
                    background-color: #3730a3 !important;
                    border-color: #3730a3 !important;
                }
                .fc-daygrid-day:hover {
                    background-color: #1e293b;
                }
            `}</style>
        </div>
    );
};

export default CalendarPage;
