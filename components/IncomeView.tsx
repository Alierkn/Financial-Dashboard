import React, { useState, useMemo } from 'react';
// FIX: Import IncomeCategoryId to strongly type category state.
import type { IncomeSource, IncomeTransaction, Currency, IncomeCategoryId } from '../types';
import { INCOME_CATEGORIES } from '../constants';
import { useLanguage } from '../contexts/LanguageProvider';

interface IncomeViewProps {
  incomeSources: IncomeSource[];
  incomeTransactions: IncomeTransaction[];
  baseCurrency: Currency;
  displayCurrency: Currency;
  onAddSource: (source: Omit<IncomeSource, 'id'>) => Promise<boolean>;
  onDeleteSource: (id: string) => Promise<void>;
  onUpdateSource: (source: IncomeSource) => Promise<boolean>;
  onAddTransaction: (source: IncomeSource, date: string) => Promise<boolean>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onUpdateTransactionStatus: (id: string, status: 'completed') => Promise<void>;
  conversionRate: number;
  incomeGoal: number | undefined;
  isSubmitting: boolean;
  deletingSourceId: string | null;
  deletingTransactionId: string | null;
}

const PendingIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CompletedIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// FIX: Implemented a robust number parsing function to handle locale-specific formats.
// This function correctly parses numbers like "1.500,50" by treating dots as
// thousand separators and commas as decimal separators.
const parseFloatLocale = (value: string) => {
    if (typeof value !== 'string') return NaN;
    // Remove all dots (thousands separators) and then replace the comma with a dot (decimal separator).
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
};


