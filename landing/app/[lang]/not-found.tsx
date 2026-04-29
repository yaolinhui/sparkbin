'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'var(--brutal-bg)' }}>
      <div className="w-full max-w-md border-2 p-8 text-center" style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-surface)' }}>
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: 'var(--brutal-text)' }}>
            <Lock className="w-5 h-5" style={{ color: 'var(--brutal-bg)' }} />
          </div>
          <span className="text-xl font-mono font-bold" style={{ color: 'var(--brutal-text)' }}>SPARKBIN</span>
        </div>
        <h1 className="text-3xl font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
          {t('title')}
        </h1>
        <p className="text-sm font-mono mb-6" style={{ color: 'var(--brutal-text-secondary)' }}>
          {t('subtitle')}
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 font-mono font-bold border-2 transition-colors"
          style={{
            backgroundColor: 'var(--brutal-accent)',
            borderColor: 'var(--brutal-accent)',
            color: 'var(--brutal-bg)',
          }}
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
