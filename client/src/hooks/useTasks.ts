import { useTaskStore } from '../store/taskStore';

export const useTasks = () => {
    const tasks = useTaskStore((state) => state.tasks);
    const isLoading = useTaskStore((state) => state.isLoading);
    const error = useTaskStore((state) => state.error);

    const fetchTasks = useTaskStore((state) => state.fetchTasks);
    const createTask = useTaskStore((state) => state.createTask);
    const updateTask = useTaskStore((state) => state.updateTask);
    const deleteTask = useTaskStore((state) => state.deleteTask);

    return {
        tasks,
        isLoading,
        error,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask
    };
};
