import React, { useState } from 'react';
import type { Currency } from '../types';
import { CURRENCIES } from '../constants';
import { useLanguage } from '../contexts/LanguageProvider';

interface LimitSetterProps {
  onSetup: (limit: number, income: number, currency: Currency) => void;
  isSubmitting?: boolean;
  submissionError?: string | null;
}

export const LimitSetter: React.FC<LimitSetterProps> = ({ onSetup, isSubmitting, submissionError }) => {
  const [limit, setLimit] = useState('');
  const [income, setIncome] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(CURRENCIES[0]);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const limitValue = parseFloat(limit);
    const incomeValue = parseFloat(income);

    if (isNaN(limitValue) || limitValue <= 0) {
      setError(t('errorInvalidLimit'));
      return;
    }
    if (isNaN(incomeValue) || incomeValue < 0) {
      setError(t('errorInvalidIncome'));
      return;
    }
    setError('');
    onSetup(limitValue, incomeValue, selectedCurrency);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900/50 text-white p-4">
      <div className="w-full max-w-md glass-card p-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">{t('welcome')}</h1>
        <p className="text-center text-slate-400 mb-8">{t('setMonthlyBudgetPrompt')}</p>
        <form onSubmit={handleSubmit} className="space-y-6">
           <div>
            <label htmlFor="limit" className="block text-sm font-medium text-slate-300 mb-2">{t('monthlyBudgetLimit')}</label>
            <div className="relative">
                <input
                id="limit"
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder={t('eg1000')}
                className="w-full pl-12 pr-4 py-3 bg-slate-700/50 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
                aria-label={t('monthlyBudgetLimit')}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">{selectedCurrency.symbol}</span>
            </div>
          </div>
          <div>
            <label htmlFor="income" className="block text-sm font-medium text-slate-300 mb-2">{t('monthlyIncome')}</label>
            <div className="relative">
                <input
                id="income"
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder={t('eg3000')}
                className="w-full pl-12 pr-4 py-3 bg-slate-700/50 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
                aria-label={t('monthlyIncome')}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">{selectedCurrency.symbol}</span>
            </div>
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-slate-300 mb-2">{t('currency')}</label>
            <select
              id="currency"
              value={selectedCurrency.code}
              onChange={(e) => {
                const currency = CURRENCIES.find(c => c.code === e.target.value);
                if (currency) setSelectedCurrency(currency);
              }}
              className="w-full p-3 bg-slate-700/50 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
          {(error || submissionError) && <p className="text-red-400 text-sm text-center">{error || submissionError}</p>}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-violet-500/30 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('settingUp') : t('startTracking')}
          </button>
        </form>
      </div>
    </div>
  );
};