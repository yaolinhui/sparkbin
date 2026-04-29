'use client';

import { useTranslations } from 'next-intl';
import { Bot, GitBranch, FileText, Calculator, Map, Github } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

const ICONS = [Bot, GitBranch, FileText, Calculator, Map, Github];

export function FeaturesSection() {
  const t = useTranslations('features');
  const items = t.raw('items') as Array<{ title: string; desc: string }>;

  return (
    <section id="features" className="py-16 md:py-24" style={{ backgroundColor: 'var(--brutal-surface)' }}>
      <div className="max-w-container mx-auto px-4 md:px-8">
        <SectionHeader label={t('label')} title={t('title')} subtitle={t('subtitle')} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <ScrollReveal key={item.title} delay={i * 80}>
                <div
                  className="border-2 p-6 h-full flex flex-col transition-colors hover:border-brutal-accent"
                  style={{
                    borderColor: 'var(--brutal-border)',
                    backgroundColor: 'var(--brutal-bg)',
                  }}
                >
                  <Icon className="w-6 h-6 mb-4" style={{ color: 'var(--brutal-accent)' }} />
                  <h3 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
                    {item.title}
                  </h3>
                  <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--brutal-text-secondary)' }}>
                    {item.desc}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
