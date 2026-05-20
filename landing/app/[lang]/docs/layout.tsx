'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, Menu, X, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

interface DocsLayoutProps {
  children: React.ReactNode;
  params: { lang: string };
}

export default function DocsLayout({ children, params }: DocsLayoutProps) {
  const pathname = usePathname();
  const lang = params.lang;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = [
    { href: `/${lang}/docs/`, label: 'Quick Start' },
    { href: `/${lang}/docs/getting-started/`, label: 'Getting Started' },
    { href: `/${lang}/docs/workflow/`, label: 'Workflow' },
    { href: `/${lang}/docs/ai-config/`, label: 'AI Config' },
    { href: `/${lang}/docs/self-hosting/`, label: 'Self-Hosting' },
    { href: `/${lang}/docs/faq/`, label: 'FAQ' },
  ];

  const isActive = (href: string) => {
    if (href === `/${lang}/docs/`) {
      return pathname === href || pathname === `/${lang}/docs`;
    }
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--brutal-bg)' }}>
      {/* Docs header */}
      <header
        className="sticky top-0 z-40 border-b-2"
        style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-bg)' }}
      >
        <div className="max-w-container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link href={`/${lang}/`} className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: 'var(--brutal-text)' }}>
                  <Lock className="w-4 h-4" style={{ color: 'var(--brutal-bg)' }} />
                </div>
                <span className="font-mono font-bold text-sm tracking-tight hidden sm:block" style={{ color: 'var(--brutal-text)' }}>
                  SPARKBIN
                </span>
              </Link>
              <span className="text-xs font-mono hidden sm:block" style={{ color: 'var(--brutal-muted)' }}>
                /
              </span>
              <span className="text-xs font-mono hidden sm:block" style={{ color: 'var(--brutal-text-secondary)' }}>
                Docs
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <LanguageSwitcher currentLang={lang} />
                <ThemeSwitcher />
              </div>
              <a
                href="https://sparkbin.wanchun.me"
                className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-mono font-bold border-2 transition-colors"
                style={{
                  backgroundColor: 'var(--brutal-accent)',
                  borderColor: 'var(--brutal-accent)',
                  color: 'var(--brutal-bg)',
                }}
              >
                Enter System
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="lg:hidden w-8 h-8 flex items-center justify-center border"
                style={{ borderColor: 'var(--brutal-border)' }}
                aria-label="Toggle docs nav"
              >
                {mobileNavOpen ? (
                  <X className="w-4 h-4" style={{ color: 'var(--brutal-text)' }} />
                ) : (
                  <Menu className="w-4 h-4" style={{ color: 'var(--brutal-text)' }} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-container mx-auto w-full">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-14 left-0 z-30 w-64 h-[calc(100vh-3.5rem)] overflow-y-auto border-r-2 transition-transform lg:translate-x-0 ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-bg)' }}
        >
          <nav className="p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="block px-3 py-2 text-xs font-mono transition-colors"
                    style={{
                      color: isActive(item.href) ? 'var(--brutal-accent)' : 'var(--brutal-text-secondary)',
                      backgroundColor: isActive(item.href) ? 'var(--brutal-surface)' : 'transparent',
                      borderLeft: isActive(item.href) ? '2px solid var(--brutal-accent)' : '2px solid transparent',
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Mobile overlay */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-20 lg:hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-8" style={{ backgroundColor: 'var(--brutal-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
