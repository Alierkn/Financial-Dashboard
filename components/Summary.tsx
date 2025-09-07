import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Currency, Expense } from '../types';
import { CATEGORIES } from '../constants';
import { useLanguage } from '../contexts/LanguageProvider';

interface SummaryProps {
  limit: number;
  expenses: Expense[];
  currency: Currency;
  baseIncome: number;
  transactionalIncome: number;
  pendingIncome: number;
  conversionRate: number;
  categoryBudgets: { [key: string]: number } | undefined;
  categoryColors: { [key: string]: string };
  incomeGoal: number | undefined;
  onUpdateCategoryBudgets: (budgets: { [key: string]: number }) => void;
  onUpdateCategoryColors: (colors: { [key: string]: string }) => void;
  onUpdateIncomeGoal: (goal: number) => void;
  isSubmitting?: boolean;
}

// Helper function for consistent currency formatting
const formatCurrency = (value: number, currency: Currency) => {
  return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const defaultColorMap: { [key: string]: string } = Object.fromEntries(
    CATEGORIES.map(cat => [cat.id, cat.hexColor])
);

const CategoryBudgetEditor: React.FC<{
    limit: number,
    currency: Currency,
    currentBudgets: { [key: string]: number } | undefined,
    currentColors: { [key: string]: string },
    onSave: (newBudgets: { [key: string]: number }, newColors: { [key: string]: string }) => void,
    onCancel: () => void,
    isSubmitting?: boolean,
}> = ({ limit, currency, currentBudgets, currentColors, onSave, onCancel, isSubmitting }) => {
    const { t } = useLanguage();
    
    const [budgets, setBudgets] = useState<{ [key: string]: string }>(() => {
        const initial: { [key: string]: string } = {};
        const hasExistingBudgets = currentBudgets && Object.keys(currentBudgets).length > 0;

        CATEGORIES.forEach(cat => { initial[cat.id] = ''; });

        if (hasExistingBudgets) {
            Object.keys(currentBudgets).forEach(catId => {
                if (initial.hasOwnProperty(catId)) {
                    initial[catId] = currentBudgets[catId].toString();
                }
            });
        }
        return initial;
    });

    const [colors, setColors] = useState<{ [key: string]: string }>(() => {
        const initialColors: { [key: string]: string } = {};
        CATEGORIES.forEach(cat => {
            initialColors[cat.id] = currentColors[cat.id] || defaultColorMap[cat.id];
        });
        return initialColors;
    });

    const handleBudgetChange = (categoryId: string, value: string) => {
        setBudgets(prev => ({ ...prev, [categoryId]: value }));
    };

    const handleColorChange = (categoryId: string, value: string) => {
        setColors(prev => ({ ...prev, [categoryId]: value }));
    };

    const allocatedTotal = useMemo(() => {
        return Object.values(budgets).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
    }, [budgets]);

    const handleSave = () => {
        const newBudgets: { [key: string]: number } = {};
        for (const catId in budgets) {
            const value = parseFloat(budgets[catId]);
            if (!isNaN(value) && value > 0) {
                newBudgets[catId] = value;
            }
        }
        onSave(newBudgets, colors);
    };

    const remainingToAllocate = limit - allocatedTotal;
    const allocatedPercentage = limit > 0 ? (allocatedTotal / limit) * 100 : 0;
    const isOverAllocated = remainingToAllocate < 0;

    return (
        <div className="mt-4 border-t border-slate-700 pt-4 animate-fade-in">
            <h3 className="text-lg font-semibold mb-3">{t('setCategoryBudgetsAndColors')}</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {CATEGORIES.map(category => (
                    <div key={category.id} className="grid grid-cols-[1fr,auto,auto] items-center gap-3">
                         <label htmlFor={`budget-${category.id}`} className="text-sm text-slate-300 col-span-1 truncate">{t(`category_${category.id}`)}</label>
                         <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{currency.symbol}</span>
                            <input
                                id={`budget-${category.id}`}
                                type="number"
                                value={budgets[category.id]}
                                onChange={(e) => handleBudgetChange(category.id, e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-2 py-1.5 bg-slate-700/50 text-white border border-slate-600 rounded-md focus:ring-1 focus:ring-sky-500 outline-none"
                            />
                         </div>
                         <input
                            type="color"
                            value={colors[category.id]}
                            onChange={(e) => handleColorChange(category.id, e.target.value)}
                            className="w-9 h-9 p-0 bg-transparent border-none rounded-md cursor-pointer"
                            title={t('setColorFor', { categoryName: t(`category_${category.id}`) })}
                            aria-label={t('colorPickerFor', { categoryName: t(`category_${category.id}`) })}
                         />
                    </div>
                ))}
            </div>
            <div className="mt-4 border-t border-slate-700 pt-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <span className={`font-semibold ${isOverAllocated ? 'text-red-400' : 'text-green-400'}`}>
                        {isOverAllocated ? t('overAllocatedBy') : t('remainingToAllocate')}
                    </span>
                    <span className={`font-bold ${isOverAllocated ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(Math.abs(remainingToAllocate), currency)}
                    </span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-2.5 relative overflow-hidden">
                    <div
                        className={`h-2.5 rounded-full transition-all duration-300 ${isOverAllocated ? 'bg-red-500' : 'bg-sky-500'}`}
                        style={{ width: `${Math.min(allocatedPercentage, 100)}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                    <span>{formatCurrency(allocatedTotal, currency)} {t('allocated')}</span>
                    <span>{t('limit')}: {formatCurrency(limit, currency)}</span>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onCancel} className="bg-slate-600/50 hover:bg-slate-500/50 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm" disabled={isSubmitting}>{t('cancel')}</button>
                <button onClick={handleSave} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50" disabled={isSubmitting}>
                    {isSubmitting ? t('saving') : t('saveBudgets')}
                </button>
            </div>
        </div>
    );
};


export const Summary: React.FC<SummaryProps> = ({
  limit,
  expenses,
  currency,
  baseIncome,
  transactionalIncome,
  pendingIncome,
  conversionRate,
  categoryBudgets,
  categoryColors,
  incomeGoal,
  onUpdateCategoryBudgets,
  onUpdateCategoryColors,
  onUpdateIncomeGoal,
  isSubmitting,
}) => {
  const [isEditingBudgets, setIsEditingBudgets] = useState(false);
  const [isEditingIncomeGoal, setIsEditingIncomeGoal] = useState(false);
  const [newIncomeGoal, setNewIncomeGoal] = useState<string>('');
  const { t } = useLanguage();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (!aiRef.current) {
      if (process.env.API_KEY) {
        aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
      }
    }
  }, []);

  const totalSpent = useMemo(() => {
    return expenses
      .filter(expense => expense.status === 'paid')
      .reduce((sum, expense) => sum + expense.amount, 0) * conversionRate;
  }, [expenses, conversionRate]);

  const totalIncome = useMemo(() => {
      return (baseIncome + transactionalIncome) * conversionRate;
  }, [baseIncome, transactionalIncome, conversionRate]);

  const totalPending = useMemo(() => {
      return pendingIncome * conversionRate;
  }, [pendingIncome, conversionRate]);

  const remaining = (limit * conversionRate) - totalSpent;
  const percentageSpent = limit > 0 ? (totalSpent / (limit * conversionRate)) * 100 : 0;
  
  const incomeGoalInDisplayCurrency = (incomeGoal || 0) * conversionRate;
  const incomePercentage = incomeGoalInDisplayCurrency > 0 ? (totalIncome / incomeGoalInDisplayCurrency) * 100 : 0;

  const spendingByCategory = useMemo(() => {
    const spending: { [key: string]: number } = {};
    for (const expense of expenses) {
      if (expense.status !== 'paid') continue;
      if (!spending[expense.category]) {
        spending[expense.category] = 0;
      }
      spending[expense.category] += expense.amount * conversionRate;
    }
    return spending;
  }, [expenses, conversionRate]);

  const handleSaveBudgets = (newBudgets: { [key: string]: number }, newColors: { [key: string]: string }) => {
    const baseCurrencyBudgets = { ...newBudgets };
    for (const key in baseCurrencyBudgets) {
        if (conversionRate !== 0) {
            baseCurrencyBudgets[key] /= conversionRate;
        }
    }
    onUpdateCategoryBudgets(baseCurrencyBudgets);
    onUpdateCategoryColors(newColors);
    setIsEditingBudgets(false);
  };

  const handleSaveIncomeGoal = () => {
    const goalValue = parseFloat(newIncomeGoal);
    if (!isNaN(goalValue) && goalValue >= 0) {
        const baseCurrencyGoal = conversionRate !== 0 ? goalValue / conversionRate : goalValue;
        onUpdateIncomeGoal(baseCurrencyGoal);
        setIsEditingIncomeGoal(false);
    }
  };

  const handleGetAnalysis = async () => {
    if (!aiRef.current) {
        console.error("AI client not initialized.");
        setAnalysis(t('errorAiAnalysis'));
        return;
    }
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
        const categorySpendingText = CATEGORIES
            .map(cat => {
                const spent = spendingByCategory[cat.id] || 0;
                if (spent > 0) {
                    return `${t(`category_${cat.id}`)}: ${formatCurrency(spent, currency)}`;
                }
                return null;
            })
            .filter(Boolean)
            .join(', ');

        const prompt = `
            You are a helpful and concise financial assistant. Analyze the following financial data for the month and provide a 2-3 sentence summary in the user's language (${t('language_code')}). 
            Highlight the highest spending category and comment on how close the user is to their budget limit. Be encouraging.

            Data:
            - Total Spent: ${formatCurrency(totalSpent, currency)}
            - Budget Limit: ${formatCurrency(limit * conversionRate, currency)}
            - Remaining Budget: ${formatCurrency(remaining, currency)}
            - Total Income: ${formatCurrency(totalIncome, currency)}
            - Spending by Category: ${categorySpendingText || 'No spending yet.'}
        `;

        const response = await aiRef.current.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        setAnalysis(response.text);

    } catch (error) {
        console.error("Error getting financial analysis:", error);
        setAnalysis(t('errorAiAnalysis'));
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const hasBudgets = categoryBudgets && Object.keys(categoryBudgets).length > 0;

  return (
    <div className="glass-card p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Spent */}
        <div className="space-y-2">
          <p className="text-slate-400 text-sm font-medium">{t('totalSpent')}</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalSpent, currency)}</p>
          <div className="w-full bg-slate-700/50 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${percentageSpent > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-sky-500 to-violet-500'}`}
              style={{ width: `${Math.min(percentageSpent, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Remaining Budget */}
        <div className="space-y-2">
            <p className="text-slate-400 text-sm font-medium">{t('remainingBudget')}</p>
            <p className={`text-3xl font-bold ${remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {formatCurrency(remaining, currency)}
            </p>
            <p className="text-xs text-slate-500">
                {t('limit')}: {formatCurrency(limit * conversionRate, currency)}
            </p>
        </div>

        {/* Total Income & Goal */}
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <p className="text-slate-400 text-sm font-medium">{t('completedIncome')}</p>
                {!isEditingIncomeGoal && (
                    <button
                        onClick={() => {
                            setIsEditingIncomeGoal(true);
                            setNewIncomeGoal(String(incomeGoalInDisplayCurrency || ''));
                        }}
                        className="text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-1 px-2 rounded-lg transition-colors"
                        disabled={isSubmitting}
                    >
                        {incomeGoal && incomeGoal > 0 ? t('editGoal') : t('setGoal')}
                    </button>
                )}
            </div>

            {isEditingIncomeGoal ? (
                <div className="flex items-center gap-2 pt-2">
                    <div className="relative flex-grow">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{currency.symbol}</span>
                        <input
                            type="number"
                            value={newIncomeGoal}
                            onChange={(e) => setNewIncomeGoal(e.target.value)}
                            placeholder={t('setIncomeGoal')}
                            className="w-full pl-8 pr-2 py-1.5 bg-slate-700/50 text-white border border-slate-600 rounded-md focus:ring-1 focus:ring-sky-500 outline-none"
                            aria-label={t('monthlyIncomeGoal')}
                            disabled={isSubmitting}
                        />
                    </div>
                    <button onClick={handleSaveIncomeGoal} className="p-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:opacity-50" aria-label={t('saveIncomeGoal')} disabled={isSubmitting}>
                        {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </button>
                     <button onClick={() => setIsEditingIncomeGoal(false)} className="p-2 rounded-md bg-slate-600/50 hover:bg-slate-500/50 text-white transition-colors" aria-label={t('cancelEditIncomeGoal')} disabled={isSubmitting}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            ) : (
                <>
                    <p className="text-3xl font-bold text-green-400">{formatCurrency(totalIncome, currency)}</p>
                    {incomeGoal && incomeGoal > 0 ? (
                        <>
                            <div className="w-full bg-slate-700/50 rounded-full h-2">
                                <div
                                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(incomePercentage, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-slate-500 text-right">
                                {t('goal')}: {formatCurrency(incomeGoalInDisplayCurrency, currency)}
                            </p>
                        </>
                    ) : (
                         <p className="text-xs text-slate-500">
                            {t('noGoalSet')}
                        </p>
                    )}
                </>
            )}
        </div>

        {/* Pending Income */}
         <div className="space-y-2">
            <p className="text-slate-400 text-sm font-medium">{t('pendingIncome')}</p>
            <p className="text-3xl font-bold text-yellow-400">{formatCurrency(totalPending, currency)}</p>
            <p className="text-xs text-slate-500">
                {t('potentialTotalIncome')}: {formatCurrency(totalIncome + totalPending, currency)}
            </p>
        </div>
      </div>
      
       {/* AI Financial Summary Section */}
      <div className="mt-6 border-t border-slate-700 pt-4">
          <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-slate-200">{t('aiFinancialSummary')}</h3>
              <button 
                  onClick={handleGetAnalysis} 
                  disabled={isAnalyzing}
                  className="text-sm bg-violet-600/50 hover:bg-violet-500/50 text-violet-200 font-semibold py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                  {isAnalyzing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5z" /><path d="M12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414zM5 7a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm2 4a1 1 0 011-1h1a1 1 0 110 2H8a1 1 0 01-1-1z" /></svg>
                  )}
                  <span>{isAnalyzing ? t('analyzing') : t('getAnalysis')}</span>
              </button>
          </div>
          {analysis && (
              <p className="text-slate-300 bg-slate-800/40 p-4 rounded-lg animate-fade-in">{analysis}</p>
          )}
      </div>

      <div className="mt-6 border-t border-slate-700 pt-4">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-slate-200">{t('categorySpending')}</h3>
            {!isEditingBudgets && (
                <button 
                    onClick={() => setIsEditingBudgets(true)} 
                    className="text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-1.5 px-3 rounded-lg transition-colors"
                >
                    {hasBudgets ? t('editBudgets') : t('setBudgets')}
                </button>
            )}
        </div>
        
        {isEditingBudgets ? (
            <CategoryBudgetEditor 
                limit={limit * conversionRate}
                currency={currency}
                currentBudgets={categoryBudgets ? Object.entries(categoryBudgets).reduce((acc, [key, value]) => {
                    acc[key] = value * conversionRate;
                    return acc;
                }, {} as {[key: string]: number}) : undefined}
                currentColors={categoryColors}
                onSave={handleSaveBudgets}
                onCancel={() => setIsEditingBudgets(false)}
                isSubmitting={isSubmitting}
            />
        ) : (
            hasBudgets ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    {CATEGORIES.map(category => {
                        const spent = spendingByCategory[category.id] || 0;
                        const budget = (categoryBudgets?.[category.id] || 0) * conversionRate;
                        if (budget === 0 && spent === 0) return null;
                        
                        const percent = budget > 0 ? (spent / budget) * 100 : 0;
                        const isOverBudget = spent > budget;
                        const color = categoryColors[category.id] || defaultColorMap[category.id];

                        return (
                            <div key={category.id}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium" style={{ color: isOverBudget ? '#f87171' : color }}>{t(`category_${category.id}`)}</span>
                                    <span className={`font-semibold ${isOverBudget ? 'text-red-400' : 'text-slate-400'}`}>
                                        {formatCurrency(spent, currency)}
                                        <span className="text-slate-500"> / {formatCurrency(budget, currency)}</span>
                                    </span>
                                </div>
                                <div className="w-full bg-slate-700/50 rounded-full h-2">
                                    <div 
                                        className="h-2 rounded-full"
                                        style={{ 
                                            width: `${Math.min(percent, 100)}%`,
                                            backgroundColor: isOverBudget ? '#ef4444' : color
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-slate-400">{t('noCategoryBudgetsSet')}</p>
                </div>
            )
        )}
      </div>
    </div>
  );
};