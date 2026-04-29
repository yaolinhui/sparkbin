'use client';

import { useTranslations } from 'next-intl';
import { Lock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function FooterSection() {
  const t = useTranslations('footer');

  const productLinks = [
    { label: t('features'), href: '#features' },
    { label: t('pricing'), href: '#pricing' },
    { label: t('enter'), href: 'https://app.sparkbin.dev' },
  ];

  const resourceLinks = [
    { label: t('docs'), href: '/docs/' },
    { label: t('selfhosting'), href: 'https://github.com/yaolinhui/sparkbin/blob/main/SELF_HOSTING.md' },
    { label: t('contributing'), href: 'https://github.com/yaolinhui/sparkbin/blob/main/CONTRIBUTING.md' },
  ];

  const openSourceLinks = [
    { label: t('github'), href: 'https://github.com/yaolinhui/sparkbin' },
    { label: t('license'), href: 'https://github.com/yaolinhui/sparkbin/blob/main/LICENSE' },
    { label: t('security'), href: 'https://github.com/yaolinhui/sparkbin/blob/main/SECURITY.md' },
  ];

  return (
    <footer className="border-t-2 py-12 md:py-16" style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-bg)' }}>
      <div className="max-w-container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: 'var(--brutal-text)' }}>
                <Lock className="w-4 h-4" style={{ color: 'var(--brutal-bg)' }} />
              </div>
              <span className="font-mono font-bold text-sm" style={{ color: 'var(--brutal-text)' }}>
                SPARKBIN
              </span>
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--brutal-muted)' }}>
              {t('brand')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-mono font-bold tracking-widest mb-3" style={{ color: 'var(--brutal-text)' }}>
              {t('product')}
            </h4>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('http') || link.href.startsWith('#') ? (
                    <a
                      href={link.href}
                      className="text-xs font-mono transition-colors hover:text-brutal-text"
                      style={{ color: 'var(--brutal-text-secondary)' }}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-xs font-mono transition-colors hover:text-brutal-text"
                      style={{ color: 'var(--brutal-text-secondary)' }}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-mono font-bold tracking-widest mb-3" style={{ color: 'var(--brutal-text)' }}>
              {t('resources')}
            </h4>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono transition-colors hover:text-brutal-text"
                    style={{ color: 'var(--brutal-text-secondary)' }}
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Open Source */}
          <div>
            <h4 className="text-xs font-mono font-bold tracking-widest mb-3" style={{ color: 'var(--brutal-text)' }}>
              {t('opensource')}
            </h4>
            <ul className="space-y-2">
              {openSourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono transition-colors hover:text-brutal-text"
                    style={{ color: 'var(--brutal-text-secondary)' }}
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-3"
          style={{ borderColor: 'var(--brutal-border)' }}
        >
          <p className="text-[10px] font-mono" style={{ color: 'var(--brutal-muted)' }}>
            {t('copyright')}
          </p>
          <p className="text-[10px] font-mono" style={{ color: 'var(--brutal-muted)' }}>
            {t('builtWith')}
          </p>
        </div>
      </div>
    </footer>
  );
}
