import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useExchangeRates } from './hooks/useExchangeRates';
import type { Expense, Currency, IncomeSource, IncomeTransaction, MonthlyData } from './types';
import { CURRENCIES } from './constants';
import { Dashboard } from './components/Dashboard';
import { MonthlySetup } from './components/MonthlySetup';
import { MonthlyView } from './components/MonthlyView';
import { AnnualView } from './components/AnnualView';

type View = 'dashboard' | 'setup' | 'monthly' | 'annual';

export default function App() {
  const [allMonthlyData, setAllMonthlyData] = useLocalStorage<MonthlyData[]>('allMonthlyData', []);
  const [incomeSources, setIncomeSources] = useLocalStorage<IncomeSource[]>('incomeSources', []);
  const [displayCurrency, setDisplayCurrency] = useLocalStorage<Currency>('displayCurrency', CURRENCIES[0]);
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeMonthId, setActiveMonthId] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);

  const activeMonthData = useMemo(() => {
    if (!activeMonthId) return null;
    return allMonthlyData.find(d => d.id === activeMonthId) || null;
  }, [allMonthlyData, activeMonthId]);
  
  const allAvailableYears = useMemo(() => {
    const years = new Set(allMonthlyData.map(d => d.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [allMonthlyData]);
  
  const baseCurrencyForRates = activeMonthData?.currency.code || CURRENCIES[0].code;
  const { rates, isLoading: ratesLoading, error: ratesError } = useExchangeRates(baseCurrencyForRates);

  useEffect(() => {
    if (activeMonthData) {
      setDisplayCurrency(activeMonthData.currency);
    }
  }, [activeMonthData, setDisplayCurrency]);

  const conversionRate = useMemo(() => {
    if (!rates || !displayCurrency || ratesError) return 1;
    return rates[displayCurrency.code] || 1;
  }, [rates, displayCurrency, ratesError]);


  // Navigation handlers
  const handleStartNewMonth = () => setCurrentView('setup');
  const handleViewMonth = (monthId: string) => {
    setActiveMonthId(monthId);
    setCurrentView('monthly');
  };
  const handleViewAnnual = (year: number) => {
    setActiveYear(year);
    setCurrentView('annual');
  };
  const handleBackToDashboard = () => {
    setActiveMonthId(null);
    setActiveYear(null);
    setCurrentView('dashboard');
  };

  // Data manipulation handlers
  const handleSetupMonth = (year: number, month: number, limit: number, income: number, currency: Currency) => {
    const monthId = `${year}-${String(month).padStart(2, '0')}`;
    const newMonthData: MonthlyData = {
      id: monthId,
      year,
      month,
      limit,
      baseIncome: income,
      currency,
      expenses: [],
      incomeTransactions: []
    };
    setAllMonthlyData(prev => [...prev, newMonthData].sort((a,b) => b.id.localeCompare(a.id)));
    setActiveMonthId(monthId);
    setCurrentView('monthly');
  };
  
  const handleDeleteMonth = (monthId: string) => {
    if (window.confirm('Are you sure you want to delete this entire month? This action cannot be undone.')) {
        setAllMonthlyData(prev => prev.filter(d => d.id !== monthId));
    }
  };

  const updateActiveMonthData = (updater: (currentData: MonthlyData) => MonthlyData) => {
    if (!activeMonthId) return;
    setAllMonthlyData(prev => 
      prev.map(monthData => 
        monthData.id === activeMonthId ? updater(monthData) : monthData
      )
    );
  };

  const handleAddExpense = (expense: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = { ...expense, id: Date.now().toString(), date: new Date().toISOString() };
    updateActiveMonthData(currentData => ({
      ...currentData,
      expenses: [newExpense, ...currentData.expenses],
    }));
  };

  const handleDeleteExpense = (id: string) => {
    updateActiveMonthData(currentData => ({
      ...currentData,
      expenses: currentData.expenses.filter(e => e.id !== id),
    }));
  };
  
  const handleAddIncomeSource = (source: Omit<IncomeSource, 'id'>) => {
    const newSource: IncomeSource = { ...source, id: Date.now().toString() };
    setIncomeSources(prev => [...prev, newSource]);
  };

  const handleDeleteIncomeSource = (id: string) => {
    setIncomeSources(prev => prev.filter(s => s.id !== id));
  };
  
  const handleUpdateIncomeSource = (updatedSource: IncomeSource) => {
    setIncomeSources(prev => prev.map(s => (s.id === updatedSource.id ? updatedSource : s)));
  };

  const handleAddIncomeTransaction = (source: IncomeSource, date: string) => {
    const transactionDateTime = new Date(`${date}T00:00:00`);
    const newTransaction: IncomeTransaction = {
        id: Date.now().toString(),
        name: source.name,
        amount: source.amount,
        date: transactionDateTime.toISOString(),
        category: source.category,
        status: 'pending',
    };
    updateActiveMonthData(currentData => {
      const updatedTransactions = [...currentData.incomeTransactions, newTransaction];
      updatedTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        ...currentData,
        incomeTransactions: updatedTransactions,
      };
    });
  };
  
  const handleDeleteIncomeTransaction = (id: string) => {
    updateActiveMonthData(currentData => ({
      ...currentData,
      incomeTransactions: currentData.incomeTransactions.filter(t => t.id !== id),
    }));
  };

  const handleUpdateIncomeTransactionStatus = (id: string, status: 'completed') => {
    updateActiveMonthData(currentData => ({
      ...currentData,
      incomeTransactions: currentData.incomeTransactions.map(t =>
        t.id === id ? { ...t, status } : t
      ),
    }));
  };

  const renderContent = () => {
    switch(currentView) {
      case 'setup':
        return <MonthlySetup 
                  onSetup={handleSetupMonth} 
                  onCancel={handleBackToDashboard}
                  existingMonths={allMonthlyData.map(d => d.id)}
                />;
      case 'monthly':
        if (activeMonthData) {
            return <MonthlyView 
                monthData={activeMonthData}
                incomeSources={incomeSources}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                onAddIncomeSource={handleAddIncomeSource}
                onDeleteIncomeSource={handleDeleteIncomeSource}
                onUpdateIncomeSource={handleUpdateIncomeSource}
                onAddIncomeTransaction={handleAddIncomeTransaction}
                onDeleteIncomeTransaction={handleDeleteIncomeTransaction}
                onUpdateIncomeTransactionStatus={handleUpdateIncomeTransactionStatus}
                onBackToDashboard={handleBackToDashboard}
                displayCurrency={displayCurrency}
                onDisplayCurrencyChange={setDisplayCurrency}
                conversionRate={conversionRate}
                ratesLoading={ratesLoading}
                ratesError={ratesError}
            />;
        }
        handleBackToDashboard();
        return null;
      
      case 'annual':
        if (activeYear) {
            const annualData = allMonthlyData.filter(d => d.year === activeYear);
            return <AnnualView
              year={activeYear}
              annualData={annualData}
              onBackToDashboard={handleBackToDashboard}
              displayCurrency={displayCurrency}
              conversionRate={conversionRate}
              allAvailableYears={allAvailableYears}
              onYearChange={setActiveYear}
            />
        }
        handleBackToDashboard();
        return null;

      case 'dashboard':
      default:
        return <Dashboard 
                  monthlyData={allMonthlyData} 
                  onStartNewMonth={handleStartNewMonth} 
                  onViewMonth={handleViewMonth} 
                  onViewAnnual={handleViewAnnual}
                  onDeleteMonth={handleDeleteMonth}
                />;
    }
  };

  return (
    <div className="h-screen w-screen overflow-y-auto text-slate-200 p-4 sm:p-6 lg:p-8">
      {renderContent()}
    </div>
  );
}