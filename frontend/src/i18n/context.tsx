import { createContext } from 'react';

export type Language = 'zh' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de';

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  toggleLanguage: () => void;
}

export const I18nContext = createContext<I18nContextType | null>(null);
