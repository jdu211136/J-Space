import { create } from 'zustand';

interface User {
    id: string;
    email: string;
    full_name: string;
    preferred_lang: 'uz' | 'jp' | 'en';
    avatar_url?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
    setIsAuthenticated: (status: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setIsAuthenticated: (status) => set({ isAuthenticated: status }),
    logout: () => set({ user: null, isAuthenticated: false }),
}));
