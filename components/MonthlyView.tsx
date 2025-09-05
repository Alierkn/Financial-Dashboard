import React, { useState, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { MonthlyData, Expense, Currency, IncomeSource, IncomeTransaction } from '../types';
import { Summary } from './Summary';
import { AddExpenseForm } from './AddExpenseForm';
import { ExpenseList } from './ExpenseList';
import { CategoryView } from './CategoryView';
import { IncomeView } from './IncomeView';
import { CurrencyConverter } from './CurrencyConverter';
import { ExpenseTrendView } from './ExpenseTrendView';
import { IncomeTrendView } from './IncomeTrendView';
import { CATEGORIES, INCOME_CATEGORIES } from '../constants';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../contexts/LanguageProvider';

enum View {
    List,
    Category,
    Income,
    Trend,
    IncomeTrend,
}

interface MonthlyViewProps {
    user: User;
    monthData: MonthlyData;
    incomeSources: IncomeSource[];
    onAddExpense: (expense: Omit<Expense, 'id' | 'date'>) => Promise<boolean>;
    onDeleteExpense: (id: string) => Promise<void>;
    onAddIncomeSource: (source: Omit<IncomeSource, 'id'>) => Promise<boolean>;
    onDeleteIncomeSource: (id: string) => Promise<void>;
    onUpdateIncomeSource: (source: IncomeSource) => Promise<boolean>;
    onAddIncomeTransaction: (source: IncomeSource, date: string) => Promise<boolean>;
    onDeleteIncomeTransaction: (id: string) => Promise<void>;
    onUpdateIncomeTransactionStatus: (id: string, status: 'completed') => Promise<void>;
    onUpdateCategoryBudgets: (budgets: { [key: string]: number }) => Promise<boolean>;
    onUpdateCategoryColors: (colors: { [key: string]: string }) => Promise<boolean>;
    categoryColors: { [key: string]: string };
    onUpdateIncomeGoal: (goal: number) => Promise<boolean>;
    onBackToDashboard: () => void;
    onSignOut: () => void;
    displayCurrency: Currency;
    onDisplayCurrencyChange: (currency: Currency) => void;
    conversionRate: number;
    ratesLoading: boolean;
    ratesError: string | null;
    isSubmitting: boolean;
    submitError: string | null;
    deletingExpenseId: string | null;
    deletingSourceId: string | null;
    deletingTransactionId: string | null;
}

export const MonthlyView: React.FC<MonthlyViewProps> = (props) => {
    const { 
        user, monthData, incomeSources, onAddExpense, onDeleteExpense,
        onAddIncomeSource, onDeleteIncomeSource, onUpdateIncomeSource, onAddIncomeTransaction, onDeleteIncomeTransaction,
        onUpdateIncomeTransactionStatus, onUpdateCategoryBudgets, onUpdateCategoryColors, categoryColors, onUpdateIncomeGoal,
        onBackToDashboard, onSignOut, displayCurrency, onDisplayCurrencyChange, conversionRate, ratesLoading, ratesError,
        isSubmitting, submitError, deletingExpenseId, deletingSourceId, deletingTransactionId
    } = props;
  
    const [activeView, setActiveView] = useState<View>(View.List);
    const { t, months } = useLanguage();

    const { totalTransactionalIncome, totalPendingIncome } = useMemo(() => {
        return monthData.incomeTransactions.reduce((acc, transaction) => {
            if (transaction.status === 'completed') {
                acc.totalTransactionalIncome += transaction.amount;
            } else {
                acc.totalPendingIncome += transaction.amount;
            }
            return acc;
        }, { totalTransactionalIncome: 0, totalPendingIncome: 0 });
    }, [monthData.incomeTransactions]);

    const handleExport = () => {
        const expenseData = monthData.expenses.map(exp => ({
            date: new Date(exp.date).toISOString().slice(0, 10),
            type: 'Expense',
            description: exp.description,
            category: t(`category_${exp.category}`),
            amount: -exp.amount,
            currency: monthData.currency.code
        }));
    
        const incomeData = monthData.incomeTransactions.map(inc => ({
            date: new Date(inc.date).toISOString().slice(0, 10),
            type: `Income (${inc.status})`,
            description: inc.name,
            category: t(`incomeCategory_${inc.category}`),
            amount: inc.amount,
            currency: monthData.currency.code
        }));
    
        const allData = [...expenseData, ...incomeData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
        const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Currency'];
        
        const escapeCsvCell = (cell: string | number) => {
            const strCell = String(cell);
            if (strCell.includes(',')) {
                return `"${strCell.replace(/"/g, '""')}"`;
            }
            return strCell;
        };
    
        const csvRows = allData.map(row => 
            [ row.date, row.type, escapeCsvCell(row.description), row.category, row.amount.toFixed(2), row.currency ].join(',')
        );
    
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Report-${months[monthData.month - 1]}-${monthData.year}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBackToDashboard} className="flex items-center gap-2 text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                        <span>{t('dashboard')}</span>
                    </button>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">
                        {months[monthData.month - 1]} {monthData.year}
                    </h1>
                </div>
                <div className="flex items-center space-x-4">
                     <div className="flex items-center gap-3">
                        <p className="hidden md:block text-sm text-slate-400 truncate max-w-[200px]" title={user.email || 'User'}>
                           {user.email}
                        </p>
                        <button onClick={onSignOut} className="text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors">{t('signOut')}</button>
                    </div>
                    <CurrencyConverter 
                        selectedCurrency={displayCurrency}
                        onCurrencyChange={onDisplayCurrencyChange}
                        isLoading={ratesLoading}
                        error={ratesError}
                    />
                    <button onClick={handleExport} className="text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        {t('export')}
                    </button>
                    <LanguageToggle />
                    <ThemeToggle />
                </div>
            </header>

            <main className="space-y-6">
                {submitError && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">{submitError}</div>}
                <Summary 
                    limit={monthData.limit} 
                    expenses={monthData.expenses} 
                    currency={displayCurrency} 
                    baseIncome={monthData.baseIncome}
                    transactionalIncome={totalTransactionalIncome}
                    pendingIncome={totalPendingIncome}
                    conversionRate={conversionRate}
                    categoryBudgets={monthData.categoryBudgets}
                    categoryColors={categoryColors}
                    incomeGoal={monthData.incomeGoal}
                    onUpdateCategoryBudgets={onUpdateCategoryBudgets}
                    onUpdateCategoryColors={onUpdateCategoryColors}
                    onUpdateIncomeGoal={onUpdateIncomeGoal}
                    isSubmitting={isSubmitting}
                />

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2">
                        <AddExpenseForm onAddExpense={onAddExpense} isSubmitting={isSubmitting} />
                    </div>
                    <div className="lg:col-span-3 glass-card p-6">
                        <div className="flex border-b border-slate-700 mb-4 flex-wrap">
                            <button onClick={() => setActiveView(View.List)} className={`py-2 px-4 font-medium transition-colors ${activeView === View.List ? 'border-b-2 border-sky-400 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>{t('expenses')}</button>
                            <button onClick={() => setActiveView(View.Trend)} className={`py-2 px-4 font-medium transition-colors ${activeView === View.Trend ? 'border-b-2 border-sky-400 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>{t('trend')}</button>
                            <button onClick={() => setActiveView(View.Category)} className={`py-2 px-4 font-medium transition-colors ${activeView === View.Category ? 'border-b-2 border-sky-400 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>{t('categories')}</button>
                            <button onClick={() => setActiveView(View.Income)} className={`py-2 px-4 font-medium transition-colors ${activeView === View.Income ? 'border-b-2 border-sky-400 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>{t('income')}</button>
                            <button onClick={() => setActiveView(View.IncomeTrend)} className={`py-2 px-4 font-medium transition-colors ${activeView === View.IncomeTrend ? 'border-b-2 border-sky-400 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>{t('incomeTrend')}</button>
                        </div>
                        
                        <div className="max-h-[420px] overflow-y-auto pr-2">
                            {activeView === View.List ? (
                                <ExpenseList expenses={monthData.expenses} currency={displayCurrency} onDeleteExpense={onDeleteExpense} conversionRate={conversionRate} deletingExpenseId={deletingExpenseId}/>
                            ) : activeView === View.Category ? (
                                <CategoryView expenses={monthData.expenses} currency={displayCurrency} conversionRate={conversionRate} />
                            ) : activeView === View.Trend ? (
                                <ExpenseTrendView expenses={monthData.expenses} currency={displayCurrency} conversionRate={conversionRate} month={monthData.month} year={monthData.year} />
                            ) : activeView === View.Income ? (
                                <IncomeView 
                                    incomeSources={incomeSources}
                                    incomeTransactions={monthData.incomeTransactions}
                                    baseCurrency={monthData.currency}
                                    displayCurrency={displayCurrency}
                                    onAddSource={onAddIncomeSource}
                                    onDeleteSource={onDeleteIncomeSource}
                                    onUpdateSource={onUpdateIncomeSource}
                                    onAddTransaction={onAddIncomeTransaction}
                                    onDeleteTransaction={onDeleteIncomeTransaction}
                                    onUpdateTransactionStatus={onUpdateIncomeTransactionStatus}
                                    conversionRate={conversionRate}
                                    incomeGoal={monthData.incomeGoal}
                                    onUpdateIncomeGoal={onUpdateIncomeGoal}
                                    isSubmitting={isSubmitting}
                                    deletingSourceId={deletingSourceId}
                                    deletingTransactionId={deletingTransactionId}
                                />
                            ) : activeView === View.IncomeTrend ? (
                                <IncomeTrendView 
                                    baseIncome={monthData.baseIncome}
                                    incomeTransactions={monthData.incomeTransactions} 
                                    currency={displayCurrency} 
                                    conversionRate={conversionRate} 
                                    month={monthData.month} 
                                    year={monthData.year} 
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};