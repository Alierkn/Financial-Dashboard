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
import { auth, db, firebase } from '../firebase';
import { useLanguage } from '../contexts/LanguageProvider';
import { useToast } from '../contexts/ToastProvider';

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
  const { t } = useLanguage();
  const { addToast } = useToast();
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
  const [deletingMonthId, setDeletingMonthId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  const monthlyDataRef = useMemo(() => db!.collection('users').doc(user.uid).collection('monthlyData'), [user.uid]);
  const incomeSourcesRef = useMemo(() => db!.collection('users').doc(user.uid).collection('incomeSources'), [user.uid]);
  const preferencesRef = useMemo(() => db!.collection('users').doc(user.uid).collection('preferences').doc('main'), [user.uid]);

  useEffect(() => {
    const handleError = (error: Error, type: string) => {
        console.error(`Error fetching ${type}:`, error);
        if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
            setFirestoreError(t('errorAdBlocker', { type }));
        } else {
            setFirestoreError(t('errorCouldNotLoad', { type, message: error.message }));
        }
        setLoading(false);
    };

    const unsubscribeMonthlyData = monthlyDataRef.orderBy('id', 'desc').onSnapshot(snapshot => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MonthlyData));
      setAllMonthlyData(data);
       if (loading) {
         setIsInitialSetup(data.length === 0);
         setLoading(false);
       }
    }, (error) => handleError(error, 'financial data'));

    const unsubscribeIncomeSources = incomeSourcesRef.onSnapshot(snapshot => {
      setIncomeSources(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as IncomeSource)));
    }, (error) => handleError(error, 'income sources'));
    
    const unsubscribePreferences = preferencesRef.onSnapshot(doc => {
        if (doc.exists) {
            const prefs = doc.data();
            if (prefs?.displayCurrency) setDisplayCurrency(prefs.displayCurrency);
            if (prefs?.categoryColors) setCategoryColors(prefs.categoryColors);
        }
    }, (error) => handleError(error, 'user preferences'));

    return () => {
      unsubscribeMonthlyData();
      unsubscribeIncomeSources();
      unsubscribePreferences();
    };
  }, [monthlyDataRef, incomeSourcesRef, preferencesRef]);

  const activeMonthData = useMemo(() => allMonthlyData.find(d => d.id === activeMonthId) || null, [allMonthlyData, activeMonthId]);
  const allAvailableYears = useMemo(() => Array.from(new Set(allMonthlyData.map(d => d.year))).sort((a, b) => b - a), [allMonthlyData]);
  const baseCurrencyForRates = activeMonthData?.currency.code || allMonthlyData[0]?.currency.code || CURRENCIES[0].code;
  const { rates, isLoading: ratesLoading, error: ratesError } = useExchangeRates(baseCurrencyForRates);

  useEffect(() => {
    if (activeMonthData) {
      preferencesRef.get().then(doc => {
          if (!doc.exists || !doc.data()?.displayCurrency) setDisplayCurrency(activeMonthData.currency);
      })
    }
  }, [activeMonthId, activeMonthData, preferencesRef]);

  const conversionRate = useMemo(() => rates?.[displayCurrency.code] || 1, [rates, displayCurrency]);

  const handleSignOut = async () => { try { await auth!.signOut(); } catch (error) { console.error("Error signing out: ", error); } };
  const handleDisplayCurrencyChange = (currency: Currency) => { setDisplayCurrency(currency); preferencesRef.set({ displayCurrency: currency }, { merge: true }); };
  const handleStartNewMonth = () => { setSubmitError(null); setCurrentView('setup'); };
  const handleViewMonth = (monthId: string) => { setActiveMonthId(monthId); setCurrentView('monthly'); };
  const handleViewAnnual = (year: number) => { setActiveYear(year); setCurrentView('annual'); };
  const handleBackToDashboard = () => { setActiveMonthId(null); setActiveYear(null); setCurrentView('dashboard'); };

  const handleSetupMonth = async (year: number, month: number, limit: number, income: number, incomeGoal: number, currency: Currency): Promise<boolean> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
        const monthId = `${year}-${String(month).padStart(2, '0')}`;
        const newMonthDataObject: MonthlyData = { 
            id: monthId,
            year, 
            month, 
            limit, 
            baseIncome: income, 
            incomeGoal, 
            currency, 
            expenses: [], 
            incomeTransactions: [] 
        };

        await monthlyDataRef.doc(monthId).set(newMonthDataObject);

        setAllMonthlyData(prevData => [newMonthDataObject, ...prevData].sort((a, b) => b.id.localeCompare(a.id)));
        
        setActiveMonthId(monthId);
        setCurrentView('monthly');
        
        addToast(t('successMonthCreated'), 'success');
        return true;
    } catch (error: any) {
        const message = error.message || t('errorCreateBudget');
        setSubmitError(message);
        addToast(message, 'error');
        return false;
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSetupFirstMonth = async (limit: number, income: number, currency: Currency) => {
      const now = new Date();
      const success = await handleSetupMonth(now.getFullYear(), now.getMonth() + 1, limit, income, 0, currency);
      if (success) setIsInitialSetup(false);
  };
  
  const handleDeleteMonth = async (monthId: string) => {
    if (window.confirm(t('confirmDeleteMonth'))) {
        setDeletingMonthId(monthId);
        try { 
            await monthlyDataRef.doc(monthId).delete(); 
            addToast(t('successMonthDeleted'), 'success');
        }
        catch (error: any) { 
            addToast(error.message || t('errorDeleteMonth'), 'error');
            console.error("Error deleting month:", error); 
        }
        finally { setDeletingMonthId(null); }
    }
  };

  const handleAddExpense = async (expense: Omit<Expense, 'id' | 'date'>): Promise<boolean> => {
    if (!activeMonthId) {
        addToast(t('errorActiveMonth'), 'error');
        return false;
    }
    setIsSubmitting(true);
    try {
      const newExpense: Expense = { ...expense, id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, date: new Date().toISOString() };
      await monthlyDataRef.doc(activeMonthId).update({ expenses: firebase.firestore.FieldValue.arrayUnion(newExpense) });
      addToast(t('successExpenseAdded'), 'success');
      return true;
    } catch (error: any) { 
        addToast(error.message || t('errorAddExpense'), 'error');
        console.error("Error adding expense:", error); return false; 
    }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!activeMonthId) return;
    setDeletingExpenseId(id);
    const docRef = monthlyDataRef.doc(activeMonthId);
    try {
      await db!.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        const data = doc.data() as MonthlyData;
        const newExpenses = data.expenses.filter(e => e.id !== id);
        transaction.update(docRef, { expenses: newExpenses });
      });
      addToast(t('successExpenseDeleted'), 'success');
    } catch (error: any) { 
        addToast(error.message || t('errorDeleteExpense'), 'error');
        console.error("Error deleting expense:", error); 
    }
    finally { setDeletingExpenseId(null); }
  };
  
  const handleAddIncomeSource = async (source: Omit<IncomeSource, 'id'>): Promise<boolean> => {
    setIsSubmitting(true);
    try { 
        await incomeSourcesRef.add(source); 
        addToast(t('successSourceAdded'), 'success');
        return true; 
    }
    catch(error: any) { 
        addToast(error.message || t('errorAddSource'), 'error');
        console.error(error); 
        return false; 
    }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteIncomeSource = async (id: string) => {
    setDeletingSourceId(id);
    try { 
        await incomeSourcesRef.doc(id).delete(); 
        addToast(t('successSourceDeleted'), 'success');
    }
    catch(error: any) { 
        addToast(error.message || t('errorDeleteSource'), 'error');
        console.error(error); 
    }
    finally { setDeletingSourceId(null); }
  };
  
  const handleUpdateIncomeSource = async (updatedSource: IncomeSource): Promise<boolean> => {
    setIsSubmitting(true);
    const { id, ...data } = updatedSource;
    try { 
        await incomeSourcesRef.doc(id).update(data); 
        addToast(t('successSourceUpdated'), 'success');
        return true; 
    }
    catch(error: any) { 
        addToast(error.message || t('errorUpdateSource'), 'error');
        console.error(error); 
        return false; 
    }
    finally { setIsSubmitting(false); }
  };

  const handleAddIncomeTransaction = async (source: IncomeSource, date: string): Promise<boolean> => {
    if(!activeMonthId) return false;
    setIsSubmitting(true);
    try {
        const newTransaction: IncomeTransaction = { id: `${Date.now()}`, name: source.name, amount: source.amount, date: new Date(`${date}T00:00:00`).toISOString(), category: source.category, status: 'pending' };
        await monthlyDataRef.doc(activeMonthId).update({ incomeTransactions: firebase.firestore.FieldValue.arrayUnion(newTransaction) });
        addToast(t('successTransactionAdded'), 'success');
        return true;
    } catch(error: any) { 
        addToast(error.message || t('errorAddTransaction'), 'error');
        console.error(error); 
        return false; 
    }
    finally { setIsSubmitting(false); }
  };
  
  const handleDeleteIncomeTransaction = async (id: string) => {
    if (!activeMonthId) return;
    setDeletingTransactionId(id);
    const docRef = monthlyDataRef.doc(activeMonthId);
    try {
        await db!.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            const data = doc.data() as MonthlyData;
            const newTransactions = data.incomeTransactions.filter(t => t.id !== id);
            transaction.update(docRef, { incomeTransactions: newTransactions });
        });
        addToast(t('successTransactionDeleted'), 'success');
    } catch (error: any) { 
        addToast(error.message || t('errorDeleteTransaction'), 'error');
        console.error(error); 
    }
    finally { setDeletingTransactionId(null); }
  };

  const handleUpdateIncomeTransactionStatus = async (id: string, status: 'completed') => {
    if (!activeMonthId) return;
    const docRef = monthlyDataRef.doc(activeMonthId);
    try {
        await db!.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            const data = doc.data() as MonthlyData;
            const newTransactions = data.incomeTransactions.map(t => t.id === id ? { ...t, status } : t);
            transaction.update(docRef, { incomeTransactions: newTransactions });
        });
        addToast(t('successTransactionUpdated'), 'success');
    } catch(error: any) { 
        addToast(error.message || t('errorUpdateTransaction'), 'error');
        console.error(error); 
    }
  };

  const handleUpdateCategoryBudgets = async (budgets: { [key: string]: number }): Promise<boolean> => {
    if (!activeMonthId) {
        addToast(t('errorActiveMonth'), 'error');
        return false;
    }
    setIsSubmitting(true);
    try { 
        await monthlyDataRef.doc(activeMonthId).update({ categoryBudgets: budgets });
        addToast(t('successBudgetsSaved'), 'success');
        return true; 
    }
    catch(error: any) { 
        addToast(error.message || t('errorSaveBudgets'), 'error');
        console.error(error); 
        return false; 
    }
    finally { setIsSubmitting(false); }
  };

  const handleUpdateCategoryColors = async (colors: { [key: string]: string }): Promise<boolean> => {
    setIsSubmitting(true);
    try { 
        await preferencesRef.set({ categoryColors: colors }, { merge: true }); 
        addToast(t('successColorsSaved'), 'success');
        return true; 
    }
    catch(error: any) { 
        addToast(error.message || t('errorSaveColors'), 'error');
        console.error(error); 
        return false; 
    }
    finally { setIsSubmitting(false); }
  };

  const handleUpdateIncomeGoal = async (goal: number): Promise<boolean> => {
    if (!activeMonthId) {
        addToast(t('errorActiveMonth'), 'error');
        return false;
    }
    setIsSubmitting(true);
    try { 
        await monthlyDataRef.doc(activeMonthId).update({ incomeGoal: goal });
        addToast(t('successGoalSet'), 'success');
        return true; 
    }
    catch(error: any) { 
        addToast(error.message || t('errorSetGoal'), 'error');
        console.error(error); 
        return false; 
    }
    finally { setIsSubmitting(false); }
  };

  const renderContent = () => {
    if (firestoreError) return <ErrorDisplay message={firestoreError} />;
    if (loading) return <LoadingSpinner />;
    if (isInitialSetup) return <LimitSetter onSetup={handleSetupFirstMonth} isSubmitting={isSubmitting} submissionError={submitError} />;

    switch(currentView) {
      case 'setup': return <MonthlySetup onSetup={handleSetupMonth} onCancel={handleBackToDashboard} existingMonths={allMonthlyData.map(d => d.id)} isSubmitting={isSubmitting} submissionError={submitError} />;
      case 'monthly':
        if (activeMonthData) {
            return <MonthlyView {...{user, monthData: activeMonthData, incomeSources, onAddExpense: handleAddExpense, onDeleteExpense: handleDeleteExpense, onAddIncomeSource: handleAddIncomeSource, onDeleteIncomeSource: handleDeleteIncomeSource, onUpdateIncomeSource: handleUpdateIncomeSource, onAddIncomeTransaction: handleAddIncomeTransaction, onDeleteIncomeTransaction: handleDeleteIncomeTransaction, onUpdateIncomeTransactionStatus: handleUpdateIncomeTransactionStatus, onUpdateCategoryBudgets: handleUpdateCategoryBudgets, onUpdateCategoryColors: handleUpdateCategoryColors, categoryColors, onUpdateIncomeGoal: handleUpdateIncomeGoal, onBackToDashboard: handleBackToDashboard, onSignOut: handleSignOut, displayCurrency, onDisplayCurrencyChange: handleDisplayCurrencyChange, conversionRate, ratesLoading, ratesError, isSubmitting, submitError, deletingExpenseId, deletingSourceId, deletingTransactionId}} />;
        }
        handleBackToDashboard(); return null;
      case 'annual':
        if (activeYear) {
            return <AnnualView {...{user, year: activeYear, annualData: allMonthlyData.filter(d => d.year === activeYear), onBackToDashboard: handleBackToDashboard, onSignOut: handleSignOut, displayCurrency, conversionRate, allAvailableYears, onYearChange: setActiveYear}} />
        }
        handleBackToDashboard(); return null;
      default: return <Dashboard {...{user, monthlyData: allMonthlyData, onStartNewMonth: handleStartNewMonth, onViewMonth: handleViewMonth, onViewAnnual: handleViewAnnual, onDeleteMonth: handleDeleteMonth, onSignOut: handleSignOut, deletingMonthId}} />;
    }
  };

  return <>{renderContent()}</>;
}