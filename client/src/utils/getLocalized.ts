/**
 * Localization Helper for JSONB Multilingual Content
 * Handles both legacy string content and new JSONB {en, uz, ja} objects
 */

type LocalizedContent = {
    en?: string;
    uz?: string;
    ja?: string;
    [key: string]: string | undefined | boolean;
};

/**
 * Get localized content from a JSONB object or legacy string
 * @param content - The content (string or JSONB object)
 * @param currentLang - Current language code ('en', 'uz', 'ja', 'jp')
 * @returns The localized string
 */
export function getLocalizedContent(
    content: string | LocalizedContent | null | undefined,
    currentLang: string
): string {
    // Handle null/undefined
    if (!content) return '';

    // If it's already a string (legacy data), return it
    if (typeof content === 'string') {
        // Try to parse as JSON in case it's a stringified object
        try {
            const parsed = JSON.parse(content);
            if (typeof parsed === 'object' && parsed !== null) {
                return getLocalizedContent(parsed, currentLang);
            }
        } catch {
            // Not JSON, return as-is
            return content;
        }
        return content;
    }

    // Normalize 'jp' to 'ja' for consistency
    const lang = currentLang === 'jp' ? 'ja' : currentLang;

    // If it's an object, get the localized value
    if (typeof content === 'object') {
        // Try preferred language first
        if (content[lang] && typeof content[lang] === 'string') {
            return content[lang];
        }

        // Fallback order: en -> uz -> ja -> first available
        if (content.en) return content.en;
        if (content.uz) return content.uz;
        if (content.ja) return content.ja;

        // Return first available string value
        for (const key of Object.keys(content)) {
            const val = content[key];
            if (typeof val === 'string' && val.trim() !== '') {
                return val;
            }
        }
    }

    return '';
}

/**
 * Hook-friendly version that can be used with useTranslation
 * Returns a function that takes content and returns localized string
 */
export function createLocalizer(currentLang: string) {
    return (content: string | LocalizedContent | null | undefined): string => {
        return getLocalizedContent(content, currentLang);
    };
}

export default getLocalizedContent;