export const IncomeView: React.FC<IncomeViewProps> = (props) => {
  const {
    incomeSources, incomeTransactions, baseCurrency, displayCurrency,
    onAddSource, onDeleteSource, onUpdateSource, onAddTransaction,
    onDeleteTransaction, onUpdateTransactionStatus, conversionRate,
    incomeGoal, isSubmitting, deletingSourceId, deletingTransactionId
  } = props;
    
  const [sourceName, setSourceName] = useState('');
  const [sourceAmount, setSourceAmount] = useState('');
  // FIX: Use IncomeCategoryId type for sourceCategory state to match the IncomeSource type.
  const [sourceCategory, setSourceCategory] = useState<IncomeCategoryId>(INCOME_CATEGORIES[0].id);
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});
  const [quickAddError, setQuickAddError] = useState('');
  const [transactionDate, setTransactionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  // FIX: Use IncomeCategoryId type for editFormData.category state and provide a valid default.
  const [editFormData, setEditFormData] = useState<{ name: string, amount: string, category: IncomeCategoryId }>({ name: '', amount: '', category: INCOME_CATEGORIES[0].id});
  const [editErrors, setEditErrors] = useState<{ name?: string; amount?: string }>({});
  
  const { t } = useLanguage();

  const totalCompletedIncome = useMemo(() => {
    return incomeTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }, [incomeTransactions]);
  
  const totalIncomeInDisplayCurrency = totalCompletedIncome * conversionRate;
  const incomeGoalInDisplayCurrency = (incomeGoal || 0) * conversionRate;
  const incomePercentage = incomeGoalInDisplayCurrency > 0 ? (totalIncomeInDisplayCurrency / incomeGoalInDisplayCurrency) * 100 : 0;

  const validateField = (fieldName: 'name' | 'amount', value: string): string | undefined => {
    switch (fieldName) {
      case 'name':
        if (!value.trim()) return t('errorEnterSourceName');
        break;
      case 'amount':
        const amountValue = parseFloatLocale(value);
        if (isNaN(amountValue) || amountValue <= 0) return t('errorInvalidAmount');
        break;
    }
    return undefined;
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameError = validateField('name', sourceName);
    const amountError = validateField('amount', sourceAmount);

    if (nameError || amountError) {
      setErrors({ name: nameError, amount: amountError });
      return;
    }

    const success = await onAddSource({ name: sourceName.trim(), amount: parseFloatLocale(sourceAmount), category: sourceCategory });
    if(success) {
        setSourceName('');
        setSourceAmount('');
        setSourceCategory(INCOME_CATEGORIES[0].id);
        setErrors({});
    }
  };

  const handleQuickAddTransaction = (source: IncomeSource) => {
    if (!transactionDate || isNaN(new Date(transactionDate).getTime())) {
      setQuickAddError(t('errorInvalidDate'));
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

  const handleUpdateSource = async (sourceId: string) => {
    const nameError = validateField('name', editFormData.name);
    const amountError = validateField('amount', editFormData.amount);

    if (nameError || amountError) {
      setEditErrors({ name: nameError, amount: amountError });
      return;
    }
    
    const success = await onUpdateSource({
      id: sourceId,
      name: editFormData.name.trim(),
      amount: parseFloatLocale(editFormData.amount),
      category: editFormData.category,
    });
    if (success) setEditingSourceId(null);
  };

  const handleDeleteWithConfirmation = (id: string, name: string) => {
    if (window.confirm(t('confirmDeleteSource', { name }))) {
      onDeleteSource(id);
    }
  };
  
  const { pendingTransactions, completedTransactions } = useMemo(() => {
    const pending: IncomeTransaction[] = [];
    const completed: IncomeTransaction[] = [];
    incomeTransactions.forEach(t => {
      if (t.status === 'pending') {
        pending.push(t);
      } else {
        completed.push(t);
      }
    });
    return { pendingTransactions, completedTransactions };
  }, [incomeTransactions]);

  const isConverting = baseCurrency.code !== displayCurrency.code;

  return (
    <div className="space-y-6">
      {isConverting && (
        <div className="bg-sky-900/50 border border-sky-700 text-sky-300 px-4 py-3 rounded-lg flex items-center" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="block sm:inline" dangerouslySetInnerHTML={{ __html: t('displayingIn', { code: displayCurrency.code, rate: conversionRate.toFixed(2), baseCode: baseCurrency.code }) }}>
          </span>
        </div>
      )}
      
      <div className="glass-card bg-opacity-30 p-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">{t('monthlyIncomeGoal')}</h3>
        </div>
        <div className="mt-2 space-y-2">
            <p className="text-2xl font-bold text-green-400">
                {`${displayCurrency.symbol}${totalIncomeInDisplayCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${incomeGoal && incomeGoal > 0 ? ` / ${displayCurrency.symbol}${incomeGoalInDisplayCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}`}
            </p>
            {incomeGoal && incomeGoal > 0 ? (
                <div className="w-full bg-slate-700/50 rounded-full h-2.5">
                    <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(incomePercentage, 100)}%` }}></div>
                </div>
            ) : (
                <p className="text-xs text-slate-500">{t('noGoalSet')}</p>
            )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">{t('addNewIncomeSource')}</h3>
        <form onSubmit={handleAddSource} className="glass-card bg-opacity-30 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label htmlFor="source-name" className="block text-sm font-medium text-slate-300 mb-1">{t('sourceName')}</label><input id="source-name" name="name" type="text" value={sourceName} onChange={(e) => { setSourceName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }} placeholder={t('egLessonWithAlex')} className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`} aria-label={t('incomeSourceName')} aria-invalid={!!errors.name} /><p className="text-red-400 text-sm mt-1">{errors.name}</p></div>
            <div><label htmlFor="source-category" className="block text-sm font-medium text-slate-300 mb-1">{t('category')}</label><select id="source-category" value={sourceCategory} onChange={e => setSourceCategory(e.target.value as IncomeCategoryId)} className="w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none border-slate-600 focus:ring-sky-500">{INCOME_CATEGORIES.map(cat => (<option key={cat.id} value={cat.id}>{t(`incomeCategory_${cat.id}`)}</option>))}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div><label htmlFor="source-amount" className="block text-sm font-medium text-slate-300 mb-1">{t('amount')} ({baseCurrency.code})</label><div className={`flex items-center bg-slate-700/50 border rounded-lg focus-within:ring-2 transition-all ${errors.amount ? 'border-red-500 focus-within:ring-red-500' : 'border-slate-600 focus-within:ring-sky-500'}`}><span className="py-2 pl-3 pr-2 text-slate-400 border-r border-slate-600">{baseCurrency.symbol}</span><input id="source-amount" name="amount" type="text" inputMode="decimal" value={sourceAmount} onChange={(e) => { setSourceAmount(e.target.value); if (errors.amount) setErrors(p => ({ ...p, amount: undefined })); }} placeholder={t('amount')} className="flex-grow bg-transparent text-white py-2 px-2 outline-none" aria-label={t('incomeSourceAmount')} aria-invalid={!!errors.amount} /></div><p className="text-red-400 text-sm mt-1">{errors.amount}</p></div>
            <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50" disabled={isSubmitting}>{isSubmitting ? t('adding') : t('addSource')}</button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">{t('yourIncomeSources')}</h3><p className="text-sm text-slate-400 mb-3 -mt-2">{t('quickAddPrompt')}</p>
        <div className="mb-4"><label htmlFor="transaction-date" className="block text-sm font-medium text-slate-300 mb-1">{t('transactionDate')}</label><input id="transaction-date" type="date" value={transactionDate} onChange={(e) => { setTransactionDate(e.target.value); if (quickAddError) setQuickAddError(''); }} className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none transition-colors ${quickAddError ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`} aria-label={t('transactionDate')} aria-invalid={!!quickAddError} /><p className="text-red-400 text-sm mt-2">{quickAddError}</p></div>
        {incomeSources.length === 0 ? (<p className="text-slate-400">{t('noIncomeSources')}</p>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {incomeSources.map(source => (
                <div key={source.id} className={`p-3 rounded-lg transition-all duration-300 ${deletingSourceId === source.id ? 'opacity-40' : ''} ${editingSourceId === source.id ? 'bg-slate-700/50 ring-2 ring-sky-500' : 'bg-slate-800/50 group hover:bg-slate-700/50'}`}>
                {editingSourceId === source.id ? (
                    <div className="space-y-3"><div><input type="text" value={editFormData.name} onChange={(e) => { setEditFormData(p => ({...p, name: e.target.value})); if (editErrors.name) setEditErrors(p => ({...p, name: undefined})); }} className={`w-full p-1.5 text-sm bg-slate-800 text-white border rounded-md outline-none focus:ring-1 ${editErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`} aria-label={t('editSourceName')} /><p className="text-red-400 text-xs mt-1">{editErrors.name}</p></div><div><select value={editFormData.category} onChange={e => setEditFormData(p => ({...p, category: e.target.value as IncomeCategoryId}))} className="w-full p-1.5 text-sm bg-slate-800 text-white border rounded-md outline-none focus:ring-1 border-slate-600 focus:ring-sky-500" aria-label={t('editSourceCategory')}>{INCOME_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{t(`incomeCategory_${cat.id}`)}</option>)}</select></div><div><div className={`flex items-center bg-slate-800 border rounded-md focus-within:ring-1 ${editErrors.amount ? 'border-red-500 focus-within:ring-red-500' : 'border-slate-600 focus-within:ring-sky-500'}`}><span className="py-1.5 pl-2 pr-1.5 text-sm text-slate-400 border-r border-slate-600">{baseCurrency.symbol}</span><input type="text" inputMode="decimal" value={editFormData.amount} onChange={(e) => { setEditFormData(p => ({...p, amount: e.target.value})); if (editErrors.amount) setEditErrors(p => ({...p, amount: undefined})); }} className="flex-grow bg-transparent text-white text-sm py-1.5 px-2 outline-none" aria-label={t('editSourceAmount')} /></div><p className="text-red-400 text-xs mt-1">{editErrors.amount}</p></div><div className="flex items-center justify-end gap-2"><button onClick={() => setEditingSourceId(null)} className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-600/50 hover:bg-slate-500/50 px-3 py-1.5 rounded-md transition-colors" disabled={isSubmitting}>{t('cancel')}</button><button onClick={() => handleUpdateSource(source.id)} className="text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50" disabled={isSubmitting}>{isSubmitting ? t('saving') : t('save')}</button></div></div>
                ) : (
                    <div className="flex justify-between items-center">
                        <div><p className="font-semibold text-white">{source.name}</p><p className="text-sm text-slate-400 -mt-1">{t(`incomeCategory_${source.category}`)}</p><div className="flex items-baseline gap-2 mt-1"><p className="text-green-400 font-bold">{displayCurrency.symbol}{(source.amount * conversionRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>{isConverting && <p className="text-xs text-slate-400">{t('fromAmount', { symbol: baseCurrency.symbol, amount: source.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}</p>}</div></div>
                        <div className="flex items-center">
                            {deletingSourceId === source.id ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> :
                            <><button onClick={() => handleQuickAddTransaction(source)} aria-label={t('addIncomeFrom', { name: source.name })} className="bg-green-500/20 hover:bg-green-500/40 text-green-300 font-bold p-2 rounded-full transition-all transform scale-100 group-hover:scale-110 disabled:opacity-50" disabled={isSubmitting}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-1"><button onClick={() => handleEditClick(source)} aria-label={t('editSource', { name: source.name })} className="text-slate-400 hover:text-sky-400 p-2 rounded-full hover:bg-sky-500/20 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button><button onClick={() => handleDeleteWithConfirmation(source.id, source.name)} aria-label={t('deleteSource', { name: source.name })} className="text-slate-400 hover:text-red-400 p-2 rounded-full hover:bg-red-500/20 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></>
                            }
                        </div>
                    </div>
                )}
                </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3">{t('recentIncomeTransactions')}</h3>
        {incomeTransactions.length === 0 ? (<div className="flex items-center justify-center h-24 glass-card bg-opacity-30"><p className="text-slate-400">{t('noIncomeRecorded')}</p></div>) : (
          <div className="space-y-4">
              {pendingTransactions.length > 0 && (
                  <div>
                      <h4 className="text-sm font-semibold text-yellow-300 mb-2">{t('pending')}</h4>
                      <ul className="space-y-3">{pendingTransactions.map(transaction => { const convertedAmount = transaction.amount * conversionRate; const isDeleting = deletingTransactionId === transaction.id; return (<li key={transaction.id} className={`group flex items-center justify-between bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r-lg transition-all duration-300 ${isDeleting ? 'opacity-40' : 'hover:bg-yellow-900/30'}`}><div className="flex items-center space-x-4"><div className="p-2 rounded-full bg-slate-700"><PendingIcon className="w-6 h-6 text-yellow-400" /></div><div><p className="font-medium text-white">{transaction.name}</p><p className="text-sm text-slate-400">{new Date(transaction.date).toLocaleDateString()}</p></div></div><div className="flex items-center space-x-2">{isDeleting ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <><div className="text-right"><p className="font-bold text-yellow-300">+ {displayCurrency.symbol}{convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>{isConverting && <p className="text-xs text-slate-400">{t('fromAmount', { symbol: baseCurrency.symbol, amount: transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}</p>}</div><button onClick={() => onUpdateTransactionStatus(transaction.id, 'completed')} aria-label={t('markAsPaid', { name: transaction.name })} className="text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 transform group-hover:scale-110"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button><button onClick={() => onDeleteTransaction(transaction.id)} aria-label={t('deleteTransactionFor', { name: transaction.name })} className="text-slate-400 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 transform group-hover:scale-110"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></>}</div></li>);})}</ul>
                  </div>
              )}
              {completedTransactions.length > 0 && (
                  <div>
                      <h4 className="text-sm font-semibold text-green-300 mb-2">{t('completed')}</h4>
                      <ul className="space-y-3">{completedTransactions.map(transaction => { const convertedAmount = transaction.amount * conversionRate; const isDeleting = deletingTransactionId === transaction.id; return (<li key={transaction.id} className={`group flex items-center justify-between bg-slate-800/50 p-4 rounded-lg transition-all duration-300 ${isDeleting ? 'opacity-40' : 'hover:bg-slate-700/50'}`}><div className="flex items-center space-x-4"><div className="p-2 rounded-full bg-slate-700"><CompletedIcon className="w-6 h-6 text-green-400" /></div><div><p className="font-medium text-white">{transaction.name}</p><p className="text-sm text-slate-400">{new Date(transaction.date).toLocaleDateString()}</p></div></div><div className="flex items-center space-x-2">{isDeleting ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <><div className="text-right"><p className="font-bold text-green-400">+ {displayCurrency.symbol}{convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>{isConverting && <p className="text-xs text-slate-400">{t('fromAmount', { symbol: baseCurrency.symbol, amount: transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}</p>}</div><button onClick={() => onDeleteTransaction(transaction.id)} aria-label={t('deleteTransactionFor', { name: transaction.name })} className="text-slate-400 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 transform group-hover:scale-110"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></>}</div></li>);})}</ul>
                  </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};