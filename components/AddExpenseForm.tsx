

import React, { useState } from 'react';
import type { Expense } from '../types';
import { CATEGORIES } from '../constants';

interface AddExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
}

export const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ onAddExpense }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit-card'>('cash');
  const [errors, setErrors] = useState<{ amount?: string; description?: string; category?: string }>({});

  const validateField = (name: 'amount' | 'description', value: string) => {
    switch (name) {
      case 'amount':
        const amountValue = parseFloat(value);
        if (isNaN(amountValue) || amountValue <= 0) {
          return 'Please enter a valid, positive amount.';
        }
        break;
      case 'description':
        if (!value.trim()) {
          return 'Description cannot be empty.';
        }
        break;
      default:
        break;
    }
    return undefined;
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'amount' || name === 'description') {
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountError = validateField('amount', amount);
    const descriptionError = validateField('description', description);
    const categoryError = !selectedCategory ? 'Please select a category.' : undefined;

    if (amountError || descriptionError || categoryError) {
      setErrors({
        amount: amountError,
        description: descriptionError,
        category: categoryError,
      });
      return;
    }

    onAddExpense({
      amount: parseFloat(amount),
      description,
      category: selectedCategory!,
      paymentMethod,
    });

    // Reset form state
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setPaymentMethod('cash');
    setErrors({});
  };

  return (
    <div className="glass-card p-6 h-full">
      <h2 className="text-xl font-bold text-white mb-4">Add New Expense</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-1">Amount</label>
          <input
            id="amount"
            name="amount"
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (errors.amount) setErrors(prev => ({...prev, amount: undefined}));
            }}
            onBlur={handleBlur}
            placeholder="0.00"
            className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none transition-colors ${errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500 focus:border-sky-500'}`}
            aria-invalid={!!errors.amount}
            aria-describedby="amount-error"
          />
          {errors.amount && <p id="amount-error" className="text-red-400 text-sm mt-1">{errors.amount}</p>}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Description</label>
          <input
            id="description"
            name="description"
            type="text"
            value={description}
            onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({...prev, description: undefined}));
            }}
            onBlur={handleBlur}
            placeholder="e.g., Coffee with friends"
            className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none transition-colors ${errors.description ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500 focus:border-sky-500'}`}
            aria-invalid={!!errors.description}
            aria-describedby="description-error"
          />
          {errors.description && <p id="description-error" className="text-red-400 text-sm mt-1">{errors.description}</p>}
        </div>
        <div>
          <p className="block text-sm font-medium text-slate-300 mb-2">Payment Method</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${paymentMethod === 'cash' ? 'bg-green-500/20 border-green-400' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-400" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span className="text-white">Cash</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('credit-card')}
              className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${paymentMethod === 'credit-card' ? 'bg-sky-500/20 border-sky-400' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-sky-400" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                <span className="text-white">Card</span>
            </button>
          </div>
        </div>
        <div>
          <p id="category-label" className="block text-sm font-medium text-slate-300 mb-2">Category</p>
          <div role="radiogroup" aria-labelledby="category-label" className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {CATEGORIES.map(category => (
              <button
                type="button"
                role="radio"
                key={category.id}
                onClick={() => {
                    setSelectedCategory(category.id);
                    if (errors.category) setErrors(prev => ({...prev, category: undefined}));
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 transform hover:scale-105 ${selectedCategory === category.id ? 'bg-sky-500/20 border-sky-400' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'} ${errors.category && !selectedCategory ? 'border-red-500' : ''}`}
                aria-checked={selectedCategory === category.id}
              >
                <category.icon className={`w-6 h-6 mb-1 ${category.color}`} />
                <span className="text-xs text-white text-center">{category.name}</span>
              </button>
            ))}
          </div>
          {errors.category && <p id="category-error" className="text-red-400 text-sm mt-2 text-center">{errors.category}</p>}
        </div>
        <button type="submit" className="w-full bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-violet-500/30 transform hover:scale-105 transition-all duration-300">
          Add Expense
        </button>
      </form>
    </div>
  );
};