import React, { useState, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { MonthlyData } from '../types';
import { SpendingComparison } from './SpendingComparison';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../contexts/LanguageProvider';

interface DashboardProps {
  user: User;
  monthlyData: MonthlyData[];
  onStartNewMonth: () => void;
  onViewMonth: (monthId: string) => void;
  onViewAnnual: (year: number) => void;
  onDeleteMonth: (monthId: string) => void;
  onSignOut: () => void;
  deletingMonthId: string | null;
}

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`h-6 w-6 text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} 
        fill="none" 
        viewBox="0 0 24" 
        stroke="currentColor"
    >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

export const Dashboard: React.FC<DashboardProps> = ({ user, monthlyData, onStartNewMonth, onViewMonth, onViewAnnual, onDeleteMonth, onSignOut, deletingMonthId }) => {
  const { t, months } = useLanguage();
  
  const groupedData = useMemo(() => monthlyData.reduce((acc, data) => {
    const year = data.year;
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(data);
    return acc;
  }, {} as Record<number, MonthlyData[]>), [monthlyData]);

  const years = useMemo(() => Object.keys(groupedData).map(Number).sort((a, b) => b - a), [groupedData]);

  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(() => {
    if (years.length === 0) return {};
    const initialState: Record<number, boolean> = {};
    initialState[years[0]] = true; // Expand the most recent year by default
    years.slice(1).forEach(year => {
        initialState[year] = false;
    });
    return initialState;
  });

  const toggleYear = (year: number) => {
    setExpandedYears(prev => ({
        ...prev,
        [year]: !prev[year]
    }));
  };
  
  const currentMonth = monthlyData.length > 0 ? monthlyData[0] : null;
  const previousMonth = monthlyData.length > 1 ? monthlyData[1] : null;

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 animate-fade-in">
        <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-500">
              {t('financialDashboard')}
            </h1>
            <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-slate-400 truncate max-w-xs" title={user.email || 'User'}>
                    {t('welcomeMessage', { email: user.email || '' })}
                </p>
                <button onClick={onSignOut} className="text-xs text-slate-400 hover:text-white transition-colors">({t('signOut')})</button>
            </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <ThemeToggle />
          <button 
            onClick={onStartNewMonth} 
            className="bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 text-white font-bold py-3 px-5 rounded-lg shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-violet-500/30 transform hover:scale-105 transition-all duration-300"
          >
            + {t('startNewMonthlyBudget')}
          </button>
        </div>
      </header>
      
      {currentMonth && previousMonth && (
        <div className="mb-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
            <SpendingComparison currentMonthData={currentMonth} previousMonthData={previousMonth} />
        </div>
      )}

      <main className="space-y-4">
        {monthlyData.length === 0 ? (
          <div className="text-center glass-card p-12 animate-fade-in">
            <h2 className="text-2xl font-bold mb-2">{t('welcomeToHub')}</h2>
            <p className="text-slate-300 mb-6" dangerouslySetInnerHTML={{ __html: t('noBudgetsYet') }}></p>
          </div>
        ) : (
          years.map((year, index) => (
            <div key={year} className="glass-card p-4 sm:p-6 animate-fade-in group" style={{ animationDelay: `${(index + 1) * 100}ms`}}>
              <div className="flex justify-between items-center cursor-pointer rounded-lg p-2 -m-2 transition-colors group-hover:bg-slate-800/40" onClick={() => toggleYear(year)}>
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">{year}</h2>
                    <ChevronIcon expanded={!!expandedYears[year]} />
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewAnnual(year);
                  }} 
                  className="text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors z-10"
                >
                  {t('viewYearSummary', { year })}
                </button>
              </div>
              
              <div className={`transition-[max-height,opacity,margin] duration-500 ease-in-out overflow-hidden ${expandedYears[year] ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {groupedData[year].sort((a,b) => b.month - a.month).map((data, idx) => {
                      const isDeleting = deletingMonthId === data.id;
                      return (
                      <div
                        key={data.id}
                        className={`relative group glass-card !p-0 overflow-hidden transition-all duration-300 animate-fade-in ${isDeleting ? 'opacity-40' : 'hover:border-slate-600'}`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div
                          onClick={() => !isDeleting && onViewMonth(data.id)}
                          role="button"
                          tabIndex={0}
                          aria-label={t('viewDetailsFor', { month: months[data.month - 1] })}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isDeleting && onViewMonth(data.id)}
                          className={`w-full h-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500 rounded-2xl ${isDeleting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <p className="text-lg font-bold">{months[data.month - 1]}</p>
                          <p className="text-sm text-slate-300">
                            {t('budget')}: {data.currency.symbol}{data.limit.toLocaleString()}
                          </p>
                        </div>
                        {isDeleting ? (
                            <div className="absolute top-3 right-3 z-50 p-2">
                                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMonth(data.id);
                          }}
                          aria-label={t('deleteBudgetFor', { month: months[data.month - 1] })}
                          className="absolute top-3 right-3 z-50 text-slate-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        )}
                      </div>
                    )})}
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};