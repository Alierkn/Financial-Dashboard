import React from 'react';
import { useLanguage } from '../contexts/LanguageProvider';

// By defining this type, we ensure that we can only use valid translation keys.
// This prevents typos and makes the code more robust.
type AriaTranslationKey = 'switchToEnglish' | 'switchToTurkish' | 'switchToItalian' | 'switchToArabic';

export const LanguageToggle: React.FC = () => {
    const { language, toggleLanguage, t } = useLanguage();

    // This configuration map keeps all language-specific toggle information in one place.
    // Based on the *current* language, it determines:
    // 1. `nextDisplay`: The text to show on the button (e.g., 'TR').
    // 2. `ariaKey`: The translation key for the button's accessible name.
    const configMap = {
        en: { nextDisplay: 'TR', ariaKey: 'switchToTurkish' },
        tr: { nextDisplay: 'IT', ariaKey: 'switchToItalian' },
        it: { nextDisplay: 'AR', ariaKey: 'switchToArabic' },
        ar: { nextDisplay: 'EN', ariaKey: 'switchToEnglish' },
    };
    
    // Select the correct configuration based on the current language
    const currentConfig = configMap[language];

    return (
        <button
            onClick={toggleLanguage}
            className="p-2.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors font-semibold w-12 text-center"
            // The key for translation is now correctly looked up and passed to the t() function.
            // This fixes the accessibility issue of untranslated labels for screen readers.
            aria-label={t(currentConfig.ariaKey as AriaTranslationKey)}
        >
            {currentConfig.nextDisplay}
        </button>
    );
};
