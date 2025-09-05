import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageProvider';

export const LanguageToggle: React.FC = () => {
    const { language, setLanguage, availableLanguages, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const handleLanguageChange = (lang: 'en' | 'tr' | 'it' | 'ar') => {
        setLanguage(lang);
        setIsOpen(false);
    };

    const currentLanguageName = t(`language_${language}`);

    return (
        <div 
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors font-semibold w-12 text-center"
                aria-label={t('changeLanguage', { currentLanguage: currentLanguageName })}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                {language.toUpperCase()}
            </button>
            {isOpen && (
                <div 
                    className="absolute top-full right-0 mt-2 w-40 glass-card p-2 animate-fade-in z-50"
                    style={{ animationDuration: '200ms' }}
                    role="menu"
                >
                    <ul className="space-y-1">
                        {availableLanguages.map(lang => (
                            <li key={lang}>
                                <button
                                    onClick={() => handleLanguageChange(lang)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                        language === lang 
                                        ? 'bg-sky-500/30 text-white font-semibold' 
                                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                    }`}
                                    role="menuitem"
                                >
                                    {t(`language_${lang}`)}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};