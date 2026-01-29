/**
 * Trilingual Content Types
 * Defines the LocalizedContent structure for JSONB multilingual fields
 */

export interface LocalizedContent {
    en: string;           // English (Primary Source)
    uz: string;           // Uzbek (Auto-translated)
    ja: string;           // Japanese (Auto-translated)
    translation_locked?: boolean; // If true, prevent AI overwrite
}

/**
 * Creates an empty LocalizedContent object
 */
export const emptyLocalizedContent = (): LocalizedContent => ({
    en: '',
    uz: '',
    ja: '',
    translation_locked: false
});

/**
 * Creates a LocalizedContent object from a single language string
 * Used when migrating from legacy string fields
 */
export const createLocalizedContent = (
    content: string,
    sourceLang: 'en' | 'uz' | 'ja' = 'en'
): LocalizedContent => ({
    en: sourceLang === 'en' ? content : '',
    uz: sourceLang === 'uz' ? content : '',
    ja: sourceLang === 'ja' ? content : '',
    translation_locked: false
});

/**
 * Get content in the preferred language with fallback to English
 */
export const getLocalizedString = (
    content: LocalizedContent | null | undefined,
    lang: 'en' | 'uz' | 'ja' = 'en'
): string => {
    if (!content) return '';
    return content[lang] || content.en || '';
};

// ============================================================
// Database Entity Types (matching PostgreSQL schema)
// ============================================================

export interface User {
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    avatar_url?: string;
    preferred_lang: 'en' | 'uz' | 'ja';
    created_at: Date;
    updated_at: Date;
}

export interface Project {
    id: string;
    owner_id: string;
    name: LocalizedContent;           // JSONB multilingual
    description: LocalizedContent;    // JSONB multilingual
    // Legacy columns (kept for backward compatibility)
    title_uz?: string;
    title_jp?: string;
    title_en?: string;
    desc_uz?: string;
    desc_jp?: string;
    desc_en?: string;
    // Other fields
    category?: string;
    color_code?: string;
    is_public: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Task {
    id: string;
    project_id: string;
    title: LocalizedContent;          // JSONB multilingual
    description: LocalizedContent;    // JSONB multilingual
    // Legacy columns (kept for backward compatibility)
    title_uz?: string;
    title_jp?: string;
    title_en?: string;
    desc_uz?: string;
    desc_en?: string;
    desc_jp?: string;
    // Other fields
    start_date?: Date;
    end_date?: Date;
    deadline?: Date;
    status: 'todo' | 'in_progress' | 'done' | 'reviewed';
    priority: 'low' | 'mid' | 'high';
    assigned_to?: string;
    created_at: Date;
    updated_at: Date;
    // Computed/joined fields
    collaborators?: TaskCollaborator[];
}

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'declined';

export interface ProjectMember {
    id: string;
    project_id: string;
    user_id: string;
    role: MemberRole;
    status: MemberStatus;
    invited_at: Date;
    joined_at?: Date;
    // Joined user fields
    full_name?: string;
    email?: string;
    avatar_url?: string;
}

export interface TaskCollaborator {
    id: string;
    task_id: string;
    user_id: string;
    created_at: Date;
    // Joined user fields
    full_name?: string;
    email?: string;
    avatar_url?: string;
}

export interface Comment {
    id: string;
    task_id: string;
    user_id: string;
    content: LocalizedContent;        // JSONB multilingual
    created_at: Date;
    updated_at: Date;
    // Joined user fields
    author_name?: string;
    author_avatar?: string;
}

export interface TimeLog {
    id: string;
    user_id: string;
    task_id: string;
    start_time: Date;
    end_time?: Date;
    duration_seconds?: number;
    created_at: Date;
}

export type NotificationType = 'invite' | 'assignment' | 'comment' | 'mention';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    reference_id?: string;
    reference_type?: 'project_member' | 'task' | 'comment';
    is_read: boolean;
    created_at: Date;
}
