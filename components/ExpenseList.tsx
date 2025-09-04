import React from 'react';
import type { Expense, Currency } from '../types';
import { CATEGORIES } from '../constants';

interface ExpenseListProps {
  expenses: Expense[];
  currency: Currency;
  onDeleteExpense: (id: string) => void;
  conversionRate: number;
}

const CashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const CardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, currency, onDeleteExpense, conversionRate }) => {
  const getCategory = (id: string) => {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-bold text-white mb-4 shrink-0">Recent Expenses</h2>
      {expenses.length === 0 ? (
        <div className="flex items-center justify-center flex-grow glass-card bg-opacity-30">
          <p className="text-slate-400">No expenses added yet.</p>
        </div>
      ) : (
        <ul className="space-y-3 overflow-y-auto pr-2 flex-grow">
          {expenses.map(expense => {
            const category = getCategory(expense.category);
            const convertedAmount = expense.amount * conversionRate;
            return (
              <li key={expense.id} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 group">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full bg-slate-700`}>
                    <category.icon className={`w-6 h-6 ${category.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{expense.description}</p>
                    <div className="flex items-center space-x-2">
                        <p className="text-sm text-slate-400">{category.name}</p>
                        <div title={`Paid by ${expense.paymentMethod === 'cash' ? 'Cash' : 'Credit Card'}`}>
                            {(expense.paymentMethod ?? 'cash') === 'cash' ? <CashIcon /> : <CardIcon />}
                        </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <p className="font-bold text-white text-lg">
                    {currency.symbol}{convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <button 
                    onClick={() => onDeleteExpense(expense.id)} 
                    aria-label={`Delete expense for ${expense.description}`}
                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 p-1 rounded-full hover:bg-red-500/20 transform hover:scale-125"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};