/**
 * useLocalized Hook - Trilingual Evolution v2.0
 * 
 * Safely extracts localized strings from JSONB LocalizedContent objects.
 * Handles both legacy string fields and new JSONB format.
 */

import { useTranslation } from 'react-i18next';

/**
 * LocalizedContent type matching backend JSONB structure
 */
export interface LocalizedContent {
    en: string;
    uz: string;
    ja: string;
    translation_locked?: boolean;
}

type SupportedLang = 'en' | 'uz' | 'ja' | 'jp';

/**
 * Hook to get localized string from LocalizedContent or legacy string
 * 
 * @param content - LocalizedContent object, string, or null/undefined
 * @returns The localized string in current language, falling back to English
 * 
 * @example
 * // With JSONB content
 * const title = useLocalized(task.title);
 * 
 * // With legacy string
 * const title = useLocalized(task.title_en);
 * 
 * // Safe with null/undefined
 * const title = useLocalized(task.title); // Returns '' if null
 */
export function useLocalized(content: LocalizedContent | string | null | undefined): string {
    const { i18n } = useTranslation();

    // Handle null/undefined
    if (content == null) {
        return '';
    }

    // Handle legacy string format
    if (typeof content === 'string') {
        return content;
    }

    // Handle JSONB object
    const lang = (i18n.language as SupportedLang) || 'en';

    // Map 'jp' to 'ja' for consistency
    const normalizedLang = lang === 'jp' ? 'ja' : lang;

    // Return content in current language, fallback to English, then to any available
    return content[normalizedLang as keyof LocalizedContent] as string
        || content.en
        || content.uz
        || content.ja
        || '';
}

/**
 * Get localized string from LocalizedContent (non-hook version for use outside components)
 * 
 * @param content - LocalizedContent object or string
 * @param lang - Language code (defaults to 'en')
 */
export function getLocalizedString(
    content: LocalizedContent | string | null | undefined,
    lang: SupportedLang = 'en'
): string {
    if (content == null) return '';
    if (typeof content === 'string') return content;

    const normalizedLang = lang === 'jp' ? 'ja' : lang;
    return (content[normalizedLang as keyof LocalizedContent] as string)
        || content.en
        || '';
}

/**
 * Check if content is a LocalizedContent object
 */
export function isLocalizedContent(content: any): content is LocalizedContent {
    return content !== null
        && typeof content === 'object'
        && ('en' in content || 'uz' in content || 'ja' in content);
}

/**
 * Create a LocalizedContent object from a single string
 * Useful when creating new content from user input
 */
export function createLocalizedContent(
    text: string,
    sourceLang: SupportedLang = 'en'
): LocalizedContent {
    const normalizedLang = sourceLang === 'jp' ? 'ja' : sourceLang;
    return {
        en: normalizedLang === 'en' ? text : '',
        uz: normalizedLang === 'uz' ? text : '',
        ja: normalizedLang === 'ja' ? text : '',
        translation_locked: false
    };
}

export default useLocalized;
