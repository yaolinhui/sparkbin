'use client';

import { usePathname, useRouter } from 'next/navigation';

interface LanguageSwitcherProps {
  currentLang: string;
}

export function LanguageSwitcher({ currentLang }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  const switchLang = (lang: string) => {
    const newPath = pathname.replace(/^\/(zh|en)/, `/${lang}`);
    router.push(newPath);
  };

  return (
    <div className="flex items-center border" style={{ borderColor: 'var(--brutal-border)' }}>
      <button
        onClick={() => switchLang('zh')}
        className="px-2 py-1 text-xs font-mono transition-colors"
        style={{
          backgroundColor: currentLang === 'zh' ? 'var(--brutal-accent)' : 'transparent',
          color: currentLang === 'zh' ? 'var(--brutal-bg)' : 'var(--brutal-muted)',
        }}
      >
        中
      </button>
      <button
        onClick={() => switchLang('en')}
        className="px-2 py-1 text-xs font-mono transition-colors"
        style={{
          backgroundColor: currentLang === 'en' ? 'var(--brutal-accent)' : 'transparent',
          color: currentLang === 'en' ? 'var(--brutal-bg)' : 'var(--brutal-muted)',
        }}
      >
        EN
      </button>
    </div>
  );
}
