/**
 * i18n Configuration - Trilingual Evolution v2.0
 * Supports: English (en), Uzbek (uz), Japanese (ja)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import uz from './locales/uz.json';
import jp from './locales/jp.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            uz: { translation: uz },
            ja: { translation: jp }, // Use 'ja' as standard code, load from jp.json
            jp: { translation: jp }, // Alias for backward compatibility
        },
        fallbackLng: 'en',
        supportedLngs: ['en', 'uz', 'ja', 'jp'],
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'jdu_lang'
        }
    });

export default i18n;
