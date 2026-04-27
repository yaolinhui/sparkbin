import { Globe } from 'lucide-react';
import { type Language } from '../i18n';
import { useI18n } from '../i18n/hooks';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  const toggleLanguage = () => {
    const newLang: Language = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 border border-brutal-border bg-brutal-surface text-brutal-text
                 hover:border-brutal-accent hover:bg-brutal-surface-hover transition-colors"
      title={t('system.language')}
    >
      <Globe className="w-4 h-4" />
      <span className="text-xs font-mono">
        {language === 'zh' ? '中文' : 'EN'}
      </span>
    </button>
  );
}
