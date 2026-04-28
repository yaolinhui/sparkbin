import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme/hooks';
import { useI18n } from '../i18n/hooks';

export function ThemeSwitcher() {
  const { toggleTheme, isLight } = useTheme();
  const { t } = useI18n();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 border border-brutal-border bg-brutal-surface text-brutal-text
                 hover:border-brutal-accent hover:bg-brutal-surface-hover transition-colors"
      aria-label="Toggle theme"
      title={isLight ? t('theme.switch_to_dark') : t('theme.switch_to_light')}
    >
      {isLight ? (
        <>
          <Moon className="w-4 h-4" />
          <span className="text-xs font-mono">{t('theme.dark')}</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4" />
          <span className="text-xs font-mono">{t('theme.light')}</span>
        </>
      )}
    </button>
  );
}
