import React, { useState } from 'react';
import type { Currency } from '../types';
import { CURRENCIES } from '../constants';
import { useLanguage } from '../contexts/LanguageProvider';

interface MonthlySetupProps {
  onSetup: (year: number, month: number, limit: number, income: number, incomeGoal: number, currency: Currency) => void;
  onCancel: () => void;
  existingMonths: string[]; // "YYYY-MM"
  isSubmitting?: boolean;
  submissionError?: string | null;
}

export const MonthlySetup: React.FC<MonthlySetupProps> = ({ onSetup, onCancel, existingMonths, isSubmitting, submissionError }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [limit, setLimit] = useState('');
  const [income, setIncome] = useState('');
  const [incomeGoal, setIncomeGoal] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(CURRENCIES[0]);
  const [error, setError] = useState('');
  const { t, months: monthNames } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const limitValue = parseFloat(limit);
    const incomeValue = parseFloat(income);
    const incomeGoalValue = parseFloat(incomeGoal) || 0;
    const monthId = `${year}-${String(month).padStart(2, '0')}`;

    if (existingMonths.includes(monthId)) {
        setError(t('errorMonthExists', { monthId }));
        return;
    }
    if (isNaN(limitValue) || limitValue <= 0) {
      setError(t('errorInvalidLimit'));
      return;
    }
    if (isNaN(incomeValue) || incomeValue < 0) {
      setError(t('errorInvalidIncome'));
      return;
    }
    if (isNaN(incomeGoalValue) || incomeGoalValue < 0) {
      setError(t('errorInvalidIncomeGoal'));
      return;
    }
    setError('');
    onSetup(year, month, limitValue, incomeValue, incomeGoalValue, selectedCurrency);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: monthNames[i] }));

  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4">
      <div className="w-full max-w-md glass-card p-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">{t('newMonthlyBudget')}</h1>
        <p className="text-center text-slate-300 mb-8">{t('setBudgetForNewMonth')}</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-slate-300 mb-2">{t('year')}</label>
              <select
                id="year"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full p-3 bg-slate-700/50 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-slate-300 mb-2">{t('month')}</label>
              <select
                id="month"
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="w-full p-3 bg-slate-700/50 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
              </select>
            </div>
          </div>
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
            <label htmlFor="income" className="block text-sm font-medium text-slate-300 mb-2">{t('baseMonthlyIncome')}</label>
            <div className="relative">
              <input
                id="income"
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder={t('eg3000')}
                className="w-full pl-12 pr-4 py-3 bg-slate-700/50 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
                aria-label={t('baseMonthlyIncome')}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">{selectedCurrency.symbol}</span>
            </div>
          </div>
          <div>
            <label htmlFor="incomeGoal" className="block text-sm font-medium text-slate-300 mb-2">{t('monthlyIncomeGoalOptional')}</label>
            <div className="relative">
              <input
                id="incomeGoal"
                type="number"
                value={incomeGoal}
                onChange={(e) => setIncomeGoal(e.target.value)}
                placeholder={t('eg4000')}
                className="w-full pl-12 pr-4 py-3 bg-slate-700/50 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
                aria-label={t('monthlyIncomeGoal')}
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
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {submissionError && <p className="text-red-400 text-sm text-center">{submissionError}</p>}
          <div className="flex gap-4">
             <button type="button" onClick={onCancel} className="w-full bg-slate-600/50 hover:bg-slate-500/50 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>
                {t('cancel')}
            </button>
            <button type="submit" className="w-full bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-violet-500/30 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>
                {isSubmitting ? t('creating') : t('createBudget')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};