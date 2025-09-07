import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { useToast } from '../contexts/ToastProvider';
import { useLanguage } from '../contexts/LanguageProvider';
import type { CategoryId } from '../types';
import { CATEGORIES } from '../constants';

// Initialize the AI client at the module level for a single instance.
const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;
if (!ai) {
  console.warn("Gemini AI client could not be initialized. API key might be missing.");
}

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
    requestFn: () => Promise<any>,
    errorMessage: string
  ) => {
    if (!ai) {
      const errorText = "AI client not initialized.";
      console.error(errorText);
      addToast(errorText, 'error');
      setState({ data: null, isLoading: false, error: errorText });
      return null;
    }

    setState({ data: null, isLoading: true, error: null });
    try {
      const response = await requestFn();
      const responseText = response.text;
      setState({ data: responseText as T, isLoading: false, error: null });
      return responseText;
    } catch (error) {
      console.error(errorMessage, error);
      const userFriendlyError = t(errorMessage);
      setState({ data: null, isLoading: false, error: userFriendlyError });
      addToast(userFriendlyError, 'error');
      return null;
    }
  }, [addToast, t]);

  const generateAnalysis = useCallback((prompt: string) => {
    return processRequest(
      () => ai!.models.generateContent({
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
      () => ai!.models.generateContent({
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
          // FIX: Moved systemInstruction into the config object.
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
      () => ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      }),
      'errorAiAnalysis' // A specific error could be added if needed
    );
  }, [processRequest]);
  
  const generateAdvice = useCallback((prompt: string) => {
    return processRequest(
      () => ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      }),
      'errorAiAdvice'
    );
  }, [processRequest]);


  return { ...state, generateAnalysis, scanReceipt, suggestCategory, generateAdvice };
}