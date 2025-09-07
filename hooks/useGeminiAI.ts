import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { useToast } from '../contexts/ToastProvider';
import { useLanguage } from '../contexts/LanguageProvider';
import type { CategoryId } from '../types';
import { CATEGORIES } from '../constants';

// Hold the singleton instance. It will be initialized on first use.
let aiClient: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client instance.
 * This prevents race conditions where the API key might not be available
 * at module load time. It ensures the client is created only when first needed.
 */
const getAIClient = (): GoogleGenAI | null => {
  // If the client is already initialized, return it.
  if (aiClient) {
    return aiClient;
  }

  // If the API key is available in the environment, create the new client.
  if (process.env.API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return aiClient;
  } else {
    // If the API key is missing, log an error. This is a critical failure.
    console.error("Gemini AI client could not be initialized: API key is missing from window.process.env.");
    return null;
  }
};


type GeminiAIState<T> = {
  data: T | null;
  isLoading: boolean;
};

type UseGeminiAIResult<T> = GeminiAIState<T> & {
  scanReceipt: (base64Image: string, mimeType: string) => Promise<{ amount: number; description: string; category: CategoryId; } | null>;
  suggestCategory: (description: string) => Promise<string | null>;
  generateAnalysis: (prompt: string) => Promise<void>;
  generateAdvice: (prompt: string) => Promise<void>;
};

export function useGeminiAI<T = any>(): UseGeminiAIResult<T> {
  const [state, setState] = useState<GeminiAIState<T>>({
    data: null,
    isLoading: false,
  });
  const { addToast } = useToast();
  const { t } = useLanguage();

  const handleAIData = (data: any) => {
    setState({ data, isLoading: false });
    return data;
  };

  const handleAIError = (error: any, defaultMessageKey: string): null => {
    console.error("Gemini AI Error:", error);
    const errorMessage = error.message || 'Unknown error';
    let toastMessage = t(defaultMessageKey);

    if (errorMessage.includes('429')) { // Resource exhausted or rate limit
        toastMessage = t('errorAiResourceExhausted');
    } else if (errorMessage.toLowerCase().includes('api key not valid')) {
        toastMessage = t('errorAiInvalidKey');
    } else if (errorMessage.toLowerCase().includes('rate limit')) {
        toastMessage = t('errorAiRateLimit');
    } else if (errorMessage.toLowerCase().includes('bad request')) {
        toastMessage = t('errorAiBadRequest');
    }

    addToast(toastMessage, 'error');
    setState({ data: null, isLoading: false });
    return null;
  };
  
  const callAI = useCallback(async <R>(prompt: string | { parts: any[] }, config: any, successCallback: (response: any) => R, errorMessageKey: string): Promise<R | null> => {
    const client = getAIClient();
    if (!client) {
      addToast(t('errorAiInvalidKey'), 'error');
      return null;
    }
    
    setState(prevState => ({ ...prevState, isLoading: true }));
    
    try {
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt as any,
        ...config,
      });
      return successCallback(response);
    } catch (error) {
      return handleAIError(error, errorMessageKey);
    }
  }, [t]);

  const scanReceipt = useCallback(async (base64Image: string, mimeType: string) => {
    const prompt = {
      parts: [
        { text: t('scanReceiptPrompt') },
        { inlineData: { mimeType, data: base64Image } },
      ],
    };
    
    const config = {
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            description: { type: Type.STRING },
            category: { type: Type.STRING, enum: CATEGORIES.map(c => c.id) },
          },
          required: ["amount", "description", "category"]
        },
      }
    };
    
    return callAI(prompt, config, (response) => {
        try {
            const jsonString = response.text.trim();
            const parsed = JSON.parse(jsonString);
            return handleAIData(parsed);
        } catch (e) {
            return handleAIError(e, 'errorAiAnalysis');
        }
    }, 'errorAiAnalysis');
  }, [callAI, t]);

  const suggestCategory = useCallback((description: string) => {
      const prompt = t('suggestCategoryPrompt', { description, categories: CATEGORIES.map(c => c.id).join(', ') });
      return callAI(prompt, {}, (response) => handleAIData(response.text.trim()), 'errorAiAnalysis');
  }, [callAI, t]);

  const generateAnalysis = useCallback(async (prompt: string) => {
      await callAI(prompt, {}, (response) => handleAIData(response.text), 'errorAiAnalysis');
  }, [callAI]);
  
  const generateAdvice = useCallback(async (prompt: string) => {
      await callAI(prompt, {}, (response) => handleAIData(response.text), 'errorAiAdvice');
  }, [callAI]);

  return { ...state, scanReceipt, suggestCategory, generateAnalysis, generateAdvice };
}