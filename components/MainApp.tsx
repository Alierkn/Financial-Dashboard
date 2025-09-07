import React, { useState, useMemo, useEffect } from 'react';
// FIX: The `User` type is not exported from 'firebase/auth' in the compat library. It should be accessed via the `firebase` object.
import { firebase } from '../firebase';
import { useExchangeRates } from '../hooks/useExchangeRates';
import type { Expense, Currency, IncomeSource, IncomeTransaction, MonthlyData, CategoryId, RecurringTransaction, IncomeCategoryId } from '../types';
import { CURRENCIES } from '../constants';
import { Dashboard } from './Dashboard';
import { MonthlySetup } from './MonthlySetup';
import { MonthlyView } from './MonthlyView';
import { AnnualView } from './AnnualView';
import { LimitSetter } from './LimitSetter';
import { auth, db } from '../firebase';
import { useLanguage } from '../contexts/LanguageProvider';
import { useToast } from '../contexts/ToastProvider';

type View = 'dashboard' | 'setup' | 'monthly' | 'annual';

interface MainAppProps {
  // FIX: Use `firebase.User` type from the compat library.
  user: firebase.User;
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
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
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
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [deletingRecurringId, setDeletingRecurringId] = useState<string | null>(null);

  const monthlyDataRef = useMemo(() => db!.collection('users').doc(user.uid).collection('monthlyData'), [user.uid]);
  const incomeSourcesRef = useMemo(() => db!.collection('users').doc(user.uid).collection('incomeSources'), [user.uid]);
  const recurringTransactionsRef = useMemo(() => db!.collection('users').doc(user.uid).collection('recurringTransactions'), [user.uid]);
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
    
