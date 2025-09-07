import React, { useState } from 'react';
import type { Expense, Currency } from '../types';
import { useLanguage } from '../contexts/LanguageProvider';
import { useGeminiAI } from '../hooks/useGeminiAI';

interface AIAdvisorViewProps {
  expenses: Expense[];
  currency: Currency;
  conversionRate: number;
}

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({ expenses, currency, conversionRate }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const { data: advice, isLoading: isAdvising, generateAdvice } = useGeminiAI<string>();

  const handleGetAdvice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isAdvising) return;

    const spendingSummary = expenses
      .filter(exp => exp.status === 'paid')
      .reduce((acc, exp) => {
        const categoryName = t(`category_${exp.category}`);
        acc[categoryName] = (acc[categoryName] || 0) + (exp.amount * conversionRate);
        return acc;
      }, {} as Record<string, number>);
    
    const spendingText = Object.entries(spendingSummary)
      .map(([cat, total]) => `${cat}: ${currency.symbol}${total.toFixed(2)}`)
      .join(', ');

    const prompt = `
      You are a friendly and practical financial advisor. A user wants advice on how to save money.
      Based on their spending habits and their specific question, provide 3 concrete, actionable, and personalized saving tips in the user's language (${t('language_code')}).
      Keep the tone encouraging and realistic. Format the response as a list with bullet points or numbers.

      User's Question: "${query}"

      User's Spending Summary This Month: ${spendingText || 'No spending yet.'}
    `;
    
    generateAdvice(prompt);
  };
  
  const formattedAdvice = advice
    ? advice
        .replace(/^\s*[\*-\•]\s*/gm, '• ')
        .replace(/(\d+)\.\s*/g, '$1. ')
    : null;

  return (
    <div className="h-full">
      <h2 className="text-xl font-bold text-white mb-2">{t('aiFinancialAdvisor')}</h2>
      <p className="text-sm text-slate-400 mb-4">{t('aiAdvisorDescription')}</p>
      <form onSubmit={handleGetAdvice} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('aiAdvisorPlaceholder')}
          className="flex-grow p-2 bg-slate-700/50 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition"
          disabled={isAdvising}
        />
        <button
          type="submit"
          disabled={isAdvising || !query.trim()}
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isAdvising ? (
             <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM5.5 9.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM10 5.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm4.5 4.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" /></svg>
          )}
          <span>{t('getAdvice')}</span>
        </button>
      </form>

      {formattedAdvice && (
        <div 
          className="text-slate-300 bg-slate-800/40 p-4 rounded-lg animate-fade-in whitespace-pre-wrap font-sans"
        >
            {formattedAdvice}
        </div>
      )}
    </div>
  );
};