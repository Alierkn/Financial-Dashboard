import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { IncomeTransaction, Currency } from '../types';

interface IncomeTrendViewProps {
  baseIncome: number;
  incomeTransactions: IncomeTransaction[];
  currency: Currency;
  conversionRate: number;
  month: number;
  year: number;
}

const CustomTooltip = ({ active, payload, label, currencySymbol }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-700/80 backdrop-blur-sm p-2 border border-slate-600 rounded-md shadow-lg">
          <p className="text-sm text-slate-300">{`Day ${label}`}</p>
          <p className="text-base text-white font-bold">{`Cumulative: ${currencySymbol}${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
        </div>
      );
    }
    return null;
};

export const IncomeTrendView: React.FC<IncomeTrendViewProps> = ({ baseIncome, incomeTransactions, currency, conversionRate, month, year }) => {
  const trendData = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyTransactionalTotals = new Map<number, number>();

    // Aggregate *completed* transactional income by day
    for (const transaction of incomeTransactions) {
      if (transaction.status !== 'completed') continue;
      const day = new Date(transaction.date).getDate();
      const currentTotal = dailyTransactionalTotals.get(day) || 0;
      dailyTransactionalTotals.set(day, currentTotal + transaction.amount);
    }

    const chartData: { day: string; cumulative: number }[] = [];
    let cumulativeAmount = baseIncome; // Start with base income

    for (let day = 1; day <= daysInMonth; day++) {
      // Add any transactional income for the current day
      cumulativeAmount += dailyTransactionalTotals.get(day) || 0;
      
      chartData.push({
        day: String(day),
        cumulative: cumulativeAmount * conversionRate,
      });
    }

    return chartData;
  }, [baseIncome, incomeTransactions, conversionRate, month, year]);
  
  const hasIncome = baseIncome > 0 || incomeTransactions.some(t => t.status === 'completed');

  return (
    <div className="h-full">
      <h2 className="text-xl font-bold text-white mb-4">Cumulative Income Trend</h2>
      {hasIncome ? (
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                    </linearGradient>
                </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} tickFormatter={(value) => `${currency.symbol}${Number(value).toLocaleString(undefined, { notation: 'compact' })}`} />
              <Tooltip 
                cursor={{ stroke: '#4ade80', strokeWidth: 2, strokeDasharray: '3 3' }}
                content={<CustomTooltip currencySymbol={currency.symbol} />}
              />
              <Area type="monotone" dataKey="cumulative" stroke="#4ade80" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 glass-card bg-opacity-30">
          <p className="text-slate-400">No completed income data to display trend.</p>
        </div>
      )}
    </div>
  );
};