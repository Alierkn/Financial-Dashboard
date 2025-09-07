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
  error: string | null;
};

export function useGeminiAI<T>() {
  const [state, setState] = useState<GeminiAIState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });
  const { addToast } = useToast();
  const { t } = useLanguage();

  const processRequest = useCallback(async (
    requestExecutor: (client: GoogleGenAI) => Promise<any>,
    errorMessageKey: string
  ) => {
    const client = getAIClient();
    if (!client) {
      const errorText = "AI client not initialized.";
      console.error(errorText);
      addToast(errorText, 'error');
      setState({ data: null, isLoading: false, error: errorText });
      return null;
    }

    setState({ data: null, isLoading: true, error: null });
    try {
      const response = await requestExecutor(client);
      const responseText = response.text;
      setState({ data: responseText as T, isLoading: false, error: null });
      return responseText;
    } catch (error: any) {
      console.error(`Gemini AI Request Failed (using fallback key '${errorMessageKey}'):`, error);

      let userFriendlyErrorKey = errorMessageKey;
      const errorMessage = error.message?.toLowerCase() || '';

      if (errorMessage.includes('rate limit')) {
        userFriendlyErrorKey = 'errorAiRateLimit';
      } else if (errorMessage.includes('api key not valid')) {
        userFriendlyErrorKey = 'errorAiInvalidKey';
      } else if (errorMessage.includes('resource exhausted')) {
        userFriendlyErrorKey = 'errorAiResourceExhausted';
      } else if (errorMessage.includes('invalid argument') || errorMessage.includes('bad request')) {
          userFriendlyErrorKey = 'errorAiBadRequest';
      }
      
      const userFriendlyError = t(userFriendlyErrorKey);
      setState({ data: null, isLoading: false, error: userFriendlyError });
      addToast(userFriendlyError, 'error');
      return null;
    }
  }, [addToast, t]);

  const generateAnalysis = useCallback((prompt: string) => {
    return processRequest(
      (client) => client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      }),
      'errorAiAnalysis'
    );
  }, [processRequest]);

  const scanReceipt = useCallback(async (base64ImageData: string, mimeType: string) => {
    const categoryList = CATEGORIES.map(c => `"${c.id}"`).join(', ');
    const prompt = `Analyze this receipt image. Extract the total amount, the merchant name or a brief description, and suggest the most appropriate category from this list: [${categoryList}].`;
    
    const jsonString = await processRequest(
      (client) => client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [
          { inlineData: { mimeType, data: base64ImageData } },
          { text: prompt }
        ]},
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "The total amount from the receipt. Should be a number." },
              description: { type: Type.STRING, description: "The merchant name or a brief summary of the items. Should be a string." },
              category: { type: Type.STRING, description: `The most fitting category. Must be one of: ${categoryList}` }
            },
            required: ["amount", "description", "category"]
          },
          systemInstruction: "You are an expert receipt scanner. You must extract the requested information and provide it in the specified JSON format. If you cannot find a piece of information, return null for its value."
        }
      }),
      'errorAiAnalysis' // Re-using a generic analysis error for now
    );
    
    if (jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        return parsed as { amount: number; description: string; category: CategoryId };
      } catch (e) {
        console.error("Failed to parse JSON from receipt scan:", e);
        addToast("AI returned an invalid format. Please enter manually.", 'error');
        return null;
      }
    }
    return null;
  }, [processRequest, addToast, t]);

  const suggestCategory = useCallback((description: string) => {
    const categoryList = CATEGORIES.map(c => c.id).join(', ');
    const prompt = `Based on the expense description "${description}", which of these categories is most appropriate? Categories: [${categoryList}]. Respond with only one category ID from the list.`;
    
    return processRequest(
      (client) => client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      }),
      'errorAiAnalysis' // A specific error could be added if needed
    );
  }, [processRequest]);
  
  const generateAdvice = useCallback((prompt: string) => {
    return processRequest(
      (client) => client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      }),
      'errorAiAdvice'
    );
  }, [processRequest]);


  return { ...state, generateAnalysis, scanReceipt, suggestCategory, generateAdvice };
}