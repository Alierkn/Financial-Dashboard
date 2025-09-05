import React from 'react';
import { useLanguage } from '../contexts/LanguageProvider';

export const LanguageToggle: React.FC = () => {
    const { language, toggleLanguage } = useLanguage();

    const nextLangMap: Record<string, string> = {
        en: 'TR',
        tr: 'IT',
        it: 'AR',
        ar: 'EN'
    };
    
    const ariaLabelMap: Record<string, string> = {
        en: 'Switch to Turkish',
        tr: 'Switch to Italian',
        it: 'Switch to Arabic',
        ar: 'Switch to English'
    };

    return (
        <button
            onClick={toggleLanguage}
            className="p-2.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors font-semibold w-12 text-center"
            aria-label={ariaLabelMap[language]}
        >
            {nextLangMap[language]}
        </button>
    );
};