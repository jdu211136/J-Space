/**
 * Translation Service using Google Translate API
 * Provides auto-translation for multilingual content (en, uz, ja)
 * 
 * IMPORTANT: This module ensures the ORIGINAL source text is NEVER overwritten.
 * The source language slot is assigned FIRST before any translation.
 */

import translate from 'google-translate-api-x';

export type SupportedLang = 'en' | 'uz' | 'ja';

export interface TranslatedContent {
    en: string;
    uz: string;
    ja: string;
    translation_locked?: boolean;
}

/**
 * Main translation function with STRICT key assignment
 * Ensures the user's original input is preserved in the source language slot
 * 
 * @param text - The original text from the user
 * @param sourceLang - The language the user typed in ('en', 'uz', 'ja')
 * @returns Object with translations for all supported languages
 */
export const translateContent = async (
    text: string,
    sourceLang: string
): Promise<TranslatedContent> => {
    // Handle empty text
    if (!text || text.trim() === '') {
        return { en: '', uz: '', ja: '', translation_locked: false };
    }

    // Normalize source language ('jp' -> 'ja')
    const normalizedSource = sourceLang === 'jp' ? 'ja' : sourceLang;

    // 1. Initialize result object - CRITICAL: Set source text FIRST
    // This ensures the user's input is NEVER lost or overwritten
    const results: TranslatedContent = {
        en: '',
        uz: '',
        ja: '',
        translation_locked: false
    };

    // 2. Assign original text to its correct slot BEFORE any translation
    // Using type assertion to ensure strict key assignment
    if (normalizedSource === 'en' || normalizedSource === 'uz' || normalizedSource === 'ja') {
        results[normalizedSource as SupportedLang] = text;
    } else {
        // Default to 'en' if unknown language
        results.en = text;
    }

    // 3. Define target languages (excluding source)
    const targets = (['en', 'uz', 'ja'] as SupportedLang[]).filter(
        lang => lang !== normalizedSource
    );

    // 4. Translate to each target language
    try {
        const translations = await Promise.all(
            targets.map(async (target) => {
                try {
                    const res = await translate(text, {
                        from: normalizedSource,
                        to: target
                    });
                    return { lang: target, text: res.text };
                } catch (error) {
                    console.error(`Translation to ${target} failed:`, error);
                    // Fallback: use original text if translation fails
                    return { lang: target, text: text };
                }
            })
        );

        // 5. Assign translations to their slots
        // IMPORTANT: We only assign to TARGET slots, never touch source slot
        translations.forEach(t => {
            results[t.lang] = t.text;
        });

    } catch (err) {
        console.error('Translation service error:', err);
        // Fallback: fill all empty slots with original text
        (['en', 'uz', 'ja'] as SupportedLang[]).forEach(lang => {
            if (!results[lang]) {
                results[lang] = text;
            }
        });
    }

    return results;
};

/**
 * Alias for backward compatibility
 */
export const translateToAllLanguages = translateContent;

/**
 * Translate a single text to a specific target language
 * @param text - The text to translate
 * @param sourceLang - The source language
 * @param targetLang - The target language
 * @returns Translated text or original on failure
 */
export async function translateText(
    text: string,
    sourceLang: SupportedLang,
    targetLang: SupportedLang
): Promise<string> {
    if (!text || text.trim() === '' || sourceLang === targetLang) {
        return text;
    }

    try {
        const result = await translate(text, {
            from: sourceLang,
            to: targetLang
        });
        return result.text;
    } catch (error) {
        console.error(`Translation failed (${sourceLang} -> ${targetLang}):`, error);
        return text; // Return original on failure
    }
}

/**
 * Merge new translation with existing JSONB content
 * Only updates empty or undefined language values
 * @param existing - Existing JSONB translation object
 * @param updates - New translations to merge
 * @returns Merged translation object
 */
export function mergeTranslations(
    existing: Partial<TranslatedContent> | null,
    updates: Partial<TranslatedContent>
): TranslatedContent {
    const merged: TranslatedContent = {
        en: existing?.en || updates.en || '',
        uz: existing?.uz || updates.uz || '',
        ja: existing?.ja || updates.ja || '',
        translation_locked: existing?.translation_locked || false
    };

    // Override with updates if translation is not locked
    if (!merged.translation_locked) {
        if (updates.en) merged.en = updates.en;
        if (updates.uz) merged.uz = updates.uz;
        if (updates.ja) merged.ja = updates.ja;
    }

    return merged;
}

/**
 * Get localized string from JSONB translation object
 * @param content - The JSONB translation object
 * @param lang - The preferred language
 * @returns The localized string or first available translation
 */
export function getLocalizedString(
    content: TranslatedContent | string | null | undefined,
    lang: SupportedLang
): string {
    if (!content) return '';

    // If it's already a string, return it
    if (typeof content === 'string') return content;

    // Try to get the preferred language
    if (content[lang]) return content[lang];

    // Fallback order: en -> uz -> ja
    return content.en || content.uz || content.ja || '';
}

export default {
    translateContent,
    translateToAllLanguages,
    translateText,
    mergeTranslations,
    getLocalizedString
};

