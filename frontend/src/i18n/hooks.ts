import { useContext } from 'react';
import { I18nContext } from './context';

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Hook for stage labels
export function useStageLabel(stageKey: string): string {
  const { t, language } = useI18n();
  const key = `stage.${stageKey}`;
  const translated = t(key);

  // If translation not found, fallback to uppercase
  if (translated === key) {
    return stageKey.toUpperCase();
  }

  // For English, uppercase; for CJK languages (zh, ja), return as-is
  return language === 'en' ? translated.toUpperCase() : translated;
}

// Hook for status labels
export function useStatusLabel(status: string): string {
  const { t } = useI18n();
  const key = `status.${status}`;
  const translated = t(key);
  return translated === key ? status.toUpperCase() : translated;
}
