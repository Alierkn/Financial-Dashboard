import React from 'react';

export interface Currency {
  symbol: string;
  code: string;
}

export interface Category {
  id: string;
  name: string;
  icon: React.FC<{ className?: string }>;
  color: string;
}

export interface IncomeCategory {
  id: string;
  name: string;
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