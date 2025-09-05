import React, { useState, useMemo, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { useExchangeRates } from '../hooks/useExchangeRates';
import type { Expense, Currency, IncomeSource, IncomeTransaction, MonthlyData } from '../types';
import { CURRENCIES } from '../constants';
import { Dashboard } from './Dashboard';
import { MonthlySetup } from './MonthlySetup';
import { MonthlyView } from './MonthlyView';
import { AnnualView } from './AnnualView';
import { LimitSetter } from './LimitSetter';
import { auth, db } from '../firebase';

type View = 'dashboard' | 'setup' | 'monthly' | 'annual';

interface MainAppProps {
  user: User;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-screen w-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-sky-500"></div>
    </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-center justify-center h-screen w-screen text-center p-4">
        <div className="glass-card p-8">
            <h2 className="text-2xl font-bold text-red-400 mb-4">An Error Occurred</h2>
            <p className="text-slate-300">{message}</p>
        </div>
    </div>
);

export const MainApp: React.FC<MainAppProps> = ({ user }) => {
  const [allMonthlyData, setAllMonthlyData] = useState<MonthlyData[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(CURRENCIES[0]);
  const [categoryColors, setCategoryColors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeMonthId, setActiveMonthId] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Firestore collections references
  const monthlyDataRef = useMemo(() => db!.collection('users').doc(user.uid).collection('monthlyData'), [user.uid]);
  const incomeSourcesRef = useMemo(() => db!.collection('users').doc(user.uid).collection('incomeSources'), [user.uid]);
  const preferencesRef = useMemo(() => db!.collection('users').doc(user.uid).collection('preferences').doc('main'), [user.uid]);

  // Effect to load data from Firestore
  useEffect(() => {
    const handleError = (error: Error, type: string) => {
        console.error(`Error fetching ${type}:`, error);
        // Ad-blockers often cause generic network errors.
        // The "Failed to fetch" or "Network request failed" messages are common indicators.
        if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
            setFirestoreError(`Could not load your ${type}. This may be due to a browser extension (like an ad-blocker) or a network issue. Please try disabling extensions and check your internet connection.`);
        } else {
            setFirestoreError(`Could not load your ${type}. Please check your connection and try again. Error: ${error.message}`);
        }
        setLoading(false);
    };

    const unsubscribeMonthlyData = monthlyDataRef.orderBy('id', 'desc').onSnapshot(snapshot => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MonthlyData));
      setAllMonthlyData(data);
       if (loading) { // Only check for initial setup on the very first load
         setIsInitialSetup(data.length === 0);
       }
      setLoading(false);
    }, (error) => handleError(error, 'financial data'));

    const unsubscribeIncomeSources = incomeSourcesRef.onSnapshot(snapshot => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as IncomeSource));
      setIncomeSources(data);
    }, (error) => handleError(error, 'income sources'));
    
    const unsubscribePreferences = preferencesRef.onSnapshot(doc => {
        if (doc.exists) {
            const prefs = doc.data();
            if (prefs?.displayCurrency) {
                setDisplayCurrency(prefs.displayCurrency);
            }
            if (prefs?.categoryColors) {
                setCategoryColors(prefs.categoryColors);
            }
        }
    }, (error) => handleError(error, 'user preferences'));

    return () => {
      unsubscribeMonthlyData();
      unsubscribeIncomeSources();
      unsubscribePreferences();
    };
  }, [monthlyDataRef, incomeSourcesRef, preferencesRef, loading]);

  const activeMonthData = useMemo(() => {
    if (!activeMonthId) return null;
    return allMonthlyData.find(d => d.id === activeMonthId) || null;
  }, [allMonthlyData, activeMonthId]);
  
  const allAvailableYears = useMemo(() => {
    const years = new Set(allMonthlyData.map(d => d.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [allMonthlyData]);
  
  const baseCurrencyForRates = activeMonthData?.currency.code || allMonthlyData[0]?.currency.code || CURRENCIES[0].code;
  const { rates, isLoading: ratesLoading, error: ratesError } = useExchangeRates(baseCurrencyForRates);

  // Set initial display currency when viewing a month, if no preference is set
  useEffect(() => {
    if (activeMonthData) {
      preferencesRef.get().then(doc => {
          if (!doc.exists || !doc.data()?.displayCurrency) {
              setDisplayCurrency(activeMonthData.currency);
          }
      })
    }
  }, [activeMonthId, activeMonthData, preferencesRef]);

  const conversionRate = useMemo(() => {
    if (!rates || !displayCurrency || ratesError) return 1;
    return rates[displayCurrency.code] || 1;
  }, [rates, displayCurrency, ratesError]);

  const handleSignOut = async () => {
    try {
      await auth!.signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleDisplayCurrencyChange = (currency: Currency) => {
    setDisplayCurrency(currency);
    preferencesRef.set({ displayCurrency: currency }, { merge: true });
  };

  // Navigation handlers
  const handleStartNewMonth = () => {
    setSubmitError(null);
    setCurrentView('setup');
  };
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
    const handleSetupFirstMonth = async (limit: number, income: number, currency: Currency) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        await handleSetupMonth(year, month, limit, income, 0, currency);
        setIsInitialSetup(false); // Move out of initial setup mode
    };

  const handleSetupMonth = async (year: number, month: number, limit: number, income: number, incomeGoal: number, currency: Currency) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const monthId = `${year}-${String(month).padStart(2, '0')}`;
      const newMonthData: Omit<MonthlyData, 'id'> = {
        year,
        month,
        limit,
        baseIncome: income,
        incomeGoal,
        currency,
        expenses: [],
        incomeTransactions: []
      };
      await monthlyDataRef.doc(monthId).set(newMonthData);
      setActiveMonthId(monthId);
      setCurrentView('monthly');
    } catch (error: any) {
        console.error("Error creating new month:", error);
        setSubmitError(error.message || "Failed to create new budget. Please check your connection and try again.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDeleteMonth = async (monthId: string) => {
    if (window.confirm('Are you sure you want to delete this entire month? This action cannot be undone.')) {
        await monthlyDataRef.doc(monthId).delete();
    }
  };

  const handleAddExpense = (expense: Omit<Expense, 'id' | 'date'>) => {
    if (!activeMonthId) return;
    const newExpense: Expense = { ...expense, id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, date: new Date().toISOString() };
    const docRef = monthlyDataRef.doc(activeMonthId);
    db!.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error("Document does not exist!");
      const data = doc.data() as MonthlyData;
      const newExpenses = [newExpense, ...data.expenses];
      transaction.update(docRef, { expenses: newExpenses });
    });
  };

  const handleDeleteExpense = (id: string) => {
    if (!activeMonthId) return;
    const docRef = monthlyDataRef.doc(activeMonthId);
    db!.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error("Document does not exist!");
      const data = doc.data() as MonthlyData;
      const newExpenses = data.expenses.filter(e => e.id !== id);
      transaction.update(docRef, { expenses: newExpenses });
    });
  };
  
  const handleAddIncomeSource = (source: Omit<IncomeSource, 'id'>) => {
    incomeSourcesRef.add(source);
  };

  const handleDeleteIncomeSource = (id: string) => {
    incomeSourcesRef.doc(id).delete();
  };
  
  const handleUpdateIncomeSource = (updatedSource: IncomeSource) => {
    const { id, ...data } = updatedSource;
    incomeSourcesRef.doc(id).update(data);
  };

  const handleAddIncomeTransaction = (source: IncomeSource, date: string) => {
    if(!activeMonthId) return;
    const transactionDateTime = new Date(`${date}T00:00:00`);
    const newTransaction: IncomeTransaction = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: source.name,
        amount: source.amount,
        date: transactionDateTime.toISOString(),
        category: source.category,
        status: 'pending',
    };
    
    const docRef = monthlyDataRef.doc(activeMonthId);
    db!.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error("Document does not exist!");
      const data = doc.data() as MonthlyData;
      const updatedTransactions = [...data.incomeTransactions, newTransaction]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      transaction.update(docRef, { incomeTransactions: updatedTransactions });
    });
  };
  
  const handleDeleteIncomeTransaction = (id: string) => {
    if (!activeMonthId) return;
    const docRef = monthlyDataRef.doc(activeMonthId);
    db!.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) throw new Error("Document does not exist!");
        const data = doc.data() as MonthlyData;
        const newTransactions = data.incomeTransactions.filter(t => t.id !== id);
        transaction.update(docRef, { incomeTransactions: newTransactions });
    });
  };

  const handleUpdateIncomeTransactionStatus = (id: string, status: 'completed') => {
    if (!activeMonthId) return;
    const docRef = monthlyDataRef.doc(activeMonthId);
    db!.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error("Document does not exist!");
      const data = doc.data() as MonthlyData;
      const newTransactions = data.incomeTransactions.map(t =>
        t.id === id ? { ...t, status } : t
      );
      transaction.update(docRef, { incomeTransactions: newTransactions });
    });
  };

  const handleUpdateCategoryBudgets = (budgets: { [key: string]: number }) => {
    if (!activeMonthId) return;
    monthlyDataRef.doc(activeMonthId).update({
      categoryBudgets: budgets
    });
  };

  const handleUpdateCategoryColors = (colors: { [key: string]: string }) => {
    preferencesRef.set({ categoryColors: colors }, { merge: true });
  };

  const handleUpdateIncomeGoal = (goal: number) => {
    if (!activeMonthId) return;
    monthlyDataRef.doc(activeMonthId).update({
      incomeGoal: goal
    });
  };

  const renderContent = () => {
    if (firestoreError) {
        return <ErrorDisplay message={firestoreError} />;
    }
    
    if (loading) {
        return <LoadingSpinner />;
    }
    
    if (isInitialSetup) {
        return <LimitSetter onSetup={handleSetupFirstMonth} />;
    }

    switch(currentView) {
      case 'setup':
        return <MonthlySetup 
                  onSetup={handleSetupMonth} 
                  onCancel={handleBackToDashboard}
                  existingMonths={allMonthlyData.map(d => d.id)}
                  isSubmitting={isSubmitting}
                  submissionError={submitError}
                />;
      case 'monthly':
        if (activeMonthData) {
            return <MonthlyView 
                user={user}
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
                onUpdateCategoryBudgets={handleUpdateCategoryBudgets}
                onUpdateCategoryColors={handleUpdateCategoryColors}
                categoryColors={categoryColors}
                onUpdateIncomeGoal={handleUpdateIncomeGoal}
                onBackToDashboard={handleBackToDashboard}
                onSignOut={handleSignOut}
                displayCurrency={displayCurrency}
                onDisplayCurrencyChange={handleDisplayCurrencyChange}
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
              user={user}
              year={activeYear}
              annualData={annualData}
              onBackToDashboard={handleBackToDashboard}
              onSignOut={handleSignOut}
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
                  user={user}
                  monthlyData={allMonthlyData} 
                  onStartNewMonth={handleStartNewMonth} 
                  onViewMonth={handleViewMonth} 
                  onViewAnnual={handleViewAnnual}
                  onDeleteMonth={handleDeleteMonth}
                  onSignOut={handleSignOut}
                />;
    }
  };

  return <>{renderContent()}</>;
}