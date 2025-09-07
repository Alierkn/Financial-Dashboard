import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CategoryId } from '../types';
import { CATEGORIES } from '../constants';
import { useLanguage } from '../contexts/LanguageProvider';
import { useGeminiAI } from '../hooks/useGeminiAI';
import { useToast } from '../contexts/ToastProvider';

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

const CameraModal: React.FC<{ onCapture: (dataUrl: string) => void; onClose: () => void; t: (key: string) => string }> = ({ onCapture, onClose, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        addToast("Kamera erişimi reddedildi veya bulunamadı.", 'error');
        onClose();
      }
    };
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [onClose, addToast]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      onCapture(canvas.toDataURL('image/jpeg'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in" style={{ animationDuration: '0.2s' }}>
      <div className="bg-slate-800 p-4 rounded-lg w-full max-w-lg">
        <video ref={videoRef} autoPlay playsInline className="w-full rounded-md mb-4" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex justify-between">
          <button onClick={onClose} className="bg-slate-600/50 hover:bg-slate-500/50 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">{t('cancel')}</button>
          <button onClick={handleCapture} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">Capture</button>
        </div>
      </div>
    </div>
  );
};


export const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ onAddExpense, isSubmitting }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit-card'>('credit-card');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState('2');
  const [errors, setErrors] = useState<{ amount?: string; description?: string; category?: string; installments?: string }>({});
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<CategoryId | null>(null);
  const suggestionTimeoutRef = useRef<number | null>(null);

  const { t } = useLanguage();
  const { scanReceipt, suggestCategory, isLoading: isAIProcessing } = useGeminiAI();

  const validate = () => {
    const newErrors: typeof errors = {};
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) newErrors.amount = t('errorInvalidAmount');
    if (!description.trim()) newErrors.description = t('errorEmptyDescription');
    if (!selectedCategory) newErrors.category = t('errorSelectCategory');
    if (isInstallment) {
      const numericInstallments = parseInt(installments, 10);
      if (isNaN(numericInstallments) || numericInstallments < 2) newErrors.installments = t('errorInvalidInstallments');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setPaymentMethod('credit-card');
    setIsInstallment(false);
    setInstallments('2');
    setErrors({});
    setSuggestedCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const success = await onAddExpense({
      amount: parseFloat(amount),
      description: description.trim(),
      category: selectedCategory!,
      paymentMethod,
      isInstallment,
      installments: parseInt(installments, 10),
    });
    if (success) {
      resetForm();
    }
  };

  const handleCaptureReceipt = async (dataUrl: string) => {
    setIsCameraOpen(false);
    const base64Image = dataUrl.split(',')[1];
    if (!base64Image) return;

    const result = await scanReceipt(base64Image, 'image/jpeg');
    if (result) {
      setAmount(String(result.amount || ''));
      setDescription(result.description || '');
      if (result.category && CATEGORIES.some(c => c.id === result.category)) {
        setSelectedCategory(result.category);
      }
    }
  };

  const handleSuggestCategory = useCallback(async () => {
    if (!description.trim() || isAIProcessing) return;
    const result = await suggestCategory(description.trim());
    if (result) {
        const categoryId = result.trim().replace(/["'`]/g, "") as CategoryId;
        if (CATEGORIES.some(c => c.id === categoryId)) {
            setSuggestedCategory(categoryId);
        } else {
            setSuggestedCategory(null);
        }
    }
  }, [description, isAIProcessing, suggestCategory]);

  useEffect(() => {
    if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
    setSuggestedCategory(null);
    if (description.trim().length > 3 && !selectedCategory) {
      suggestionTimeoutRef.current = window.setTimeout(() => {
        handleSuggestCategory();
      }, 700);
    }
    return () => {
      if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
    };
  }, [description, selectedCategory, handleSuggestCategory]);


  return (
    <div className="glass-card p-6">
       {isCameraOpen && <CameraModal onClose={() => setIsCameraOpen(false)} onCapture={handleCaptureReceipt} t={t} />}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">{t('addNewExpense')}</h2>
        <button
          onClick={() => setIsCameraOpen(true)}
          disabled={isAIProcessing}
          className="flex items-center gap-2 text-sm bg-sky-600/50 hover:bg-sky-500/50 text-sky-200 font-semibold py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50"
          aria-label={t('scanReceipt')}
        >
          {isAIProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          <span>{t('scanReceipt')}</span>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-1">{t('amount')}</label><input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none ${errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`} />{errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount}</p>}</div>
        <div><label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">{t('description')}</label><input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('egCoffeeWithFriends')} className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none ${errors.description ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`} />{errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}</div>
        <div><label className="block text-sm font-medium text-slate-300 mb-2">{t('category')}</label><div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{CATEGORIES.map((cat) => (<button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)} className={`flex flex-col items-center justify-center text-center p-2 rounded-lg transition-all duration-200 border-2 ${selectedCategory === cat.id ? 'bg-slate-600/80 border-sky-500' : 'bg-slate-700/50 border-transparent hover:border-slate-500'} ${suggestedCategory === cat.id ? 'animate-suggestion' : ''}`}><cat.icon className={`w-6 h-6 mb-1 ${cat.color}`} /><span className="text-xs text-slate-300">{t(`category_${cat.id}`)}</span></button>))}</div>{errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div><label className="block text-sm font-medium text-slate-300 mb-2">{t('paymentMethod')}</label><div className="flex gap-2"><button type="button" onClick={() => setPaymentMethod('credit-card')} className={`flex-1 p-2 rounded-lg text-sm font-semibold transition-colors ${paymentMethod === 'credit-card' ? 'bg-sky-600 text-white' : 'bg-slate-700/50 hover:bg-slate-600/50'}`}>{t('card')}</button><button type="button" onClick={() => setPaymentMethod('cash')} className={`flex-1 p-2 rounded-lg text-sm font-semibold transition-colors ${paymentMethod === 'cash' ? 'bg-green-600 text-white' : 'bg-slate-700/50 hover:bg-slate-600/50'}`}>{t('cash')}</button></div></div>
            <div className="flex items-center justify-start sm:justify-end gap-3 pt-6"><label htmlFor="installments-check" className="text-sm text-slate-300 select-none cursor-pointer">{t('payInInstallments')}</label><input id="installments-check" type="checkbox" checked={isInstallment} onChange={(e) => setIsInstallment(e.target.checked)} className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-sky-500 focus:ring-sky-500" /></div>
        </div>
        {isInstallment && (<div className="animate-fade-in"><label htmlFor="installments" className="block text-sm font-medium text-slate-300 mb-1">{t('numberOfInstallments')}</label><input id="installments" type="number" min="2" step="1" value={installments} onChange={(e) => setInstallments(e.target.value)} className={`w-full p-2 bg-slate-700/50 text-white border rounded-lg focus:ring-2 outline-none ${errors.installments ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-sky-500'}`} />{errors.installments && <p className="text-red-400 text-sm mt-1">{errors.installments}</p>}</div>)}
        <button type="submit" disabled={isSubmitting || isAIProcessing} className="w-full bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-violet-500/30 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? t('adding') : t('addExpense')}</button>
      </form>
    </div>
  );
};
