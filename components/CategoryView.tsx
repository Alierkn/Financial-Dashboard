import React, { useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Expense, Currency } from '../types';
import { CATEGORIES } from '../constants';
import { useLanguage } from '../contexts/LanguageProvider';

interface CategoryViewProps {
  expenses: Expense[];
  currency: Currency;
  conversionRate: number;
}

const CustomTooltip = ({ active, payload, label, currencySymbol, grandTotal, t }: any) => {
    if (active && payload && payload.length) {
      const name = label || payload[0].name;
      const value = payload[0].value;
      const percentage = grandTotal > 0 ? (value / grandTotal) * 100 : 0;
      return (
        <div className="bg-slate-700/80 backdrop-blur-sm p-3 border border-slate-600 rounded-lg shadow-lg">
          <p className="label text-white font-semibold">{name}</p>
          <p className="intro text-slate-200">
            {`${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs text-slate-400">{t('percentageOfTotal', { percentage: percentage.toFixed(2) })}</p>
        </div>
      );
    }
    return null;
  };

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null; // Don't render for small slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const CategoryView: React.FC<CategoryViewProps> = ({ expenses, currency, conversionRate }) => {
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const { t } = useLanguage();

  const categoryData = useMemo(() => {
    const spendingByCategory: { [key: string]: number } = {};
    for (const expense of expenses) {
      // FIX: To prevent pending installments from affecting the category view,
      // only include paid expenses. This ensures consistency with summary data.
      if (expense.status !== 'paid') continue;
      
      if (!spendingByCategory[expense.category]) {
        spendingByCategory[expense.category] = 0;
      }
      spendingByCategory[expense.category] += expense.amount * conversionRate;
    }

    return CATEGORIES.map(category => ({
      name: t(`category_${category.id}`),
      total: spendingByCategory[category.id] || 0,
      color: category.hexColor,
    })).filter(data => data.total > 0)
       .sort((a,b) => b.total - a.total);
  }, [expenses, conversionRate, t]);

  const grandTotal = useMemo(() => {
    return categoryData.reduce((sum, item) => sum + item.total, 0);
  }, [categoryData]);
  
  const toggleCategoryVisibility = (categoryName: string) => {
    setHiddenCategories(prev => {
        const newSet = new Set(prev);
        if (newSet.has(categoryName)) {
            newSet.delete(categoryName);
        } else {
            newSet.add(categoryName);
        }
        return newSet;
    });
  };

  const handleChartClick = (data: any) => {
    const categoryName = data.name || data.payload?.name;
    if (categoryName) {
      toggleCategoryVisibility(categoryName);
    }
  };

  const visibleCategoryData = categoryData.filter(item => !hiddenCategories.has(item.name));
  const paidExpensesExist = expenses.some(e => e.status === 'paid');

  return (
    <div className="h-full">
      <h2 className="text-xl font-bold text-white mb-4">{t('spendingByCategory')}</h2>
       {paidExpensesExist && visibleCategoryData.length > 0 ? (
        <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-center">
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={visibleCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      innerRadius="60%"
                      outerRadius="80%"
                      paddingAngle={5}
                      dataKey="total"
                      onClick={handleChartClick}
                      cursor="pointer"
                    >
                      {visibleCategoryData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} className="focus:outline-none stroke-slate-800" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip currencySymbol={currency.symbol} grandTotal={grandTotal} t={t} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visibleCategoryData} margin={{ top: 5, right: 0, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: '10px' }} interval={0} angle={-35} textAnchor="end" height={50} />
                        <YAxis stroke="#94a3b8" tickFormatter={(value) => `${currency.symbol}${Number(value).toLocaleString(undefined, { notation: 'compact' })}`}/>
                        <Tooltip 
                            cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }} 
                            content={<CustomTooltip currencySymbol={currency.symbol} grandTotal={grandTotal} t={t} />}
                        />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]} onClick={handleChartClick}>
                            {visibleCategoryData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.color} cursor="pointer" />
                            ))}
                        </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              </div>
            </div>
            
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-300 mb-2">{t('categoryTotals')}</h3>
                <ul className="space-y-2 text-sm">
                    {categoryData.map(item => (
                        <li 
                          key={item.name} 
                          className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-all ${hiddenCategories.has(item.name) ? 'opacity-40 hover:opacity-70' : 'hover:bg-slate-700/50'}`}
                          onClick={() => toggleCategoryVisibility(item.name)}
                          >
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                                <span>{item.name}</span>
                            </div>
                            <span className="font-medium text-white">
                                {currency.symbol}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </li>
                    ))}
                </ul>
                <hr className="border-slate-700 my-3"/>
                <div className="flex justify-between items-center text-base font-bold">
                    <span className="text-slate-200">{t('grandTotal')}</span>
                    <span className="text-white">
                        {currency.symbol}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-48 glass-card bg-opacity-30">
          <p className="text-slate-400">{t('noDataToDisplay')}</p>
        </div>
      )}
    </div>
  );
};