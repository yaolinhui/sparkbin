import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { type Language } from '../i18n';
import { useI18n } from '../i18n/hooks';

const LANG_OPTIONS: { code: Language; label: string; flag: string }[] = [
  { code: 'zh', label: '中文', flag: 'CN' },
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'ja', label: '日本語', flag: 'JP' },
  { code: 'ko', label: '한국어', flag: 'KR' },
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'fr', label: 'Français', flag: 'FR' },
  { code: 'de', label: 'Deutsch', flag: 'DE' },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  const currentLabel = LANG_OPTIONS.find((l) => l.code === language)?.label ?? language.toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-2 border bg-brutal-surface text-brutal-text transition-colors
                   ${isOpen ? 'border-brutal-accent bg-brutal-surface-hover' : 'border-brutal-border hover:border-brutal-accent hover:bg-brutal-surface-hover'}`}
        title={currentLabel}
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs font-mono">{currentLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 border border-brutal-border bg-brutal-surface z-50 w-40">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => handleSelect(opt.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-mono transition-colors
                         ${
                           language === opt.code
                             ? 'bg-brutal-accent text-brutal-bg'
                             : 'text-brutal-text hover:bg-brutal-surface-hover'
                         }`}
            >
              <span>
                <span className="opacity-60 mr-2">{opt.flag}</span>
                {opt.label}
              </span>
              {language === opt.code && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
