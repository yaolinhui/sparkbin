'use client';

import { useTranslations } from 'next-intl';
import { Check, Server, Cloud } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function DeploymentSection() {
  const t = useTranslations('deployment');
  const selfHosted = t.raw('selfHosted') as {
    title: string;
    badge: string;
    desc: string;
    features: string[];
  };
  const cloud = t.raw('cloud') as {
    title: string;
    badge: string;
    desc: string;
    features: string[];
  };

  return (
    <section id="opensource" className="py-16 md:py-24" style={{ backgroundColor: 'var(--brutal-bg)' }}>
      <div className="max-w-container mx-auto px-4 md:px-8">
        <SectionHeader label={t('label')} title={t('title')} subtitle={t('subtitle')} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Self-Hosted */}
          <ScrollReveal>
            <div
              className="border-2 p-6 md:p-8 h-full flex flex-col"
              style={{
                borderColor: 'var(--brutal-border)',
                backgroundColor: 'var(--brutal-surface)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5" style={{ color: 'var(--brutal-accent)' }} />
                  <h3 className="text-sm font-mono font-bold" style={{ color: 'var(--brutal-text)' }}>
                    {selfHosted.title}
                  </h3>
                </div>
                <span
                  className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest border"
                  style={{ borderColor: 'var(--brutal-success)', color: 'var(--brutal-success)' }}
                >
                  {selfHosted.badge}
                </span>
              </div>
              <p className="text-xs font-mono mb-6" style={{ color: 'var(--brutal-text-secondary)' }}>
                {selfHosted.desc}
              </p>
              <ul className="space-y-2 mt-auto">
                {selfHosted.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brutal-success)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)' }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* Cloud */}
          <ScrollReveal delay={100}>
            <div
              className="border-2 p-6 md:p-8 h-full flex flex-col"
              style={{
                borderColor: 'var(--brutal-border)',
                backgroundColor: 'var(--brutal-surface)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Cloud className="w-5 h-5" style={{ color: 'var(--brutal-accent)' }} />
                  <h3 className="text-sm font-mono font-bold" style={{ color: 'var(--brutal-text)' }}>
                    {cloud.title}
                  </h3>
                </div>
                <span
                  className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest border"
                  style={{ borderColor: 'var(--brutal-accent)', color: 'var(--brutal-accent)' }}
                >
                  {cloud.badge}
                </span>
              </div>
              <p className="text-xs font-mono mb-6" style={{ color: 'var(--brutal-text-secondary)' }}>
                {cloud.desc}
              </p>
              <ul className="space-y-2 mt-auto">
                {cloud.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brutal-success)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)' }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
