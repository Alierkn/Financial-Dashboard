import React, { useState } from 'react';
import type { RecurringTransaction, CategoryId, IncomeCategoryId, RecurringTransactionType, Currency } from '../types';
import { CATEGORIES, INCOME_CATEGORIES } from '../constants';
import { useLanguage } from '../contexts/LanguageProvider';

interface RecurringViewProps {
  recurringTransactions: RecurringTransaction[];
  onAddTransaction: (transaction: Omit<RecurringTransaction, 'id' | 'nextExecutionDate'>) => Promise<boolean>;
  onDeleteTransaction: (id: string) => Promise<void>;
  isSubmitting: boolean;
  deletingRecurringId: string | null;
  baseCurrency: Currency;
}

export const RecurringView: React.FC<RecurringViewProps> = ({ recurringTransactions, onAddTransaction, onDeleteTransaction, isSubmitting, deletingRecurringId, baseCurrency }) => {
  const { t } = useLanguage();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<RecurringTransactionType>('expense');
  const [category, setCategory] = useState<CategoryId | IncomeCategoryId>(CATEGORIES[0].id);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<{ description?: string; amount?: string; startDate?: string }>({});

  const handleTypeChange = (newType: RecurringTransactionType) => {
    setType(newType);
    setCategory(newType === 'expense' ? CATEGORIES[0].id : INCOME_CATEGORIES[0].id);
  };
  
  const validate = () => {
    const newErrors: { description?: string; amount?: string; startDate?: string } = {};
    if (!description.trim()) newErrors.description = t('errorEmptyDescription');
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) newErrors.amount = t('errorInvalidAmount');
    if (!startDate) newErrors.startDate = t('errorInvalidDate');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    const success = await onAddTransaction({
      description,
      amount: parseFloat(amount),
      type,
      category,
      frequency: 'monthly',
      startDate,
    });
    
    if (success) {
      setDescription('');
      setAmount('');
      setErrors({});
    }
  };
  
  const { recurringExpenses, recurringIncomes } = React.useMemo(() => ({
      recurringExpenses: recurringTransactions.filter(rt => rt.type === 'expense'),
      recurringIncomes: recurringTransactions.filter(rt => rt.type === 'income'),
  }), [recurringTransactions]);
  
  const categoryOptions = type === 'expense' ? CATEGORIES : INCOME_CATEGORIES;
  const categoryTranslationKey = type === 'expense' ? 'category' : 'incomeCategory';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-3">{t('addRecurring')}</h3>
        <form onSubmit={handleSubmit} className="glass-card bg-opacity-30 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="recurring-desc" className="block text-sm font-medium text-slate-300 mb-1">{t('description')}</label>
                    <input id="recurring-desc" type="text" value={description} onChange={e => setDescription(e.target.value)} className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none ${errors.description ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`} />
                    {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
                </div>
                <div>
                    <label htmlFor="recurring-amount" className="block text-sm font-medium text-slate-300 mb-1">{t('amount')} ({baseCurrency.symbol})</label>
                    <input id="recurring-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none ${errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`} />
                    {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount}</p>}
                </div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('transactionType')}</label>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => handleTypeChange('expense')} className={`flex-1 p-2 rounded-lg text-sm transition-colors ${type === 'expense' ? 'bg-sky-600 text-white font-semibold' : 'bg-slate-700/50 hover:bg-slate-600/50'}`}>{t('expenses')}</button>
                        <button type="button" onClick={() => handleTypeChange('income')} className={`flex-1 p-2 rounded-lg text-sm transition-colors ${type === 'income' ? 'bg-green-600 text-white font-semibold' : 'bg-slate-700/50 hover:bg-slate-600/50'}`}>{t('income')}</button>
                    </div>
                </div>
                 <div>
                    <label htmlFor="recurring-category" className="block text-sm font-medium text-slate-300 mb-1">{t('category')}</label>
                    <select id="recurring-category" value={category} onChange={e => setCategory(e.target.value as any)} className="w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none border-slate-600 focus:ring-sky-500">
                        {categoryOptions.map(cat => <option key={cat.id} value={cat.id}>{t(`${categoryTranslationKey}_${cat.id}`)}</option>)}
                    </select>
                </div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                    <label htmlFor="recurring-start" className="block text-sm font-medium text-slate-300 mb-1">{t('startDate')}</label>
                    <input id="recurring-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none ${errors.startDate ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`} />
                    {errors.startDate && <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>}
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">{isSubmitting ? t('adding') : t('add')}</button>
            </div>
        </form>
      </div>

      <div className="space-y-4">
        <div>
            <h3 className="text-lg font-bold text-white mb-2">{t('recurringExpenses')}</h3>
            {recurringExpenses.length > 0 ? (
                <ul className="space-y-2">{recurringExpenses.map(item => <RecurringItem key={item.id} item={item} currency={baseCurrency} onDelete={onDeleteTransaction} isDeleting={deletingRecurringId === item.id} />)}</ul>
            ) : <p className="text-slate-400 text-sm">{t('noRecurringTransactions')}</p>}
        </div>
         <div>
            <h3 className="text-lg font-bold text-white mb-2">{t('recurringIncomes')}</h3>
            {recurringIncomes.length > 0 ? (
                <ul className="space-y-2">{recurringIncomes.map(item => <RecurringItem key={item.id} item={item} currency={baseCurrency} onDelete={onDeleteTransaction} isDeleting={deletingRecurringId === item.id} />)}</ul>
            ) : <p className="text-slate-400 text-sm">{t('noRecurringTransactions')}</p>}
        </div>
      </div>
    </div>
  );
};

const RecurringItem: React.FC<{ item: RecurringTransaction, currency: Currency, onDelete: (id: string) => void, isDeleting: boolean }> = ({ item, currency, onDelete, isDeleting }) => {
    const { t } = useLanguage();
    const categoryKey = item.type === 'expense' ? `category_${item.category}` : `incomeCategory_${item.category}`;
    const nextDate = new Date(item.nextExecutionDate).toLocaleDateString();

    return (
        <li className={`group flex justify-between items-center p-3 rounded-lg transition-all duration-300 ${isDeleting ? 'opacity-40' : 'bg-slate-800/50 hover:bg-slate-700/50'}`}>
            <div>
                <p className="font-semibold text-white">{item.description}</p>
                <p className="text-xs text-slate-400">{t(categoryKey)} &bull; {t('nextOn', { date: nextDate })}</p>
            </div>
            <div className="flex items-center gap-3">
                <p className={`font-bold ${item.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                    {item.type === 'income' ? '+' : '-'}{currency.symbol}{item.amount.toLocaleString()}
                </p>
                 {isDeleting ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : 
                 <button onClick={() => onDelete(item.id)} className="text-slate-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={t('delete')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
                 }
            </div>
        </li>
    );
};