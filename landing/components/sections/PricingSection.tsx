import { Check } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

interface PricingSectionProps {
  label: string;
  title: string;
  subtitle: string;
  tiers: Array<{
    name: string;
    price: string;
    period: string;
    desc: string;
    features: string[];
  }>;
  ctaPayg: string;
  ctaFree: string;
}

export function PricingSection({ label, title, subtitle, tiers, ctaPayg, ctaFree }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-16 md:py-24" style={{ backgroundColor: 'var(--brutal-surface)' }}>
      <div className="max-w-container mx-auto px-4 md:px-8">
        <SectionHeader label={label} title={title} subtitle={subtitle} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {tiers.map((tier, i) => {
            const isPayg = tier.name === '按需付费' || tier.name === 'Pay-as-you-go';
            return (
              <ScrollReveal key={tier.name} delay={i * 100}>
                <div
                  className="border-2 p-6 h-full flex flex-col transition-colors hover:border-brutal-accent"
                  style={{
                    borderColor: isPayg ? 'var(--brutal-accent)' : 'var(--brutal-border)',
                    backgroundColor: 'var(--brutal-bg)',
                  }}
                >
                  <div className="mb-4">
                    <h3 className="text-sm font-mono font-bold mb-1" style={{ color: 'var(--brutal-text)' }}>
                      {tier.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-mono font-bold" style={{ color: 'var(--brutal-text)' }}>
                        {tier.price}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--brutal-muted)' }}>
                        {tier.period}
                      </span>
                    </div>
                    <p className="text-xs font-mono mt-2" style={{ color: 'var(--brutal-text-secondary)' }}>
                      {tier.desc}
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brutal-success)' }} />
                        <span className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)' }}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="https://app.sparkbin.wanchun.me"
                    className="block text-center px-5 py-2.5 text-xs font-mono font-bold border-2 transition-colors"
                    style={{
                      backgroundColor: isPayg ? 'var(--brutal-accent)' : 'transparent',
                      borderColor: 'var(--brutal-accent)',
                      color: isPayg ? 'var(--brutal-bg)' : 'var(--brutal-accent)',
                    }}
                  >
                    {isPayg ? ctaPayg : ctaFree}
                  </a>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
