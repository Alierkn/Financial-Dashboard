import { useState, useEffect } from 'react';

interface ExchangeRates {
  [key: string]: number;
}

export function useExchangeRates(baseCurrency: string) {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baseCurrency) return;

    const fetchRates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
        if (!response.ok) {
          throw new Error('Failed to fetch exchange rates.');
        }
        const data = await response.json();
        // The API response for the base currency might not include itself, so we add it.
        setRates({ ...data.rates, [baseCurrency]: 1 });
      } catch (e) {
        if (e instanceof Error) {
            setError(e.message);
        } else {
            setError('An unknown error occurred.');
        }
        setRates(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, [baseCurrency]);

  return { rates, isLoading, error };
}
