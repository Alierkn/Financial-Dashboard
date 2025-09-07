import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import CategoryId to strongly type the selected category state.
import type { CategoryId } from '../types';
import { CATEGORIES } from '../constants';
import { useLanguage } from '../contexts/LanguageProvider';

interface AddExpenseFormProps {
  onAddExpense: (expenseData: {
    amount: number;
    description: string;
    category: CategoryId;
    paymentMethod: 'cash' | 'credit-card';
    isInstallment: boolean;
    installments: number;
  }) => Promise<boolean>;
  isSubmitting?: boolean;
}

// Initialize the AI client at the module level
const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;
if (!ai) {
  console.warn("Gemini AI client for AddExpenseForm could not be initialized. API key might be missing.");
}

export const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ onAddExpense, isSubmitting }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit-card'>('cash');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState('2');
  const [errors, setErrors] = useState<{ amount?: string; description?: string; category?: string; installments?: string; aiprocess?: string; }>({});
  const { t } = useLanguage();
  
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<CategoryId | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCategorySuggestion = useCallback(async (text: string) => {
    if (!ai || text.trim().length < 5) return;
    setIsSuggesting(true);
    setSuggestedCategory(null);
    try {
      const categoryList = CATEGORIES.map(c => c.id).join(', ');
      const prompt = `Based on the expense description "${text}", which of these categories is most appropriate? Categories: [${categoryList}]. Respond with only one category ID from the list.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const resultText = response.text.trim().toLowerCase();
      const matchedCategory = CATEGORIES.find(c => c.id === resultText);
      if (matchedCategory) {
        setSuggestedCategory(matchedCategory.id);
      }
    } catch (error) {
      console.error("Error getting category suggestion:", error);
    } finally {
      setIsSuggesting(false);
    }
  }, [t]);

  useEffect(() => {
    if (!description) {
      setSuggestedCategory(null);
      return;
    }
    const handler = setTimeout(() => {
      getCategorySuggestion(description);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [description, getCategorySuggestion]);

  const handleCategoryClick = (category: CategoryId) => {
    setSelectedCategory(category);
    setSuggestedCategory(null);
    if (errors.category) setErrors(prev => ({ ...prev, category: undefined }));
  };

  const validateField = (name: 'amount' | 'description' | 'installments', value: string) => {
    switch (name) {
      case 'amount':
        const amountValue = parseFloat(value);
        if (isNaN(amountValue) || amountValue <= 0) {
          return t('errorInvalidAmount');
        }
        break;
      case 'description':
        if (!value.trim()) {
          return t('errorEmptyDescription');
        }
        break;
      case 'installments':
        const installmentsValue = parseInt(value, 10);
        if (isNaN(installmentsValue) || installmentsValue < 2) {
          return t('errorInvalidInstallments');
        }
        break;
      default:
        break;
    }
    return undefined;
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'amount' || name === 'description' || name === 'installments') {
        const error = validateField(name as any, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, aiprocess: "Invalid file type. Please select an image."}));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) {
          processImageWithAI(base64String, file.type);
        }
      };
      reader.readAsDataURL(file);
    }
    if(event.target) {
        event.target.value = '';
    }
  };

  const processImageWithAI = async (base64ImageData: string, mimeType: string) => {
    if (!ai) {
        setErrors(prev => ({ ...prev, aiprocess: "AI client not initialized." }));
        return;
    }
    setIsProcessingImage(true);
    setErrors({});
    try {
        const categoryList = CATEGORIES.map(c => `"${c.id}"`).join(', ');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64ImageData } },
                    { text: `Analyze this receipt image. Extract the total amount, the merchant name or a brief description, and suggest the most appropriate category from this list: [${categoryList}]. Provide only the JSON output.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        amount: { type: Type.NUMBER, description: "The total amount from the receipt." },
                        description: { type: Type.STRING, description: "The merchant name or a brief summary of the items." },
                        category: { type: Type.STRING, description: `The most fitting category. Must be one of: ${categoryList}` }
                    },
                    required: ["amount", "description", "category"]
                }
            }
        });
        
        const jsonString = response.text;
        const result = JSON.parse(jsonString);

        if (result.amount) setAmount(String(result.amount));
        if (result.description) setDescription(result.description);
        if (result.category && CATEGORIES.some(c => c.id === result.category)) {
            setSelectedCategory(result.category as CategoryId);
        } else {
            setSelectedCategory('other');
        }

    } catch (error) {
        console.error("Error processing receipt with AI:", error);
        setErrors(prev => ({ ...prev, aiprocess: "Failed to read the receipt. Please enter manually." }));
    } finally {
        setIsProcessingImage(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amountError = validateField('amount', amount);
    const descriptionError = validateField('description', description);
    const categoryError = !selectedCategory ? t('errorSelectCategory') : undefined;
    const installmentsError = isInstallment ? validateField('installments', installments) : undefined;

    if (amountError || descriptionError || categoryError || installmentsError) {
      setErrors({
        amount: amountError,
        description: descriptionError,
        category: categoryError,
        installments: installmentsError,
      });
      return;
    }

    const success = await onAddExpense({
      amount: parseFloat(amount),
      description,
      category: selectedCategory!,
      paymentMethod,
      isInstallment,
      installments: isInstallment ? parseInt(installments, 10) : 1,
    });

    if (success) {
      // Reset form state on successful submission
      setAmount('');
      setDescription('');
      setSelectedCategory(null);
      setPaymentMethod('cash');
      setIsInstallment(false);
      setInstallments('2');
      setErrors({});
    }
  };

  return (
    <div className="glass-card p-6 h-full">
       <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">{t('addNewExpense')}</h2>
        <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
            disabled={isProcessingImage}
            aria-label={t('uploadReceipt')}
        >
            {isProcessingImage ? (
                <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /><path fillRule="evenodd" d="M10 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" /></svg>
            )}
            <span>{isProcessingImage ? t('processing') : t('scanReceipt')}</span>
        </button>
      </div>
      <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          capture="environment"
          className="hidden"
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.aiprocess && <p className="text-yellow-400 text-sm text-center bg-yellow-900/30 p-2 rounded-md">{errors.aiprocess}</p>}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-1">{t('amount')}</label>
          <input
            id="amount"
            name="amount"
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (errors.amount) setErrors(prev => ({...prev, amount: undefined}));
            }}
            onBlur={handleBlur}
            placeholder="0.00"
            className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none transition-colors ${errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500 focus:border-sky-500'}`}
            aria-invalid={!!errors.amount}
            aria-describedby="amount-error"
          />
          {errors.amount && <p id="amount-error" className="text-red-400 text-sm mt-1">{errors.amount}</p>}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">{t('description')}</label>
          <input
            id="description"
            name="description"
            type="text"
            value={description}
            onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({...prev, description: undefined}));
            }}
            onBlur={handleBlur}
            placeholder={t('egCoffeeWithFriends')}
            className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none transition-colors ${errors.description ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500 focus:border-sky-500'}`}
            aria-invalid={!!errors.description}
            aria-describedby="description-error"
          />
          {errors.description && <p id="description-error" className="text-red-400 text-sm mt-1">{errors.description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="block text-sm font-medium text-slate-300 mb-2">{t('paymentMethod')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${paymentMethod === 'cash' ? 'bg-green-500/20 border-green-400' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <span className="text-white">{t('cash')}</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('credit-card')}
                className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${paymentMethod === 'credit-card' ? 'bg-sky-500/20 border-sky-400' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  <span className="text-white">{t('card')}</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col justify-between">
            <label htmlFor="isInstallment" className="flex items-center cursor-pointer text-sm font-medium text-slate-300">
              <input
                id="isInstallment"
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-500 rounded focus:ring-sky-500"
              />
              <span className="ml-2">{t('payInInstallments')}</span>
            </label>
            {isInstallment && (
               <div className="mt-2 animate-fade-in">
                 <label htmlFor="installments" className="sr-only">{t('numberOfInstallments')}</label>
                 <input
                   id="installments"
                   name="installments"
                   type="number"
                   value={installments}
                   onChange={(e) => {
                    setInstallments(e.target.value);
                    if(errors.installments) setErrors(prev => ({ ...prev, installments: undefined }));
                   }}
                   onBlur={handleBlur}
                   min="2"
                   className={`w-full p-2 text-sm bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none transition-colors ${errors.installments ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`}
                   aria-invalid={!!errors.installments}
                   aria-describedby="installments-error"
                 />
               </div>
            )}
          </div>
        </div>
        {errors.installments && <p id="installments-error" className="text-red-400 text-sm">{errors.installments}</p>}

        <div>
          <p className="block text-sm font-medium text-slate-300 mb-2">{t('category')}</p>
          <div className="flex flex-wrap gap-2 relative">
            {isSuggesting && (
                <div className="absolute -top-1 -left-1 w-[calc(100%+0.5rem)] h-[calc(100%+0.5rem)] bg-slate-800/50 rounded-lg flex items-center justify-center z-10">
                   <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            {CATEGORIES.map(category => {
              const isSelected = selectedCategory === category.id;
              const isSuggested = suggestedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryClick(category.id)}
                  className={`flex items-center gap-2 py-2 px-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
                    isSelected
                      ? `bg-opacity-20 border-current ${category.color}`
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500 text-slate-300'
                  } ${isSuggested ? 'animate-suggestion !border-sky-400' : ''}`}
                  style={isSelected ? { color: category.hexColor, backgroundColor: `${category.hexColor}20` } : {}}
                >
                  <category.icon className="w-5 h-5" />
                  <span>{t(`category_${category.id}`)}</span>
                </button>
              );
            })}
          </div>
          {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-violet-500/30 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t('adding') : t('addExpense')}
        </button>
      </form>
    </div>
  );
};