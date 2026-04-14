import { createContext } from 'react';

export type Language = 'zh' | 'en';

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  toggleLanguage: () => void;
}

export const I18nContext = createContext<I18nContextType | null>(null);
