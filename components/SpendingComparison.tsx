import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import type { MonthlyData } from '../types';

interface SpendingComparisonProps {
  currentMonthData: MonthlyData;
  previousMonthData: MonthlyData;
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CustomTooltip = ({ active, payload, label, currentMonthName, previousMonthName, currencySymbol }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-700/80 backdrop-blur-sm p-3 border border-slate-600 rounded-lg shadow-lg">
          <p className="label text-white font-semibold mb-2">{`Day ${label}`}</p>
          {payload.map((pld: any) => (
             <p key={pld.dataKey} style={{ color: pld.color }} className="text-sm">
                {pld.dataKey === 'current' ? currentMonthName : previousMonthName}: {currencySymbol}{pld.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
};


export const SpendingComparison: React.FC<SpendingComparisonProps> = ({ currentMonthData, previousMonthData }) => {
  const comparisonData = useMemo(() => {
    if (!currentMonthData || !previousMonthData) {
      return [];
    }

    const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
    const daysInCurrentMonth = getDaysInMonth(currentMonthData.year, currentMonthData.month);
    const daysInPreviousMonth = getDaysInMonth(previousMonthData.year, previousMonthData.month);

    const processExpenses = (expenses: MonthlyData['expenses']) => {
        const dailyTotals = new Map<number, number>();
        for (const expense of expenses) {
            const day = new Date(expense.date).getDate();
            const currentTotal = dailyTotals.get(day) || 0;
            dailyTotals.set(day, currentTotal + expense.amount);
        }
        return dailyTotals;
    };
    
    const currentDailyTotals = processExpenses(currentMonthData.expenses);
    const previousDailyTotals = processExpenses(previousMonthData.expenses);

    const data = [];
    let cumulativeCurrent = 0;
    let cumulativePrevious = 0;
    const maxDays = Math.max(daysInCurrentMonth, daysInPreviousMonth);

    for (let day = 1; day <= maxDays; day++) {
        cumulativeCurrent += currentDailyTotals.get(day) || 0;
        cumulativePrevious += previousDailyTotals.get(day) || 0;
      
        data.push({
            day,
            current: day <= daysInCurrentMonth ? cumulativeCurrent : null,
            previous: day <= daysInPreviousMonth ? cumulativePrevious : null,
        });
    }

    return data;
  }, [currentMonthData, previousMonthData]);

  // For this comparison, we'll assume the display currency is that of the current month.
  const displayCurrency = currentMonthData.currency;
  const currentMonthName = months[currentMonthData.month - 1];
  const previousMonthName = months[previousMonthData.month - 1];
  
  const totalCurrentSpending = currentMonthData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalPreviousSpending = previousMonthData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const difference = totalCurrentSpending - totalPreviousSpending;
  const percentageChange = totalPreviousSpending > 0 ? (difference / totalPreviousSpending) * 100 : (totalCurrentSpending > 0 ? 100 : 0);


  return (
    <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-white">This Month vs. Last Month</h2>
                <p className="text-sm text-slate-400">Cumulative Spending Comparison</p>
            </div>
            <div className={`text-right text-lg font-bold ${difference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {difference >= 0 ? '+' : ''}{displayCurrency.symbol}{difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className={`text-sm ml-2 ${difference > 0 ? 'text-red-400/80' : 'text-green-400/80'}`}>({percentageChange.toFixed(1)}%)</span>
            </div>
        </div>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={comparisonData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#94a3b8" label={{ value: 'Day of Month', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tickFormatter={(value) => `${displayCurrency.symbol}${Number(value).toLocaleString(undefined, { notation: 'compact' })}`} />
            <Tooltip content={<CustomTooltip currentMonthName={currentMonthName} previousMonthName={previousMonthName} currencySymbol={displayCurrency.symbol} />} />
            <Legend verticalAlign="top" height={36}/>
            <Line type="monotone" dataKey="current" name={currentMonthName} stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="previous" name={previousMonthName} stroke="#818cf8" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};