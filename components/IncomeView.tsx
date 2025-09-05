import React, { useState, useMemo } from 'react';
import type { IncomeSource, IncomeTransaction, Currency } from '../types';
import { INCOME_CATEGORIES } from '../constants';

interface IncomeViewProps {
  incomeSources: IncomeSource[];
  incomeTransactions: IncomeTransaction[];
  baseCurrency: Currency;
  displayCurrency: Currency;
  onAddSource: (source: Omit<IncomeSource, 'id'>) => void;
  onDeleteSource: (id: string) => void;
  onUpdateSource: (source: IncomeSource) => void;
  onAddTransaction: (source: IncomeSource, date: string) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransactionStatus: (id: string, status: 'completed') => void;
  conversionRate: number;
  incomeGoal: number | undefined;
  onUpdateIncomeGoal: (goal: number) => void;
}

const PendingIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CompletedIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


export const IncomeView: React.FC<IncomeViewProps> = ({
  incomeSources,
  incomeTransactions,
  baseCurrency,
  displayCurrency,
  onAddSource,
  onDeleteSource,
  onUpdateSource,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateTransactionStatus,
  conversionRate,
  incomeGoal,
  onUpdateIncomeGoal,
}) => {
  const [sourceName, setSourceName] = useState('');
  const [sourceAmount, setSourceAmount] = useState('');
  const [sourceCategory, setSourceCategory] = useState<string>(INCOME_CATEGORIES[0].id);
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});
  const [quickAddError, setQuickAddError] = useState('');
  const [transactionDate, setTransactionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ name: string, amount: string, category: string }>({ name: '', amount: '', category: ''});
  const [editErrors, setEditErrors] = useState<{ name?: string; amount?: string }>({});
  
  const [isEditingIncomeGoal, setIsEditingIncomeGoal] = useState(false);
  const [newIncomeGoal, setNewIncomeGoal] = useState('');

  const { pendingTransactions, completedTransactions, totalCompletedIncome } = useMemo(() => {
    const pending: IncomeTransaction[] = [];
    const completed: IncomeTransaction[] = [];
    let completedSum = 0;
    incomeTransactions.forEach(t => {
      if (t.status === 'pending') {
        pending.push(t);
      } else {
        completed.push(t);
        completedSum += t.amount;
      }
    });
    return { pendingTransactions, completedTransactions, totalCompletedIncome: completedSum };
  }, [incomeTransactions]);
  
  const totalIncomeInDisplayCurrency = totalCompletedIncome * conversionRate;
  const incomeGoalInDisplayCurrency = (incomeGoal || 0) * conversionRate;
  const incomePercentage = incomeGoalInDisplayCurrency > 0 ? (totalIncomeInDisplayCurrency / incomeGoalInDisplayCurrency) * 100 : 0;

  const validateField = (fieldName: 'name' | 'amount', value: string): string | undefined => {
    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          return 'Please enter a source name.';
        }
        break;
      case 'amount':
        const amountValue = parseFloat(value);
        if (isNaN(amountValue) || amountValue <= 0) {
          return 'Please enter a valid, positive amount.';
        }
        break;
    }
    return undefined;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name' || name === 'amount') {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    const nameError = validateField('name', sourceName);
    const amountError = validateField('amount', sourceAmount);

    if (nameError || amountError) {
      setErrors({ name: nameError, amount: amountError });
      return;
    }

    onAddSource({ name: sourceName.trim(), amount: parseFloat(sourceAmount), category: sourceCategory });
    setSourceName('');
    setSourceAmount('');
    setSourceCategory(INCOME_CATEGORIES[0].id);
    setErrors({});
  };
  
  const handleSaveIncomeGoal = () => {
    const goalValue = parseFloat(newIncomeGoal);
    if (!isNaN(goalValue) && goalValue >= 0) {
        // Convert back to base currency before saving
        const baseCurrencyGoal = conversionRate !== 0 ? goalValue / conversionRate : goalValue;
        onUpdateIncomeGoal(baseCurrencyGoal);
        setIsEditingIncomeGoal(false);
    }
  };

  const handleQuickAddTransaction = (source: IncomeSource) => {
    if (!transactionDate || isNaN(new Date(transactionDate).getTime())) {
      setQuickAddError('Please select a valid date for the transaction.');
      return;
    }
    setQuickAddError('');
    onAddTransaction(source, transactionDate);
  };
  
  const handleEditClick = (source: IncomeSource) => {
    setEditingSourceId(source.id);
    setEditFormData({ name: source.name, amount: String(source.amount), category: source.category });
    setEditErrors({});
  };

  const handleCancelEdit = () => {
    setEditingSourceId(null);
  };

  const handleUpdateSource = (sourceId: string) => {
    const nameError = validateField('name', editFormData.name);
    const amountError = validateField('amount', editFormData.amount);

    if (nameError || amountError) {
      setEditErrors({ name: nameError, amount: amountError });
      return;
    }
    
    onUpdateSource({
      id: sourceId,
      name: editFormData.name.trim(),
      amount: parseFloat(editFormData.amount),
      category: editFormData.category,
    });
    setEditingSourceId(null);
  };

  const handleDeleteWithConfirmation = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the income source "${name}"? This action cannot be undone.`)) {
      onDeleteSource(id);
    }
  };

  const isConverting = baseCurrency.code !== displayCurrency.code;

  return (
    <div className="space-y-6">
      {isConverting && (
        <div className="bg-sky-900/50 border border-sky-700 text-sky-300 px-4 py-3 rounded-lg flex items-center" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="block sm:inline">
            Displaying in <strong>{displayCurrency.code}</strong>. Rate: 1 {baseCurrency.code} = {conversionRate.toFixed(2)} {displayCurrency.code}
          </span>
        </div>
      )}
      
      {/* Income Goal Section */}
      <div className="glass-card bg-opacity-30 p-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Monthly Income Goal</h3>
            {!isEditingIncomeGoal && (
                <button
                    onClick={() => {
                        setIsEditingIncomeGoal(true);
                        setNewIncomeGoal(String(incomeGoalInDisplayCurrency.toFixed(2).replace('.00', '') || ''));
                    }}
                    className="text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-1 px-2 rounded-lg transition-colors"
                >
                    {incomeGoal && incomeGoal > 0 ? 'Edit Goal' : 'Set Goal'}
                </button>
            )}
        </div>

        {isEditingIncomeGoal ? (
            <div className="flex items-center gap-2 mt-3">
                <div className="relative flex-grow">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{displayCurrency.symbol}</span>
                    <input
                        type="number"
                        value={newIncomeGoal}
                        onChange={(e) => setNewIncomeGoal(e.target.value)}
                        placeholder="Set income goal"
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-700/50 text-white border border-slate-600 rounded-md focus:ring-1 focus:ring-sky-500 outline-none"
                        aria-label="Monthly income goal"
                    />
                </div>
                <button onClick={handleSaveIncomeGoal} className="p-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white transition-colors" aria-label="Save income goal">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </button>
                 <button onClick={() => setIsEditingIncomeGoal(false)} className="p-2 rounded-md bg-slate-600/50 hover:bg-slate-500/50 text-white transition-colors" aria-label="Cancel editing income goal">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
        ) : (
            <div className="mt-2 space-y-2">
                <p className="text-2xl font-bold text-green-400">
                    {`${displayCurrency.symbol}${totalIncomeInDisplayCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    {incomeGoal && incomeGoal > 0 && (
                       <span className="text-lg text-slate-400 font-semibold"> / {`${displayCurrency.symbol}${incomeGoalInDisplayCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                    )}
                </p>
                {incomeGoal && incomeGoal > 0 ? (
                    <div className="w-full bg-slate-700/50 rounded-full h-2.5">
                        <div
                            className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(incomePercentage, 100)}%` }}
                        ></div>
                    </div>
                ) : (
                     <p className="text-xs text-slate-500">
                        No goal set.
                    </p>
                )}
            </div>
        )}
      </div>

      {/* Form to add new income source */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Add New Income Source</h3>
        <form onSubmit={handleAddSource} className="glass-card bg-opacity-30 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="source-name" className="block text-sm font-medium text-slate-300 mb-1">Source Name</label>
              <input
                id="source-name"
                name="name"
                type="text"
                value={sourceName}
                onChange={(e) => {
                  setSourceName(e.target.value);
                  if (errors.name) setErrors(p => ({ ...p, name: undefined }));
                }}
                onBlur={handleBlur}
                placeholder="e.g., Lesson with Alex"
                className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`}
                aria-label="Income Source Name"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="source-category" className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <select
                id="source-category"
                value={sourceCategory}
                onChange={e => setSourceCategory(e.target.value)}
                className="w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none border-slate-600 focus:ring-sky-500"
              >
                {INCOME_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="source-amount" className="block text-sm font-medium text-slate-300 mb-1">Amount ({baseCurrency.code})</label>
              <div className={`flex items-center bg-slate-700/50 border rounded-lg focus-within:ring-2 transition-all ${errors.amount ? 'border-red-500 focus-within:ring-red-500' : 'border-slate-600 focus-within:ring-sky-500'}`}>
                <span className="py-2 pl-3 pr-2 text-slate-400 border-r border-slate-600">{baseCurrency.symbol}</span>
                <input
                  id="source-amount"
                  name="amount"
                  type="number"
                  value={sourceAmount}
                  onChange={(e) => {
                    setSourceAmount(e.target.value)
                    if (errors.amount) setErrors(p => ({ ...p, amount: undefined }));
                  }}
                  onBlur={handleBlur}
                  placeholder="Amount"
                  min="0.01"
                  step="0.01"
                  className="flex-grow bg-transparent text-white py-2 px-2 outline-none"
                  aria-label="Income Source Amount"
                  aria-invalid={!!errors.amount}
                />
              </div>
              {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount}</p>}
            </div>
            <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
              Add Source
            </button>
          </div>
        </form>
      </div>

      {/* List of income sources */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Your Income Sources</h3>
        <p className="text-sm text-slate-400 mb-3 -mt-2">Quickly add a pending transaction or manage your sources.</p>
        <div className="mb-4">
          <label htmlFor="transaction-date" className="block text-sm font-medium text-slate-300 mb-1">
            Transaction Date
          </label>
          <input
            id="transaction-date"
            type="date"
            value={transactionDate}
            onChange={(e) => {
              setTransactionDate(e.target.value);
              if (quickAddError) setQuickAddError('');
            }}
            className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none transition-colors ${quickAddError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`}
            aria-label="Transaction Date"
            aria-invalid={!!quickAddError}
          />
           {quickAddError && <p className="text-red-400 text-sm mt-2">{quickAddError}</p>}
        </div>
        {incomeSources.length === 0 ? (
          <p className="text-slate-400">No income sources defined yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {incomeSources.map(source => editingSourceId === source.id ? (
                // EDITING VIEW
                <div key={source.id} className="bg-slate-700/50 p-3 rounded-lg ring-2 ring-sky-500 space-y-3">
                    <div>
                        <input
                            type="text"
                            value={editFormData.name}
                            onChange={(e) => {
                                setEditFormData(p => ({...p, name: e.target.value}));
                                if (editErrors.name) setEditErrors(p => ({...p, name: undefined}));
                            }}
                            className={`w-full p-1.5 text-sm bg-slate-800 text-white border rounded-md outline-none focus:ring-1 ${editErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`}
                            aria-label="Edit Source Name"
                        />
                        {editErrors.name && <p className="text-red-400 text-xs mt-1">{editErrors.name}</p>}
                    </div>
                    <div>
                         <select
                            value={editFormData.category}
                            onChange={e => setEditFormData(p => ({...p, category: e.target.value}))}
                            className="w-full p-1.5 text-sm bg-slate-800 text-white border rounded-md outline-none focus:ring-1 border-slate-600 focus:ring-sky-500"
                            aria-label="Edit Source Category"
                        >
                            {INCOME_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <div className={`flex items-center bg-slate-800 border rounded-md focus-within:ring-1 ${editErrors.amount ? 'border-red-500 focus-within:ring-red-500' : 'border-slate-600 focus-within:ring-sky-500'}`}>
                            <span className="py-1.5 pl-2 pr-1.5 text-sm text-slate-400 border-r border-slate-600">{baseCurrency.symbol}</span>
                            <input
                                type="number"
                                value={editFormData.amount}
                                onChange={(e) => {
                                    setEditFormData(p => ({...p, amount: e.target.value}));
                                    if (editErrors.amount) setEditErrors(p => ({...p, amount: undefined}));
                                }}
                                className="flex-grow bg-transparent text-white text-sm py-1.5 px-2 outline-none"
                                aria-label="Edit Source Amount"
                            />
                        </div>
                        {editErrors.amount && <p className="text-red-400 text-xs mt-1">{editErrors.amount}</p>}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={handleCancelEdit} className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-600/50 hover:bg-slate-500/50 px-3 py-1.5 rounded-md transition-colors">Cancel</button>
                        <button onClick={() => handleUpdateSource(source.id)} className="text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-md transition-colors">Save</button>
                    </div>
                </div>
            ) : (
                // DISPLAY VIEW
                <div key={source.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center group transition-colors hover:bg-slate-700/50">
                    <div>
                        <p className="font-semibold text-white">{source.name}</p>
                        <p className="text-sm text-slate-400 -mt-1">{INCOME_CATEGORIES.find(c => c.id === source.category)?.name}</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-green-400 font-bold">{displayCurrency.symbol}{(source.amount * conversionRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            {isConverting && <p className="text-xs text-slate-400">from {baseCurrency.symbol}{source.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <button onClick={() => handleQuickAddTransaction(source)} aria-label={`Add income from ${source.name}`} className="bg-green-500/20 hover:bg-green-500/40 text-green-300 font-bold p-2 rounded-full transition-all transform scale-100 group-hover:scale-110">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-1">
                            <button onClick={() => handleEditClick(source)} aria-label={`Edit source ${source.name}`} className="text-slate-400 hover:text-sky-400 p-2 rounded-full hover:bg-sky-500/20 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteWithConfirmation(source.id, source.name)} aria-label={`Delete source ${source.name}`} className="text-slate-400 hover:text-red-400 p-2 rounded-full hover:bg-red-500/20 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
          </div>
        )}
      </div>

      {/* List of recent income transactions */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Recent Income Transactions</h3>
        {incomeTransactions.length === 0 ? (
          <div className="flex items-center justify-center h-24 glass-card bg-opacity-30">
            <p className="text-slate-400">No income recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
              {pendingTransactions.length > 0 && (
                  <div>
                      <h4 className="text-sm font-semibold text-yellow-300 mb-2">Pending</h4>
                      <ul className="space-y-3">
                          {pendingTransactions.map(transaction => {
                              const convertedAmount = transaction.amount * conversionRate;
                              return (
                                  <li key={transaction.id} className="group flex items-center justify-between bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r-lg hover:bg-yellow-900/30 transition-colors duration-200">
                                      <div className="flex items-center space-x-4">
                                          <div className="p-2 rounded-full bg-slate-700">
                                              <PendingIcon className="w-6 h-6 text-yellow-400" />
                                          </div>
                                          <div>
                                              <p className="font-medium text-white">{transaction.name}</p>
                                              <p className="text-sm text-slate-400">{new Date(transaction.date).toLocaleDateString()}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                          <div className="text-right">
                                              <p className="font-bold text-yellow-300">
                                                  + {displayCurrency.symbol}{convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </p>
                                              {isConverting && <p className="text-xs text-slate-400">from {baseCurrency.symbol}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
                                          </div>
                                          <button onClick={() => onUpdateTransactionStatus(transaction.id, 'completed')} aria-label={`Mark transaction from ${transaction.name} as paid`} className="text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 transform group-hover:scale-110">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                          </button>
                                          <button onClick={() => onDeleteTransaction(transaction.id)} aria-label={`Delete transaction for ${transaction.name}`} className="text-slate-400 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 transform group-hover:scale-110">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                          </button>
                                      </div>
                                  </li>
                              );
                          })}
                      </ul>
                  </div>
              )}
              {completedTransactions.length > 0 && (
                  <div>
                      <h4 className="text-sm font-semibold text-green-300 mb-2">Completed</h4>
                      <ul className="space-y-3">
                          {completedTransactions.map(transaction => {
                              const convertedAmount = transaction.amount * conversionRate;
                              return (
                                  <li key={transaction.id} className="group flex items-center justify-between bg-slate-800/50 p-4 rounded-lg hover:bg-slate-700/50 transition-colors duration-200">
                                      <div className="flex items-center space-x-4">
                                          <div className="p-2 rounded-full bg-slate-700">
                                              <CompletedIcon className="w-6 h-6 text-green-400" />
                                          </div>
                                          <div>
                                              <p className="font-medium text-white">{transaction.name}</p>
                                              <p className="text-sm text-slate-400">{new Date(transaction.date).toLocaleDateString()}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                          <div className="text-right">
                                              <p className="font-bold text-green-400">
                                                  + {displayCurrency.symbol}{convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </p>
                                              {isConverting && <p className="text-xs text-slate-400">from {baseCurrency.symbol}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
                                          </div>
                                          <button onClick={() => onDeleteTransaction(transaction.id)} aria-label={`Delete transaction for ${transaction.name}`} className="text-slate-400 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 transform group-hover:scale-110">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                          </button>
                                      </div>
                                  </li>
                              );
                          })}
                      </ul>
                  </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};