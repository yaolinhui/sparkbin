import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme/hooks';

export function ThemeSwitcher() {
  const { toggleTheme, isLight } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 border border-brutal-border bg-brutal-surface
                 hover:border-brutal-text transition-colors"
      aria-label="Toggle theme"
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      {isLight ? (
        <>
          <Moon className="w-4 h-4 text-brutal-accent" />
          <span className="text-xs font-mono">DARK</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-brutal-accent" />
          <span className="text-xs font-mono">LIGHT</span>
        </>
      )}
    </button>
  );
}
