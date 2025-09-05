import React from 'react';
import { useLanguage } from '../contexts/LanguageProvider';

export const FirebaseNotConfigured: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl glass-card p-8 animate-fade-in text-center">
        <h1 className="text-3xl font-bold mb-4 text-red-400">{t('firebaseNotConfigured')}</h1>
        <p className="text-slate-300 mb-6">
          {t('firebaseNotConfiguredMessage')}
        </p>
        <div className="text-left bg-slate-900 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">{t('firebaseOpenFile')}</p>
          <pre className="text-sm text-slate-200 overflow-x-auto">
            <code>
              {`const firebaseConfig = {\n  apiKey: "AIzaSy...YOUR_API_KEY",\n  authDomain: "your-project-id.firebaseapp.com",\n  projectId: "your-project-id",\n  storageBucket: "your-project-id.appspot.com",\n  messagingSenderId: "your-sender-id",\n  appId: "1:your-sender-id:web:your-app-id"\n};`}
            </code>
          </pre>
        </div>
        <p className="text-slate-400 mt-6 text-sm">
          {t('firebaseGetValues')}
        </p>
      </div>
    </div>
  );
};