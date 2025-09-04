import React from 'react';
import type { Currency } from '../types';
import { CURRENCIES } from '../constants';

interface CurrencyConverterProps {
  selectedCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  isLoading: boolean;
  error: string | null;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ selectedCurrency, onCurrencyChange, isLoading, error }) => {
  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="display-currency" className="text-sm text-slate-400">View in:</label>
      <select
        id="display-currency"
        value={selectedCurrency.code}
        disabled={isLoading || !!error}
        onChange={(e) => {
          const currency = CURRENCIES.find(c => c.code === e.target.value);
          if (currency) onCurrencyChange(currency);
        }}
        className="bg-slate-700 text-white text-sm border-2 border-slate-600 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition py-1 px-2 disabled:opacity-50"
        aria-label="Display currency selector"
      >
        {isLoading ? (
            <option>Loading...</option>
        ) : error ? (
            <option>Error</option>
        ) : (
            CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                    {c.code}
                </option>
            ))
        )}
      </select>
    </div>
  );
};
