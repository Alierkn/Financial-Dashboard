import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import type { User } from 'firebase/auth';
import type { MonthlyData, Currency } from '../types';
import { CATEGORIES, INCOME_CATEGORIES } from '../constants';
import { ThemeToggle } from './ThemeToggle';

interface AnnualViewProps {
  user: User;
  year: number;
  annualData: MonthlyData[];
  onBackToDashboard: () => void;
  onSignOut: () => void;
  displayCurrency: Currency;
  conversionRate: number;
  allAvailableYears: number[];
  onYearChange: (year: number) => void;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MonthlyFinancialOverviewTooltip = ({ active, payload, label, currencySymbol }: any) => {
    if (active && payload && payload.length) {
      const income = payload.find(p => p.dataKey === 'income')?.value || 0;
      const expenses = payload.find(p => p.dataKey === 'expenses')?.value || 0;
      const budget = payload.find(p => p.dataKey === 'budget')?.value || 0;
      const net = income - expenses;
      const budgetDiff = budget - expenses;

      return (
        <div className="bg-slate-700/80 backdrop-blur-sm p-3 border border-slate-600 rounded-lg shadow-lg">
          <p className="label text-white font-semibold mb-2">{label}</p>
          <p className="text-sm text-green-400">Income: {currencySymbol}{income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-sm text-red-400">Expenses: {currencySymbol}{expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-sm text-slate-300">Budget: {currencySymbol}{budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <hr className="border-slate-600 my-1" />
          <p className={`text-sm font-bold ${net >= 0 ? 'text-sky-300' : 'text-orange-400'}`}>Net: {currencySymbol}{net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className={`text-sm font-bold ${budgetDiff >= 0 ? 'text-green-400' : 'text-yellow-400'}`}>
            {budgetDiff >= 0 ? 'Under Budget' : 'Over Budget'} by: {currencySymbol}{Math.abs(budgetDiff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
};


const CumulativeTrendTooltip = ({ active, payload, label, currencySymbol }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-700/80 backdrop-blur-sm p-2 border border-slate-600 rounded-md shadow-lg">
          <p className="text-sm text-slate-300">{label}</p>
          <p className="text-base text-white font-bold">{`Cumulative: ${currencySymbol}${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
        </div>
      );
    }
    return null;
};

// Helper function for consistent currency formatting
const formatCurrency = (value: number, currency: Currency) => {
  return `${currency.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const AnnualView: React.FC<AnnualViewProps> = ({ user, year, annualData, onBackToDashboard, onSignOut, displayCurrency, conversionRate, allAvailableYears, onYearChange }) => {
  const { totalIncome, totalExpenses, monthlyOverviewData } = useMemo(() => {
    let aggIncome = 0;
    let aggExpenses = 0;
    
    const overviewData: { name: string; income: number; expenses: number; budget: number; }[] = [];

    months.forEach((monthName, index) => {
        const month = index + 1;
        const monthData = annualData.find(d => d.month === month);

        const monthExpenses = monthData?.expenses.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        const monthTransactionalIncome = monthData?.incomeTransactions
            .filter(t => t.status === 'completed')
            .reduce((sum, trans) => sum + trans.amount, 0) || 0;
        const monthBaseIncome = monthData?.baseIncome || 0;
        const monthTotalIncome = monthBaseIncome + monthTransactionalIncome;
        const monthLimit = monthData?.limit || 0;

        aggExpenses += monthExpenses;
        aggIncome += monthTotalIncome;

        overviewData.push({
            name: monthName,
            income: monthTotalIncome * conversionRate,
            expenses: monthExpenses * conversionRate,
            budget: monthLimit * conversionRate
        });
    });

    return { totalIncome: aggIncome, totalExpenses: aggExpenses, monthlyOverviewData: overviewData };
  }, [annualData, conversionRate]);
  
  const cumulativeIncomeTrendData = useMemo(() => {
    const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    const getDayOfYear = (d: Date) => {
        const start = new Date(d.getFullYear(), 0, 0);
        return Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    };

    const daysInYear = isLeapYear(year) ? 366 : 365;
    const dailyIncome = new Map<number, number>();

    for (const monthData of annualData) {
        // Assume base income is received on the 1st of the month
        const firstDayOfMonth = new Date(year, monthData.month - 1, 1);
        const dayOfYear = getDayOfYear(firstDayOfMonth);
        const currentTotal = dailyIncome.get(dayOfYear) || 0;
        dailyIncome.set(dayOfYear, currentTotal + monthData.baseIncome);

        // Process completed transactional income
        for (const transaction of monthData.incomeTransactions) {
            if (transaction.status !== 'completed') continue;

            const transactionDate = new Date(transaction.date);
            if (transactionDate.getFullYear() === year) {
                const dayOfYear = getDayOfYear(transactionDate);
                const currentTotal = dailyIncome.get(dayOfYear) || 0;
                dailyIncome.set(dayOfYear, currentTotal + transaction.amount);
            }
        }
    }

    const chartData: { dayLabel: string; cumulative: number }[] = [];
    let cumulativeAmount = 0;
    
    for (let i = 1; i <= daysInYear; i++) {
        cumulativeAmount += dailyIncome.get(i) || 0;
        
        const currentDate = new Date(year, 0, i);
        chartData.push({
            dayLabel: `${months[currentDate.getMonth()]} ${currentDate.getDate()}`,
            cumulative: cumulativeAmount * conversionRate,
        });
    }
    return chartData;
  }, [year, annualData, conversionRate]);

  const { yearlyCategoryData, yearlyGrandTotal } = useMemo(() => {
    const spendingByCategory: { [key: string]: number } = {};
    
    for (const monthData of annualData) {
      for (const expense of monthData.expenses) {
        if (!spendingByCategory[expense.category]) {
          spendingByCategory[expense.category] = 0;
        }
        spendingByCategory[expense.category] += expense.amount * conversionRate;
      }
    }
    
    const grandTotal = Object.values(spendingByCategory).reduce((sum, total) => sum + total, 0);

    const categoryData = CATEGORIES.map(category => ({
      id: category.id,
      name: category.name,
      total: spendingByCategory[category.id] || 0,
      color: category.hexColor,
      percentage: grandTotal > 0 ? (spendingByCategory[category.id] || 0) / grandTotal : 0,
    })).filter(data => data.total > 0)
       .sort((a,b) => b.total - a.total);

    return { yearlyCategoryData: categoryData, yearlyGrandTotal: grandTotal };
  }, [annualData, conversionRate]);
  
  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-700/80 backdrop-blur-sm p-3 border border-slate-600 rounded-lg shadow-lg">
          <p className="label text-white font-semibold">{data.name}</p>
          <p className="intro text-slate-200">
            {formatCurrency(data.total, displayCurrency)}
          </p>
          <p className="text-xs text-slate-400">{(data.percentage * 100).toFixed(2)}% of total</p>
        </div>
      );
    }
    return null;
  };

  const netBalance = totalIncome - totalExpenses;

  const handleExport = () => {
    const allTransactions: any[] = [];

    for (const monthData of annualData) {
        const expenseData = monthData.expenses.map(exp => ({
            date: new Date(exp.date).toISOString().slice(0, 10),
            type: 'Expense',
            description: exp.description,
            category: CATEGORIES.find(c => c.id === exp.category)?.name || 'Other',
            amount: -exp.amount,
            currency: monthData.currency.code
        }));

        const incomeData = monthData.incomeTransactions.map(inc => ({
            date: new Date(inc.date).toISOString().slice(0, 10),
            type: `Income (${inc.status})`,
            description: inc.name,
            category: INCOME_CATEGORIES.find(c => c.id === inc.category)?.name || 'Other',
            amount: inc.amount,
            currency: monthData.currency.code
        }));

        allTransactions.push(...expenseData, ...incomeData);
    }
    
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Currency'];

    const escapeCsvCell = (cell: string | number) => {
        const strCell = String(cell);
        if (strCell.includes(',')) {
            return `"${strCell.replace(/"/g, '""')}"`;
        }
        return strCell;
    };

    const csvRows = allTransactions.map(row => 
        [
            row.date,
            row.type,
            escapeCsvCell(row.description),
            row.category,
            row.amount.toFixed(2),
            row.currency
        ].join(',')
    );

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Report-${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentYearIndex = allAvailableYears.indexOf(year);
  const canGoToNext = currentYearIndex > 0;
  const canGoToPrev = currentYearIndex < allAvailableYears.length - 1;

  const handleNextYear = () => {
      if (canGoToNext) onYearChange(allAvailableYears[currentYearIndex - 1]);
  };

  const handlePrevYear = () => {
      if (canGoToPrev) onYearChange(allAvailableYears[currentYearIndex + 1]);
  };


  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
            <button onClick={onBackToDashboard} className="flex items-center gap-2 text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                <span>Dashboard</span>
            </button>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">
                {year} Annual Summary
            </h1>
        </div>
        
        <div className="flex items-center space-x-4">
            <div className="flex items-center gap-3">
                <p className="hidden md:block text-sm text-slate-400 truncate max-w-[200px]" title={user.email || 'User'}>
                    {user.email}
                </p>
                <button onClick={onSignOut} className="text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors">Sign Out</button>
            </div>
            <div className="flex items-center space-x-2">
                <label htmlFor="year-selector" className="text-sm text-slate-400">View Year:</label>
                 <button 
                    onClick={handlePrevYear} 
                    disabled={!canGoToPrev} 
                    className="p-2 rounded-md bg-slate-700/80 hover:bg-slate-600/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous year"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <select
                    id="year-selector"
                    value={year}
                    onChange={(e) => onYearChange(Number(e.target.value))}
                    className="bg-slate-700 text-white text-sm border-2 border-slate-600 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition py-1 px-2"
                    aria-label="Select year to view annual summary"
                >
                    {allAvailableYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
                <button 
                    onClick={handleNextYear} 
                    disabled={!canGoToNext}
                    className="p-2 rounded-md bg-slate-700/80 hover:bg-slate-600/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next year"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
            <button onClick={handleExport} className="text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export
            </button>
            <ThemeToggle />
        </div>
      </header>
      <main className="space-y-6">
        <div className="glass-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-slate-400 text-sm">Total Income</p>
              <p className="text-3xl font-bold text-green-400">
                {formatCurrency(totalIncome * conversionRate, displayCurrency)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Expenses</p>
              <p className="text-3xl font-bold text-red-400">
                {formatCurrency(totalExpenses * conversionRate, displayCurrency)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Net Balance</p>
              <p className={`text-3xl font-bold ${(netBalance * conversionRate) >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
                {formatCurrency(netBalance * conversionRate, displayCurrency)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4">Monthly Financial Overview</h2>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyOverviewData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis 
                        stroke="#94a3b8" 
                        tickFormatter={(value) => 
                            `${displayCurrency.symbol}${Number(value).toLocaleString(undefined, {
                              notation: 'compact',
                              maximumFractionDigits: 1,
                            })}`
                        }
                    />
                    <Tooltip 
                        cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }}
                        content={<MonthlyFinancialOverviewTooltip currencySymbol={displayCurrency.symbol} />}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }}/>
                    <Bar dataKey="income" name="Income" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="budget" name="Budget" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4">Cumulative Income Trend</h2>
            <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulativeIncomeTrendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorAnnualIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                            dataKey="dayLabel" 
                            stroke="#94a3b8" 
                            tick={{ fill: 'var(--text-primary)', fontSize: 12 }} 
                            tickFormatter={(tick) => tick.endsWith(' 1') ? tick.split(' ')[0] : ''}
                            interval="preserveStartEnd"
                        />
                        <YAxis 
                            stroke="#94a3b8" 
                            tick={{ fill: 'var(--text-primary)' }} 
                            tickFormatter={(value) => `${displayCurrency.symbol}${Number(value).toLocaleString(undefined, { notation: 'compact' })}`}
                        />
                        <Tooltip 
                            cursor={{ stroke: '#4ade80', strokeWidth: 1, strokeDasharray: '3 3' }}
                            content={<CumulativeTrendTooltip currencySymbol={displayCurrency.symbol} />}
                        />
                        <Area type="monotone" dataKey="cumulative" stroke="#4ade80" strokeWidth={2} fillOpacity={1} fill="url(#colorAnnualIncome)" dot={false}/>
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4">Yearly Expense Breakdown</h2>
          {yearlyCategoryData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="w-full h-72">
                 <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={yearlyCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      innerRadius="50%"
                      outerRadius="80%"
                      paddingAngle={3}
                      dataKey="total"
                    >
                      {yearlyCategoryData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} className="focus:outline-none stroke-slate-800" />
                      ))}
                    </Pie>
                    <Tooltip content={<CategoryTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <ul className="space-y-3">
                    {yearlyCategoryData.map(item => (
                        <li key={item.name}>
                            <div className="flex justify-between items-center text-sm mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                                    <span className="text-slate-300">{item.name}</span>
                                </div>
                                <span className="font-medium">
                                    {formatCurrency(item.total, displayCurrency)}
                                </span>
                            </div>
                            <div className="w-full bg-slate-700/50 rounded-full h-2">
                                <div 
                                className="h-2 rounded-full" 
                                style={{ width: `${(item.percentage * 100).toFixed(2)}%`, backgroundColor: item.color }}
                                ></div>
                            </div>
                        </li>
                    ))}
                </ul>
                <hr className="border-slate-700 my-4"/>
                <div className="flex justify-between items-center text-base font-bold">
                    <span className="text-slate-200">Grand Total</span>
                    <span>
                        {formatCurrency(yearlyGrandTotal, displayCurrency)}
                    </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-slate-400">No expense data for this year.</p>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-6">Year In Review</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline p-4 bg-slate-800/50 rounded-lg">
                <span className="text-lg text-slate-300">Total Income</span>
                <span className="font-bold text-2xl text-green-400">
                  {formatCurrency(totalIncome * conversionRate, displayCurrency)}
                </span>
              </div>
              <div className="flex justify-between items-baseline p-4 bg-slate-800/50 rounded-lg">
                <span className="text-lg text-slate-300">Total Expenses</span>
                <span className="font-bold text-2xl text-red-400">
                  {formatCurrency(totalExpenses * conversionRate, displayCurrency)}
                </span>
              </div>
              <div className="flex justify-between items-baseline p-4 bg-slate-800/50 rounded-lg mt-4 border-t-2 border-sky-400 pt-4">
                <span className="text-lg font-semibold text-slate-100">Net Balance</span>
                <span className={`font-bold text-2xl ${(netBalance * conversionRate) >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
                  {formatCurrency(netBalance * conversionRate, displayCurrency)}
                </span>
              </div>
            </div>
        </div>
      </main>
    </div>
  );
};