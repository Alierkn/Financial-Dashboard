import React from 'react';

export interface Currency {
  symbol: string;
  code: string;
}

// FIX: Define a specific type for category IDs to improve type safety and fix translation key errors.
export type CategoryId = 'food' | 'transport' | 'shopping' | 'bills' | 'entertainment' | 'health' | 'other';

export interface Category {
  id: CategoryId;
  icon: React.FC<{ className?: string }>;
  color: string;
  hexColor: string;
}

// FIX: Define a specific type for income category IDs to improve type safety and fix translation key errors.
// FIX: Changed hyphens to underscores to match translation keys.
export type IncomeCategoryId = 'private_lesson' | 'italy_consultancy' | 'refunds' | 'other';

export interface IncomeCategory {
  id: IncomeCategoryId;
}

export interface Expense {
  id:string;
  amount: number;
  description: string;
  category: Category['id'];
  date: string;
  paymentMethod: 'cash' | 'credit-card';
}

export interface IncomeSource {
  id:string;
  name: string;
  amount: number;
  category: IncomeCategory['id'];
}

export interface IncomeTransaction {
  id: string;
  name: string; 
  amount: number;
  date: string;
  category: IncomeCategory['id'];
  status: 'pending' | 'completed';
}

export interface MonthlyData {
  id: string; // Format: "YYYY-MM"
  year: number;
  month: number; // 1-12
  limit: number;
  baseIncome: number;
  currency: Currency;
  expenses: Expense[];
  incomeTransactions: IncomeTransaction[];
  incomeGoal?: number;
  categoryBudgets?: { [key: string]: number };
}