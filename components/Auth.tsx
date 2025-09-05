import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { useLanguage } from '../contexts/LanguageProvider';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await auth!.signInWithEmailAndPassword(email, password);
      } else {
        await auth!.createUserWithEmailAndPassword(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('CONFIGURATION_NOT_FOUND'))) {
        setError(t('errorFirebaseConfigEmail'));
      } else {
        setError(err.message || t('errorOccurred'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await auth!.signInWithPopup(googleProvider!);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('CONFIGURATION_NOT_FOUND'))) {
        setError(t('errorFirebaseConfigGoogle'));
      } else {
        setError(err.message || t('errorGoogleSignIn'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">
          {isLogin ? t('welcomeBack') : t('createAccount')}
        </h1>
        <p className="text-center text-slate-400 mb-8">
          {isLogin ? t('signInToDashboard') : t('getStartedByCreatingAccount')}
        </p>
        
        <form onSubmit={handleAuthAction} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">{t('emailAddress')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-slate-700/50 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              required
              aria-label={t('emailAddress')}
            />
          </div>
          <div>
            <label htmlFor="password"  className="block text-sm font-medium text-slate-300 mb-2">{t('password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-700/50 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              required
              aria-label={t('password')}
            />
          </div>
          
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-violet-500/30 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('processing') : (isLogin ? t('signIn') : t('createAccount'))}
          </button>
        </form>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 separator-bg">{t('orContinueWith')}</span>
            </div>
        </div>

        <button 
            onClick={handleGoogleSignIn} 
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-slate-700/50 hover:bg-slate-600/50 text-white font-bold py-3 px-4 rounded-lg border border-slate-600 hover:border-slate-500 transition-all duration-300 disabled:opacity-50"
        >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.986,36.639,44,30.836,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            <span>{t('signInWithGoogle')}</span>
        </button>

        <p className="mt-8 text-center text-sm text-slate-400">
          {isLogin ? t('dontHaveAccount') : t('alreadyHaveAccount')}
          <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-sky-400 hover:text-sky-300 transition-colors">
            {isLogin ? t('signUp') : t('signIn')}
          </button>
        </p>
      </div>
    </div>
  );
};