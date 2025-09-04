import React from 'react';
import type { Currency, Expense } from '../types';

interface SummaryProps {
  limit: number;
  expenses: Expense[];
  currency: Currency;
  baseIncome: number;
  transactionalIncome: number;
  pendingIncome: number;
  conversionRate: number;
}

// Helper function for consistent currency formatting
const formatCurrency = (value: number, currency: Currency) => {
  return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const Summary: React.FC<SummaryProps> = ({ limit, expenses, currency, baseIncome, transactionalIncome, pendingIncome, conversionRate }) => {
  const spent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const cashSpent = expenses
    .filter(e => e.paymentMethod === 'cash')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const cardSpent = expenses
    .filter(e => e.paymentMethod === 'credit-card')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const totalIncome = baseIncome + transactionalIncome;

  const displayLimit = limit * conversionRate;
  const displaySpent = spent * conversionRate;
  const displayTotalIncome = totalIncome * conversionRate;
  const displayBaseIncome = baseIncome * conversionRate;
  const displayTransactionalIncome = transactionalIncome * conversionRate;
  const displayPendingIncome = pendingIncome * conversionRate;
  const displayCashSpent = cashSpent * conversionRate;
  const displayCardSpent = cardSpent * conversionRate;

  const remainingBudget = displayLimit - displaySpent;
  const netBalance = displayTotalIncome - displaySpent;
  const percentageSpent = limit > 0 ? (spent / limit) * 100 : 0;
  
  const baseIncomePercentage = totalIncome > 0 ? (baseIncome / totalIncome) * 100 : 0;
  const cashPercentage = spent > 0 ? (cashSpent / spent) * 100 : 0;

  const getProgressBarGradient = () => {
    if (percentageSpent > 100) return 'from-red-500 to-pink-500';
    if (percentageSpent > 85) return 'from-yellow-400 to-orange-400';
    return 'from-green-400 to-teal-400';
  };

  const getWarningMessage = () => {
    if (percentageSpent > 100) return "You've exceeded your budget!";
    if (percentageSpent > 85) return "Careful, you're approaching your budget limit!";
    return null;
  };
  
  const progressBarGradient = getProgressBarGradient();
  const warningMessage = getWarningMessage();

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Monthly Summary</h2>
        {warningMessage && (
            <div className={`px-3 py-1 text-sm font-semibold rounded-full ${percentageSpent > 100 ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                {warningMessage}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center my-6">
        <div>
          <p className="text-slate-400 text-sm">Income (Completed)</p>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(displayTotalIncome, currency)}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Net Balance</p>
          <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(netBalance, currency)}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Remaining Budget</p>
          <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">
            {formatCurrency(remainingBudget, currency)}
          </p>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Budget Utilization */}
        <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Budget Utilization</h3>
            <div className="w-full bg-slate-700/50 rounded-full h-4">
                <div 
                className={`h-4 rounded-full transition-all duration-500 bg-gradient-to-r ${progressBarGradient}`} 
                style={{ width: `${Math.min(percentageSpent, 100)}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-sm text-slate-400 mt-2">
                <p>Spent: <span className="font-semibold text-white">{formatCurrency(displaySpent, currency)}</span></p>
                <p>Budget: <span className="font-semibold text-white">{formatCurrency(displayLimit, currency)}</span></p>
            </div>
        </div>

        {/* Income Breakdown */}
        <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Income Breakdown</h3>
            <div className="w-full bg-slate-700/50 rounded-full h-4 flex overflow-hidden">
                {totalIncome > 0 ? (
                <>
                    <div
                    className="bg-sky-500 h-full transition-all duration-500"
                    style={{ width: `${baseIncomePercentage}%` }}
                    title={`Base Income: ${formatCurrency(displayBaseIncome, currency)}`}
                    ></div>
                    <div
                    className="bg-teal-400 h-full transition-all duration-500"
                    style={{ width: `${100 - baseIncomePercentage}%` }}
                    title={`Additional Income: ${formatCurrency(displayTransactionalIncome, currency)}`}
                    ></div>
                </>
                ) : (
                    <div className="h-full w-full bg-slate-700/50"></div>
                )}
            </div>
            <div className="flex justify-between text-sm text-slate-400 mt-2">
                <p><span className="inline-block w-3 h-3 rounded-full bg-sky-500 mr-2 align-middle"></span>Base: <span className="font-semibold text-white">{formatCurrency(displayBaseIncome, currency)}</span></p>
                <p>Additional: <span className="font-semibold text-white">{formatCurrency(displayTransactionalIncome, currency)}</span><span className="inline-block w-3 h-3 rounded-full bg-teal-400 ml-2 align-middle"></span></p>
            </div>
             {pendingIncome > 0 && (
                <div className="flex justify-between text-sm text-slate-400 mt-2 p-2 bg-yellow-500/10 border-l-4 border-yellow-400 rounded">
                    <p><span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-2 align-middle"></span>Pending Income:</p>
                    <span className="font-semibold text-yellow-300">{formatCurrency(displayPendingIncome, currency)}</span>
                </div>
            )}
        </div>
        
        {/* Payment Breakdown */}
        {spent > 0 && (
            <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Spending by Payment Method</h3>
                <div className="w-full bg-slate-700/50 rounded-full h-4 flex overflow-hidden">
                    <div
                        className="bg-green-500 h-full transition-all duration-500"
                        style={{ width: `${cashPercentage}%` }}
                        title={`Cash: ${formatCurrency(displayCashSpent, currency)}`}
                    ></div>
                    <div
                        className="bg-sky-500 h-full transition-all duration-500"
                        style={{ width: `${100 - cashPercentage}%` }}
                        title={`Card: ${formatCurrency(displayCardSpent, currency)}`}
                    ></div>
                </div>
                <div className="flex justify-between text-sm text-slate-400 mt-2">
                    <p><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2 align-middle"></span>Cash: <span className="font-semibold text-white">{formatCurrency(displayCashSpent, currency)}</span></p>
                    <p>Card: <span className="font-semibold text-white">{formatCurrency(displayCardSpent, currency)}</span><span className="inline-block w-3 h-3 rounded-full bg-sky-500 ml-2 align-middle"></span></p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};