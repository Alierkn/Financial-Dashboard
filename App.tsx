
import React, { useState, useEffect } from 'react';
// FIX: The `User` type is not exported from 'firebase/auth' in the compat library. It should be accessed via the `firebase` object.
import { auth, isFirebaseConfigured, firebase } from './firebase';

import { Auth } from './components/Auth';
import { MainApp } from './components/MainApp';
import { FirebaseNotConfigured } from './components/FirebaseNotConfigured';


const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-screen w-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-sky-500"></div>
    </div>
);

export default function App() {
  // Add the configuration check at the very top
  if (!isFirebaseConfigured) {
    return <FirebaseNotConfigured />;
  }

  // FIX: Use `firebase.User` type from the compat library.
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Since we checked isFirebaseConfigured, auth is guaranteed to be non-null.
    const unsubscribe = auth!.onAuthStateChanged(user => {
      setUser(user);
      setLoading(false);
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-screen w-screen overflow-y-auto text-slate-200 p-4 sm:p-6 lg:p-8">
      {user ? <MainApp user={user} /> : <Auth />}
    </div>
  );
}
