/**
 * TranslationService - Trilingual Evolution v2.0
 * 
 * Provides translation functionality for LocalizedContent fields.
 * Uses the strict translateContent utility to ensure source text is preserved.
 */

import { LocalizedContent } from '../types';
import { translateContent } from '../utils/translator';

type SupportedLang = 'en' | 'uz' | 'ja';

/**
 * TranslationService class
 * Handles translation of LocalizedContent objects
 */
export class TranslationService {
    /**
     * Translate text from source language to all supported languages
     * Uses the strict translateContent utility that preserves source text
     * 
     * @param text - The text to translate
     * @param sourceLang - Source language code
     * @returns LocalizedContent object with all translations
     */
    static async translate(text: string, sourceLang: SupportedLang | string = 'en'): Promise<LocalizedContent> {
        try {
            if (!text || text.trim() === '') {
                return {
                    en: '',
                    uz: '',
                    ja: '',
                    translation_locked: false
                };
            }

            // Use the strict translateContent utility
            // This ensures the source text is NEVER overwritten
            const result = await translateContent(text, sourceLang);

            return {
                en: result.en,
                uz: result.uz,
                ja: result.ja,
                translation_locked: result.translation_locked || false
            };
        } catch (error) {
            console.error('Translation error:', error);
            // Fallback: return original text for all languages
            return {
                en: text,
                uz: text,
                ja: text,
                translation_locked: false
            };
        }
    }

    /**
     * Update a specific language field in LocalizedContent
     * Respects translation_locked flag
     * 
     * @param existing - Existing LocalizedContent from DB
     * @param updates - Partial updates (e.g., { ja: "Fixed text" })
     * @param autoTranslate - If true and not locked, translate updates to other languages
     * @returns Updated LocalizedContent object
     */
    static async updateField(
        existing: LocalizedContent | null,
        updates: Partial<Record<SupportedLang, string>>,
        autoTranslate: boolean = false
    ): Promise<LocalizedContent> {
        // Start with existing or empty
        const result: LocalizedContent = existing || {
            en: '',
            uz: '',
            ja: '',
            translation_locked: false
        };

        // Check if locked
        if (result.translation_locked) {
            // Only update the specific fields provided, no translation
            if (updates.en !== undefined) result.en = updates.en;
            if (updates.uz !== undefined) result.uz = updates.uz;
            if (updates.ja !== undefined) result.ja = updates.ja;
            return result;
        }

        // Not locked - apply updates
        const updatedLangs = Object.keys(updates) as SupportedLang[];

        if (updatedLangs.length === 1 && autoTranslate) {
            // Single language update - translate to others
            const sourceLang = updatedLangs[0];
            const sourceText = updates[sourceLang] || '';

            const translated = await this.translate(sourceText, sourceLang);
            translated.translation_locked = true; // Lock after manual edit
            return translated;
        }

        // Multiple updates or no auto-translate - just apply them
        if (updates.en !== undefined) result.en = updates.en;
        if (updates.uz !== undefined) result.uz = updates.uz;
        if (updates.ja !== undefined) result.ja = updates.ja;

        // If any field was manually edited, lock it
        if (updatedLangs.length > 0) {
            result.translation_locked = true;
        }

        return result;
    }

    /**
     * Parse incoming request body to determine which language fields are being updated
     * @param body - Request body with potential title_en, title_uz, title_ja fields
     * @param fieldPrefix - Field prefix like 'title' or 'description'
     */
    static extractLanguageUpdates(
        body: Record<string, any>,
        fieldPrefix: string
    ): Partial<Record<SupportedLang, string>> | null {
        const updates: Partial<Record<SupportedLang, string>> = {};
        let hasUpdates = false;

        // Check for language-specific fields (title_en, title_uz, title_ja)
        if (body[`${fieldPrefix}_en`] !== undefined || body[`${fieldPrefix}En`] !== undefined) {
            updates.en = body[`${fieldPrefix}_en`] ?? body[`${fieldPrefix}En`];
            hasUpdates = true;
        }
        if (body[`${fieldPrefix}_uz`] !== undefined || body[`${fieldPrefix}Uz`] !== undefined) {
            updates.uz = body[`${fieldPrefix}_uz`] ?? body[`${fieldPrefix}Uz`];
            hasUpdates = true;
        }
        if (body[`${fieldPrefix}_ja`] !== undefined || body[`${fieldPrefix}Ja`] !== undefined
            || body[`${fieldPrefix}_jp`] !== undefined || body[`${fieldPrefix}Jp`] !== undefined) {
            updates.ja = body[`${fieldPrefix}_ja`] ?? body[`${fieldPrefix}Ja`]
                ?? body[`${fieldPrefix}_jp`] ?? body[`${fieldPrefix}Jp`];
            hasUpdates = true;
        }

        // Check for direct field (e.g., just 'title' as string)
        if (!hasUpdates && typeof body[fieldPrefix] === 'string') {
            // Assume it's the user's preferred language (default to en)
            updates.en = body[fieldPrefix];
            hasUpdates = true;
        }

        return hasUpdates ? updates : null;
    }

    /**
     * Get user's preferred language from request headers
     */
    static getUserLanguage(req: { headers?: Record<string, any> }): SupportedLang {
        const lang = req.headers?.['x-lang'] || req.headers?.['accept-language']?.split(',')[0];
        if (lang === 'uz' || lang === 'ja' || lang === 'jp') {
            return lang === 'jp' ? 'ja' : lang;
        }
        return 'en';
    }
}

export default TranslationService;
