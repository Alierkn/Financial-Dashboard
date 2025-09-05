import React from 'react';

export const FirebaseNotConfigured: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl glass-card p-8 animate-fade-in text-center">
        <h1 className="text-3xl font-bold mb-4 text-red-400">Firebase Not Configured</h1>
        <p className="text-slate-300 mb-6">
          This application requires a connection to a Firebase project to function correctly.
          Please update the <code className="bg-slate-700/50 text-sky-300 p-1 rounded-md">firebase.ts</code> file
          with your own Firebase project configuration.
        </p>
        <div className="text-left bg-slate-900 p-4 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Open <code className="text-sky-300">firebase.ts</code> and replace the placeholder configuration:</p>
          <pre className="text-sm text-slate-200 overflow-x-auto">
            <code>
              {`const firebaseConfig = {\n  apiKey: "AIzaSy...YOUR_API_KEY",\n  authDomain: "your-project-id.firebaseapp.com",\n  projectId: "your-project-id",\n  storageBucket: "your-project-id.appspot.com",\n  messagingSenderId: "your-sender-id",\n  appId: "1:your-sender-id:web:your-app-id"\n};`}
            </code>
          </pre>
        </div>
        <p className="text-slate-400 mt-6 text-sm">
          You can get these values from your Firebase project console under Project settings.
        </p>
      </div>
    </div>
  );
};
