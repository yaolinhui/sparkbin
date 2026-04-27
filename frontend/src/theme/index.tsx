import React, { useState, useCallback, useEffect } from 'react';
import type { Theme } from './context';

export { type Theme, type ThemeContextType, ThemeContext } from './context';
import { ThemeContext } from './context';
import { authApi, isAuthenticated } from '../services/api';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('sparkbin-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Detect system preference if no saved theme
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark'; // Default to dark theme
  });

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('sparkbin-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    // 如果已登录，同步到后端
    if (isAuthenticated()) {
      authApi.setTheme(newTheme).catch(() => {
        // 静默失败，localStorage 已保存
      });
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [theme, setTheme]);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 从后端同步主题偏好（如果已登录）
  useEffect(() => {
    if (!isAuthenticated()) return;
    authApi.getMe()
      .then((data) => {
        const serverTheme = data.theme_preference;
        if (serverTheme === 'light' || serverTheme === 'dark') {
          setThemeState(serverTheme);
          localStorage.setItem('sparkbin-theme', serverTheme);
          document.documentElement.setAttribute('data-theme', serverTheme);
        }
      })
      .catch(() => {
        // 失败时保持 localStorage 的值
      });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isLight: theme === 'light',
        isDark: theme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
