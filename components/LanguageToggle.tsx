import React from 'react';
import { useLanguage } from '../contexts/LanguageProvider';

export const LanguageToggle: React.FC = () => {
    const { language, toggleLanguage } = useLanguage();

    return (
        <button
            onClick={toggleLanguage}
            className="p-2.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors font-semibold"
            aria-label={`Switch to ${language === 'en' ? 'Turkish' : 'English'}`}
        >
            {language === 'en' ? 'TR' : 'EN'}
        </button>
    );
};