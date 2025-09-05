import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import type { Expense, Currency } from '../types';
import { useLanguage } from '../contexts/LanguageProvider';

interface ExpenseTrendViewProps {
  expenses: Expense[];
  currency: Currency;
  conversionRate: number;
  month: number;
  year: number;
}

const CustomTooltip = ({ active, payload, label, currencySymbol, t }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-700/80 backdrop-blur-sm p-2 border border-slate-600 rounded-md shadow-lg">
          <p className="text-sm text-slate-300">{t('day')} {label}</p>
          <p className="text-base text-white font-bold">{`${t('cumulative')}: ${currencySymbol}${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
        </div>
      );
    }
    return null;
};

export const ExpenseTrendView: React.FC<ExpenseTrendViewProps> = ({ expenses, currency, conversionRate, month, year }) => {
  const { t } = useLanguage();
  
  const trendData = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return [];
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyTotals = new Map<number, number>();

    for (const expense of expenses) {
      const day = new Date(expense.date).getDate();
      const currentTotal = dailyTotals.get(day) || 0;
      dailyTotals.set(day, currentTotal + expense.amount);
    }

    const chartData: { day: string; cumulative: number }[] = [];
    let cumulativeAmount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      cumulativeAmount += dailyTotals.get(day) || 0;
      chartData.push({
        day: String(day),
        cumulative: cumulativeAmount * conversionRate,
      });
    }

    return chartData;
  }, [expenses, conversionRate, month, year]);

  return (
    <div className="h-full">
      <h2 className="text-xl font-bold text-white mb-4">{t('cumulativeSpendingTrend')}</h2>
      {trendData.length > 0 ? (
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1' }} tickFormatter={(value) => `${currency.symbol}${Number(value).toLocaleString(undefined, { notation: 'compact' })}`} />
              <Tooltip 
                cursor={{ stroke: '#818cf8', strokeWidth: 2, strokeDasharray: '3 3' }}
                content={<CustomTooltip currencySymbol={currency.symbol} t={t} />}
              />
              <Area type="monotone" dataKey="cumulative" stroke="#a78bfa" strokeWidth={2} fillOpacity={1} fill="url(#colorCumulative)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 glass-card bg-opacity-30">
          <p className="text-slate-400">{t('noExpenseDataForTrend')}</p>
        </div>
      )}
    </div>
  );
};