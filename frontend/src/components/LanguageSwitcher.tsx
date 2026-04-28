import { Globe } from 'lucide-react';
import { type Language } from '../i18n';
import { useI18n } from '../i18n/hooks';

const LANG_LABELS: Record<Language, string> = {
  zh: '中文',
  en: 'EN',
  ja: '日本語',
  ko: '한국어',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
};

export function LanguageSwitcher() {
  const { language, toggleLanguage } = useI18n();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 border border-brutal-border bg-brutal-surface text-brutal-text
                 hover:border-brutal-accent hover:bg-brutal-surface-hover transition-colors"
      title={LANG_LABELS[language]}
    >
      <Globe className="w-4 h-4" />
      <span className="text-xs font-mono">
        {LANG_LABELS[language]}
      </span>
    </button>
  );
}