    const unsubscribeRecurring = recurringTransactionsRef.onSnapshot(snapshot => {
      setRecurringTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as RecurringTransaction)));
    }, (error) => handleError(error, 'recurring transactions'));

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
      unsubscribeRecurring();
    };
  }, [monthlyDataRef, incomeSourcesRef, preferencesRef, recurringTransactionsRef, t, loading]);

  useEffect(() => {
    if (loading || recurringTransactions.length === 0) return;
    
    const checkAndCreateRecurringTransactions = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const batch = db!.batch();
      let hasUpdates = false;

      for (const rt of recurringTransactions) {
        let nextExecutionDate = new Date(rt.nextExecutionDate);
        
        while (nextExecutionDate <= today) {
          hasUpdates = true;
          const targetYear = nextExecutionDate.getFullYear();
          const targetMonth = nextExecutionDate.getMonth() + 1;
          const targetMonthId = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
          
          const docRef = monthlyDataRef.doc(targetMonthId);
          const docSnap = await docRef.get();
          const data = docSnap.data() as MonthlyData | undefined;

          if (rt.type === 'expense') {
             const newExpense: Expense = {
                id: `exp-rec-${Date.now()}`, amount: rt.amount, date: nextExecutionDate.toISOString(),
                description: `${rt.description} (${t('recurring')})`, category: rt.category as CategoryId,
                paymentMethod: 'credit-card', status: 'pending',
             };
             if (data) { batch.update(docRef, { expenses: firebase.firestore.FieldValue.arrayUnion(newExpense) }); }
             else { /* Create new month doc if needed - this case is complex, will address if required by users */ }
          } else { // income
             const newIncome: IncomeTransaction = {
                id: `inc-rec-${Date.now()}`, name: `${rt.description} (${t('recurring')})`, amount: rt.amount,
                date: nextExecutionDate.toISOString(), category: rt.category as IncomeCategoryId, status: 'pending',
             };
             if (data) { batch.update(docRef, { incomeTransactions: firebase.firestore.FieldValue.arrayUnion(newIncome) }); }
             else { /* Create new month doc if needed */ }
          }

          const newNextDate = new Date(nextExecutionDate);
          newNextDate.setMonth(newNextDate.getMonth() + 1);
          nextExecutionDate = newNextDate;
          batch.update(recurringTransactionsRef.doc(rt.id), { nextExecutionDate: newNextDate.toISOString().slice(0, 10) });
        }
      }
      
      if (hasUpdates) {
        try {
          await batch.commit();
          addToast(t('recurringTransactionsUpdated'), 'success');
        } catch (error) {
          console.error("Error processing recurring transactions:", error);
          addToast(t('errorProcessingRecurring'), 'error');
        }
      }
    };
    
    checkAndCreateRecurringTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, recurringTransactions]); // Run only when data is loaded

  const activeMonthData = useMemo(() => allMonthlyData.find(d => d.id === activeMonthId) || null, [allMonthlyData, activeMonthId]);
  const allAvailableYears = useMemo(() => Array.from(new Set(allMonthlyData.map(d => d.year))).sort((a, b) => b - a), [allMonthlyData]);
  const baseCurrencyForRates = activeMonthData?.currency.code || allMonthlyData[0]?.currency.code || CURRENCIES[0].code;
  const { rates, isLoading: ratesLoading, error: ratesError } = useExchangeRates(baseCurrencyForRates);

  useEffect(() => {
    // When switching to a new month view, default the display currency to that month's base currency.
    if (activeMonthData) {
      setDisplayCurrency(activeMonthData.currency);
    }
  }, [activeMonthData]);

  const conversionRate = useMemo(() => {
    if (!rates || !activeMonthData) return 1;
    // We need to convert from the month's base currency to the selected display currency.
    // The useExchangeRates hook returns rates relative to baseCurrencyForRates.
    const baseRate = rates[activeMonthData.currency.code] || 1; 
    const displayRate = rates[displayCurrency.code] || 1;
    
    if (baseRate === 0) return 1; // Avoid division by zero
    
    return displayRate / baseRate;
  }, [rates, displayCurrency, activeMonthData]);


  // Handler for saving display currency preference
  const handleDisplayCurrencyChange = (currency: Currency) => {
    setDisplayCurrency(currency);
    preferencesRef.set({ displayCurrency: currency }, { merge: true }).catch(console.error);
  };
  
  // Firestore operation wrapper
  const handleFirestoreOp = async <T,>(op: () => Promise<T>, successMsg: string, errorMsg: string): Promise<T | null> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await op();
      addToast(successMsg, 'success');
      return result;
    } catch (error: any) {
      console.error(errorMsg, error);
      const message = error.message || errorMsg;
      setSubmitError(message);
      addToast(message, 'error');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    auth!.signOut();
  };

  const handleInitialSetup = async (limit: number, income: number, currency: Currency) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    await handleMonthlySetup(year, month, limit, income, 0, currency);
    setIsInitialSetup(false);
  };
  
  const handleMonthlySetup = async (year: number, month: number, limit: number, income: number, incomeGoal: number, currency: Currency) => {
    const monthId = `${year}-${String(month).padStart(2, '0')}`;
    const newMonthData: Omit<MonthlyData, 'id'> = {
      year,
      month,
      limit,
      baseIncome: income,
      incomeGoal: incomeGoal > 0 ? incomeGoal : undefined,
      currency,
      expenses: [],
      incomeTransactions: [],
      categoryBudgets: {}
    };
    
    const result = await handleFirestoreOp(
      () => monthlyDataRef.doc(monthId).set(newMonthData),
      t('successMonthCreated'),
      t('errorCreateBudget')
    );
    
    if(result !== null) {
      setActiveMonthId(monthId);
      setCurrentView('monthly');
    }
  };

  const handleDeleteMonth = async (monthId: string) => {
    if (window.confirm(t('confirmDeleteMonth'))) {
      setDeletingMonthId(monthId);
      await handleFirestoreOp(
        () => monthlyDataRef.doc(monthId).delete(),
        t('successMonthDeleted'),
        t('errorDeleteMonth')
      );
      setDeletingMonthId(null);
    }
  };

  const handleAddExpense = async (expenseData: { amount: number; description: string; category: CategoryId; paymentMethod: 'cash' | 'credit-card'; isInstallment: boolean; installments: number; }) => {
    if (!activeMonthId || !activeMonthData) { addToast(t('errorActiveMonth'), 'error'); return false; }

    const { amount, installments, isInstallment, ...rest } = expenseData;
    const installmentId = isInstallment ? `inst-${Date.now()}` : undefined;

    const success = await handleFirestoreOp(async () => {
        const batch = db!.batch();
        const expenseAmount = isInstallment ? amount / installments : amount;
        
        for (let i = 0; i < (isInstallment ? installments : 1); i++) {
            const expenseDate = new Date();
            expenseDate.setMonth(expenseDate.getMonth() + i);
            const targetYear = expenseDate.getFullYear();
            const targetMonth = expenseDate.getMonth() + 1;
            const targetMonthId = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

            const docRef = monthlyDataRef.doc(targetMonthId);
            const docSnap = await docRef.get();
            
            // FIX: Conditionally add `installmentDetails` to avoid sending `undefined` to Firestore.
            const newExpense: Expense = {
                id: `exp-${Date.now()}-${i}`,
                amount: expenseAmount,
                date: expenseDate.toISOString(),
                status: i === 0 ? 'paid' : 'pending',
                ...(isInstallment && { installmentDetails: { installmentId: installmentId!, current: i + 1, total: installments } }),
                ...rest
            };
            
            if (docSnap.exists) {
                batch.update(docRef, { expenses: firebase.firestore.FieldValue.arrayUnion(newExpense) });
            } else {
                // FIX: Automatically create future month documents if they don't exist.
                const newMonthTemplate: Omit<MonthlyData, 'id'> = {
                    year: targetYear,
                    month: targetMonth,
                    limit: activeMonthData.limit,
                    baseIncome: activeMonthData.baseIncome,
                    currency: activeMonthData.currency,
                    incomeGoal: activeMonthData.incomeGoal,
                    categoryBudgets: activeMonthData.categoryBudgets,
                    expenses: [newExpense],
                    incomeTransactions: [],
                };
                batch.set(docRef, newMonthTemplate);
            }
        }
        await batch.commit();
    }, t('successExpenseAdded'), t('errorAddExpense'));
    return success !== null;
  };
  
  const handleDeleteExpense = async (expenseId: string) => {
    if (!activeMonthId || !activeMonthData) return;
    setDeletingExpenseId(expenseId);
    
    const expenseToDelete = activeMonthData.expenses.find(e => e.id === expenseId);
    
    await handleFirestoreOp(async () => {
        if (expenseToDelete?.installmentDetails?.installmentId) {
            const batch = db!.batch();
            const allDocs = await monthlyDataRef.get();
            
            allDocs.forEach(doc => {
                const data = doc.data() as MonthlyData;
                const updatedExpenses = data.expenses.filter(exp => exp.installmentDetails?.installmentId !== expenseToDelete.installmentDetails!.installmentId);
                if (updatedExpenses.length < data.expenses.length) {
                    batch.update(doc.ref, { expenses: updatedExpenses });
                }
            });
            await batch.commit();
        } else {
            const updatedExpenses = activeMonthData.expenses.filter(e => e.id !== expenseId);
            await monthlyDataRef.doc(activeMonthId).update({ expenses: updatedExpenses });
        }
    }, t('successExpenseDeleted'), t('errorDeleteExpense'));
    
    setDeletingExpenseId(null);
  };
  
  const handleConfirmPayment = async (expenseId: string) => {
      if (!activeMonthId || !activeMonthData) return;
      setConfirmingPaymentId(expenseId);

      const updatedExpenses = activeMonthData.expenses.map(e => 
          e.id === expenseId ? { ...e, status: 'paid' as 'paid' } : e
      );

      await handleFirestoreOp(
          () => monthlyDataRef.doc(activeMonthId).update({ expenses: updatedExpenses }),
          t('successPaymentConfirmed'),
          t('errorConfirmingPayment')
      );
      setConfirmingPaymentId(null);
  };

  const handleAddIncomeSource = async (source: Omit<IncomeSource, 'id'>) => {
    const result = await handleFirestoreOp(
        () => incomeSourcesRef.add(source),
        t('successSourceAdded'),
        t('errorAddSource')
    );
    return result !== null;
  };

  const handleUpdateIncomeSource = async (source: IncomeSource) => {
    const { id, ...data } = source;
    const result = await handleFirestoreOp(
        () => incomeSourcesRef.doc(id).update(data),
        t('successSourceUpdated'),
        t('errorUpdateSource')
    );
    return result !== null;
  };

  const handleDeleteIncomeSource = async (id: string) => {
    setDeletingSourceId(id);
    await handleFirestoreOp(
        () => incomeSourcesRef.doc(id).delete(),
        t('successSourceDeleted'),
        t('errorDeleteSource')
    );
    setDeletingSourceId(null);
  };

  const handleAddIncomeTransaction = async (source: IncomeSource, date: string) => {
    if (!activeMonthId) return false;
    const newTransaction: IncomeTransaction = {
      id: `inc-${Date.now()}`,
      name: source.name,
      amount: source.amount,
      date: new Date(date).toISOString(),
      category: source.category,
      status: 'pending'
    };
    const result = await handleFirestoreOp(
        () => monthlyDataRef.doc(activeMonthId).update({
            incomeTransactions: firebase.firestore.FieldValue.arrayUnion(newTransaction)
        }),
        t('successTransactionAdded'),
        t('errorAddTransaction')
    );
    return result !== null;
  };

  const handleDeleteIncomeTransaction = async (id: string) => {
    if (!activeMonthId || !activeMonthData) return;
    setDeletingTransactionId(id);
    const updatedTransactions = activeMonthData.incomeTransactions.filter(t => t.id !== id);
    await handleFirestoreOp(
        () => monthlyDataRef.doc(activeMonthId).update({ incomeTransactions: updatedTransactions }),
        t('successTransactionDeleted'),
        t('errorDeleteTransaction')
    );
    setDeletingTransactionId(null);
  };
  
  const handleUpdateIncomeTransactionStatus = async (id: string, status: 'completed') => {
    if (!activeMonthId || !activeMonthData) return;
    const updatedTransactions = activeMonthData.incomeTransactions.map(t =>
        t.id === id ? { ...t, status } : t
    );
    await handleFirestoreOp(
        () => monthlyDataRef.doc(activeMonthId).update({ incomeTransactions: updatedTransactions }),
        t('successTransactionUpdated'),
        t('errorUpdateTransaction')
    );
  };

  const handleUpdateCategoryBudgets = async (budgets: { [key: string]: number }) => {
    if (!activeMonthId) return false;
    const result = await handleFirestoreOp(
        () => monthlyDataRef.doc(activeMonthId).update({ categoryBudgets: budgets }),
        t('successBudgetsSaved'),
        t('errorSaveBudgets')
    );
    return result !== null;
  };
  
  const handleUpdateCategoryColors = async (colors: { [key: string]: string }) => {
      const result = await handleFirestoreOp(
        () => preferencesRef.set({ categoryColors: colors }, { merge: true }),
        t('successColorsSaved'),
        t('errorSaveColors')
      );
      return result !== null;
  };
  
  const handleUpdateIncomeGoal = async (goal: number) => {
    if (!activeMonthId) return false;
    const result = await handleFirestoreOp(
        () => monthlyDataRef.doc(activeMonthId).update({ incomeGoal: goal }),
        t('successGoalSet'),
        t('errorSetGoal')
    );
    return result !== null;
  };

  const handleAddRecurringTransaction = async (transaction: Omit<RecurringTransaction, 'id' | 'nextExecutionDate'>) => {
    const nextExecutionDate = new Date(transaction.startDate);
    // Ensure next execution is not in the past relative to start date
    const today = new Date();
    today.setHours(0,0,0,0);
    while (nextExecutionDate < today) {
        nextExecutionDate.setMonth(nextExecutionDate.getMonth() + 1);
    }

    const newTransaction = {
      ...transaction,
      nextExecutionDate: nextExecutionDate.toISOString().slice(0, 10),
    };

    const result = await handleFirestoreOp(
      () => recurringTransactionsRef.add(newTransaction),
      t('successRecurringAdded'),
      t('errorRecurringAdd')
    );
    return result !== null;
  };

  const handleDeleteRecurringTransaction = async (id: string) => {
    if (window.confirm(t('confirmDeleteRecurring'))) {
        setDeletingRecurringId(id);
        await handleFirestoreOp(
            () => recurringTransactionsRef.doc(id).delete(),
            t('successRecurringDeleted'),
            t('errorRecurringDelete')
        );
        setDeletingRecurringId(null);
    }
  };

  // View Navigation
  const handleViewMonth = (monthId: string) => { setActiveMonthId(monthId); setCurrentView('monthly'); };
  const handleViewAnnual = (year: number) => { setActiveYear(year); setCurrentView('annual'); };
  const handleBackToDashboard = () => { setActiveMonthId(null); setActiveYear(null); setCurrentView('dashboard'); };
  
  // Render logic
  if (loading) return <LoadingSpinner />;
  if (firestoreError) return <ErrorDisplay message={firestoreError} />;
  if (isInitialSetup) return <LimitSetter onSetup={handleInitialSetup} isSubmitting={isSubmitting} submissionError={submitError} />;

  const renderContent = () => {
    switch(currentView) {
      case 'dashboard':
        return <Dashboard 
                  user={user}
                  monthlyData={allMonthlyData}
                  onStartNewMonth={() => setCurrentView('setup')}
                  onViewMonth={handleViewMonth}
                  onViewAnnual={handleViewAnnual}
                  onDeleteMonth={handleDeleteMonth}
                  onSignOut={handleSignOut}
                  deletingMonthId={deletingMonthId}
               />;
      case 'setup':
        return <MonthlySetup 
                  onSetup={handleMonthlySetup}
                  onCancel={handleBackToDashboard}
                  existingMonths={allMonthlyData.map(d => d.id)}
                  isSubmitting={isSubmitting}
                  submissionError={submitError}
                />;
      case 'monthly':
        if (!activeMonthData) return <ErrorDisplay message="Selected month data not found." />;
        return <MonthlyView 
                  user={user}
                  monthData={activeMonthData}
                  incomeSources={incomeSources}
                  recurringTransactions={recurringTransactions}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onConfirmPayment={handleConfirmPayment}
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
                  onAddRecurringTransaction={handleAddRecurringTransaction}
                  onDeleteRecurringTransaction={handleDeleteRecurringTransaction}
                  displayCurrency={displayCurrency}
                  onDisplayCurrencyChange={handleDisplayCurrencyChange}
                  conversionRate={conversionRate}
                  ratesLoading={ratesLoading}
                  ratesError={ratesError}
                  isSubmitting={isSubmitting}
                  submitError={submitError}
                  deletingExpenseId={deletingExpenseId}
                  confirmingPaymentId={confirmingPaymentId}
                  deletingSourceId={deletingSourceId}
                  deletingTransactionId={deletingTransactionId}
                  deletingRecurringId={deletingRecurringId}
                />;
      case 'annual':
        if (!activeYear) return <ErrorDisplay message="Selected year not found." />;
        return <AnnualView
                  user={user}
                  year={activeYear}
                  annualData={allMonthlyData.filter(d => d.year === activeYear)}
                  onBackToDashboard={handleBackToDashboard}
                  onSignOut={handleSignOut}
                  displayCurrency={displayCurrency}
                  conversionRate={conversionRate}
                  allAvailableYears={allAvailableYears}
                  onYearChange={setActiveYear}
               />;
      default:
        return <Dashboard user={user} monthlyData={allMonthlyData} onStartNewMonth={() => setCurrentView('setup')} onViewMonth={handleViewMonth} onViewAnnual={handleViewAnnual} onDeleteMonth={handleDeleteMonth} onSignOut={handleSignOut} deletingMonthId={deletingMonthId} />;
    }
  };

  return <>{renderContent()}</>;
};