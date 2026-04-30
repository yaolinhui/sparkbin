'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Lock, Menu, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

export function NavBar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const lang = pathname.startsWith('/en') ? 'en' : 'zh';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks: Array<{ href: string; label: string; external?: boolean }> = [
    { href: '#stages', label: t('stages') },
    { href: '#features', label: t('features') },
    { href: '#pricing', label: t('pricing') },
    { href: 'https://github.com/yaolinhui/sparkbin', label: t('opensource'), external: true },
  ];

  const scrollToSection = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      const navHeight = 56;
      const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-150"
      style={{
        backgroundColor: scrolled ? 'var(--brutal-bg)' : 'transparent',
        borderBottom: scrolled ? '2px solid var(--brutal-border)' : '2px solid transparent',
      }}
    >
      <div className="max-w-container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href={`/${lang}/`} className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: 'var(--brutal-text)' }}>
              <Lock className="w-4 h-4" style={{ color: 'var(--brutal-bg)' }} />
            </div>
            <span className="font-mono font-bold text-sm tracking-tight hidden sm:block" style={{ color: 'var(--brutal-text)' }}>
              SPARKBIN
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-mono transition-colors hover:text-brutal-text"
                  style={{ color: 'var(--brutal-text-secondary)' }}
                >
                  {link.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.href);
                  }}
                  className="text-xs font-mono transition-colors hover:text-brutal-text"
                  style={{ color: 'var(--brutal-text-secondary)' }}
                >
                  {link.label}
                </a>
              )
            )}
            <a
              href="https://github.com/yaolinhui/sparkbin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono transition-colors hover:text-brutal-text"
              style={{ color: 'var(--brutal-text-secondary)' }}
            >
              {t('github')}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <LanguageSwitcher currentLang={lang} />
              <ThemeSwitcher />
            </div>
            <a
              href="https://app.sparkbin.dev"
              className="hidden sm:inline-block px-4 py-1.5 text-xs font-mono font-bold border-2 transition-colors"
              style={{
                backgroundColor: 'var(--brutal-accent)',
                borderColor: 'var(--brutal-accent)',
                color: 'var(--brutal-bg)',
              }}
            >
              {t('enter')}
            </a>
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-8 h-8 flex items-center justify-center border"
              style={{ borderColor: 'var(--brutal-border)' }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-4 h-4" style={{ color: 'var(--brutal-text)' }} />
              ) : (
                <Menu className="w-4 h-4" style={{ color: 'var(--brutal-text)' }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t-2 px-4 py-4"
          style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-bg)' }}
        >
          <div className="flex flex-col gap-3">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-mono py-2"
                  style={{ color: 'var(--brutal-text-secondary)' }}
                >
                  {link.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.href);
                  }}
                  className="text-sm font-mono py-2"
                  style={{ color: 'var(--brutal-text-secondary)' }}
                >
                  {link.label}
                </a>
              )
            )}
            <a
              href="https://github.com/yaolinhui/sparkbin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-mono py-2"
              style={{ color: 'var(--brutal-text-secondary)' }}
            >
              {t('github')}
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="flex items-center gap-2 py-2">
              <LanguageSwitcher currentLang={lang} />
              <ThemeSwitcher />
            </div>
            <a
              href="https://app.sparkbin.dev"
              className="inline-block text-center px-4 py-2 text-sm font-mono font-bold border-2 mt-2"
              style={{
                backgroundColor: 'var(--brutal-accent)',
                borderColor: 'var(--brutal-accent)',
                color: 'var(--brutal-bg)',
              }}
            >
              {t('enter')}
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
