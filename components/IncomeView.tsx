import React, { useState, useMemo, useEffect } from 'react';
import type { IncomeTransaction, Currency, IncomeCategoryId } from '../types';
import { INCOME_CATEGORIES } from '../constants';
import { useLanguage } from '../contexts/LanguageProvider';

interface IncomeViewProps {
  incomeTransactions: IncomeTransaction[];
  baseCurrency: Currency;
  displayCurrency: Currency;
  onAddIncome: (income: Omit<IncomeTransaction, 'id'>) => Promise<boolean>;
  onDeleteIncome: (id: string) => Promise<void>;
  onUpdateIncome: (income: IncomeTransaction) => Promise<boolean>;
  conversionRate: number;
  incomeGoal: number | undefined;
  isSubmitting: boolean;
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

const parseFloatLocale = (value: string) => {
    if (typeof value !== 'string') return NaN;
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
};

const IncomeForm: React.FC<{
    baseCurrency: Currency,
    onSave: (income: Omit<IncomeTransaction, 'id'> | IncomeTransaction) => void,
    onCancel: () => void,
    isSubmitting: boolean,
    existingIncome?: IncomeTransaction | null
}> = ({ baseCurrency, onSave, onCancel, isSubmitting, existingIncome }) => {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<IncomeCategoryId>(INCOME_CATEGORIES[0].id);
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [status, setStatus] = useState<'pending' | 'completed'>('completed');
    const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});

    useEffect(() => {
        if (existingIncome) {
            setName(existingIncome.name);
            setAmount(String(existingIncome.amount));
            setCategory(existingIncome.category);
            setDate(new Date(existingIncome.date).toISOString().slice(0, 10));
            setStatus(existingIncome.status);
        }
    }, [existingIncome]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const nameError = !name.trim() ? t('errorEnterSourceName') : undefined;
        const amountValue = parseFloatLocale(amount);
        const amountError = (isNaN(amountValue) || amountValue <= 0) ? t('errorInvalidAmount') : undefined;

        if (nameError || amountError) {
            setErrors({ name: nameError, amount: amountError });
            return;
        }

        const incomeData = {
            name: name.trim(),
            amount: amountValue,
            category,
            date: new Date(date).toISOString(),
            status,
        };

        if (existingIncome) {
            onSave({ ...incomeData, id: existingIncome.id });
        } else {
            onSave(incomeData);
        }
    };
    
    return (
        <div className="glass-card bg-opacity-30 p-4 space-y-4 animate-fade-in mt-4">
             <h3 className="text-lg font-bold text-white">{existingIncome ? 'Edit Income' : t('addNewIncomeSource')}</h3>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label htmlFor="income-name" className="block text-sm font-medium text-slate-300 mb-1">{t('sourceName')}</label><input id="income-name" type="text" value={name} onChange={(e) => { setName(e.target.value); if(errors.name) setErrors(p=>({...p, name: undefined}))}} placeholder={t('egLessonWithAlex')} className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`} />{errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}</div>
                    <div><label htmlFor="income-amount" className="block text-sm font-medium text-slate-300 mb-1">{t('amount')} ({baseCurrency.code})</label><div className={`flex items-center bg-slate-700/50 border rounded-lg focus-within:ring-2 transition-all ${errors.amount ? 'border-red-500 focus-within:ring-red-500' : 'border-slate-600 focus-within:ring-sky-500'}`}><span className="py-2 pl-3 pr-2 text-slate-400 border-r border-slate-600">{baseCurrency.symbol}</span><input id="income-amount" type="text" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); if(errors.amount) setErrors(p=>({...p, amount: undefined})) }} placeholder="0,00" className="flex-grow bg-transparent text-white py-2 px-2 outline-none" /></div>{errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount}</p>}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label htmlFor="income-category" className="block text-sm font-medium text-slate-300 mb-1">{t('category')}</label><select id="income-category" value={category} onChange={e => setCategory(e.target.value as IncomeCategoryId)} className="w-full p-2.5 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none border-slate-600 focus:ring-sky-500">{INCOME_CATEGORIES.map(cat => (<option key={cat.id} value={cat.id}>{t(`incomeCategory_${cat.id}`)}</option>))}</select></div>
                    <div><label htmlFor="income-date" className="block text-sm font-medium text-slate-300 mb-1">{t('transactionDate')}</label><input id="income-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none border-slate-600 focus:ring-sky-500" /></div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div><label className="block text-sm font-medium text-slate-300 mb-1">Status</label><div className="flex gap-2"><button type="button" onClick={() => setStatus('completed')} className={`flex-1 p-2 rounded-lg text-sm font-semibold transition-colors ${status === 'completed' ? 'bg-green-600 text-white' : 'bg-slate-700/50 hover:bg-slate-600/50'}`}>{t('completed')}</button><button type="button" onClick={() => setStatus('pending')} className={`flex-1 p-2 rounded-lg text-sm font-semibold transition-colors ${status === 'pending' ? 'bg-yellow-600 text-white' : 'bg-slate-700/50 hover:bg-slate-600/50'}`}>{t('pending')}</button></div></div>
                    <div className="flex justify-end gap-2 pt-5">
                        <button type="button" onClick={onCancel} className="bg-slate-600/50 hover:bg-slate-500/50 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm" disabled={isSubmitting}>{t('cancel')}</button>
                        <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm disabled:opacity-50" disabled={isSubmitting}>{isSubmitting ? t('saving') : t('save')}</button>
                    </div>
                </div>
            </form>
        </div>
    );
}

export const IncomeView: React.FC<IncomeViewProps> = (props) => {
  const {
    incomeTransactions, baseCurrency, displayCurrency, onAddIncome,
    onDeleteIncome, onUpdateIncome, conversionRate, incomeGoal, isSubmitting, deletingTransactionId
  } = props;

  const { t } = useLanguage();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeTransaction | null>(null);

  const { totalCompletedIncome, totalPendingIncome } = useMemo(() => {
    return incomeTransactions.reduce((acc, t) => {
      if (t.status === 'completed') acc.totalCompletedIncome += t.amount;
      else acc.totalPendingIncome += t.amount;
      return acc;
    }, { totalCompletedIncome: 0, totalPendingIncome: 0 });
  }, [incomeTransactions]);
  
  const totalIncomeInDisplayCurrency = totalCompletedIncome * conversionRate;
  const incomeGoalInDisplayCurrency = (incomeGoal || 0) * conversionRate;
  const incomePercentage = incomeGoalInDisplayCurrency > 0 ? (totalIncomeInDisplayCurrency / incomeGoalInDisplayCurrency) * 100 : 0;

  const handleSaveIncome = async (incomeData: Omit<IncomeTransaction, 'id'> | IncomeTransaction) => {
    let success = false;
    if ('id' in incomeData) {
        success = await onUpdateIncome(incomeData);
    } else {
        success = await onAddIncome(incomeData);
    }
    if (success) {
        setIsFormOpen(false);
        setEditingIncome(null);
    }
  };

  const handleToggleStatus = (income: IncomeTransaction) => {
    onUpdateIncome({
        ...income,
        status: income.status === 'completed' ? 'pending' : 'completed'
    });
  };

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
            ) : (<p className="text-xs text-slate-500">{t('noGoalSet')}</p>)}
        </div>
      </div>

      <div>
        {!isFormOpen && (
            <button onClick={() => { setIsFormOpen(true); setEditingIncome(null); }} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                {t('addNewIncomeSource')}
            </button>
        )}
        {isFormOpen && <IncomeForm baseCurrency={baseCurrency} onSave={handleSaveIncome} onCancel={() => setIsFormOpen(false)} isSubmitting={isSubmitting} existingIncome={editingIncome} />}
      </div>
      
      <div>
        <h3 className="text-lg font-bold text-white mb-3">{t('recentIncomeTransactions')}</h3>
        {incomeTransactions.length === 0 ? (<div className="flex items-center justify-center h-24 glass-card bg-opacity-30"><p className="text-slate-400">{t('noIncomeRecorded')}</p></div>) : (
          <ul className="space-y-3">
            {incomeTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(transaction => {
                const convertedAmount = transaction.amount * conversionRate;
                const isDeleting = deletingTransactionId === transaction.id;
                const isPending = transaction.status === 'pending';
                const Icon = isPending ? PendingIcon : CompletedIcon;
                const iconColor = isPending ? 'text-yellow-400' : 'text-green-400';
                const bgColor = isPending ? 'bg-yellow-900/20' : 'bg-slate-800/50';
                const borderColor = isPending ? 'border-yellow-500' : 'border-transparent';

                return (<li key={transaction.id} className={`group flex items-center justify-between p-4 rounded-lg transition-all duration-300 ${isDeleting ? 'opacity-40' : 'hover:bg-slate-700/50'} ${bgColor} border-l-4 ${borderColor}`}>
                    <div className="flex items-center space-x-4"><div className="p-2 rounded-full bg-slate-700"><Icon className={`w-6 h-6 ${iconColor}`} /></div><div><p className="font-medium text-white">{transaction.name}</p><p className="text-sm text-slate-400">{new Date(transaction.date).toLocaleDateString()}</p></div></div>
                    <div className="flex items-center space-x-2">
                        <div className="text-right"><p className={`font-bold ${iconColor}`}>+ {displayCurrency.symbol}{convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>{isConverting && <p className="text-xs text-slate-400">{t('fromAmount', { symbol: baseCurrency.symbol, amount: transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}</p>}</div>
                        {isDeleting ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> :
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleToggleStatus(transaction)} title={isPending ? t('markAsPaid', { name: transaction.name }) : 'Mark as Pending'} className="p-2 rounded-full transition-colors bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white"><Icon className={`h-5 w-5 ${iconColor}`} /></button>
                             <button onClick={() => { setEditingIncome(transaction); setIsFormOpen(true); }} className="p-2 rounded-full transition-colors bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                             <button onClick={() => onDeleteIncome(transaction.id)} className="p-2 rounded-full transition-colors bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                        </div>
                        }
                    </div>
                </li>);
            })}
          </ul>
        )}
      </div>
    </div>
  );
};