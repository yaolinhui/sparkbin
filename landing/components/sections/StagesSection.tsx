import { Lightbulb, CheckCircle, Hammer, Rocket, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

const ICONS = [Lightbulb, CheckCircle, Hammer, Rocket, TrendingUp, DollarSign];

interface StagesSectionProps {
  label: string;
  title: string;
  subtitle: string;
  items: Array<{
    num: string;
    label: string;
    labelZh: string;
    desc: string;
  }>;
}

export function StagesSection({ label, title, subtitle, items }: StagesSectionProps) {
  return (
    <section id="stages" className="py-16 md:py-24" style={{ backgroundColor: 'var(--brutal-bg)' }}>
      <div className="max-w-container mx-auto px-4 md:px-8">
        <SectionHeader label={label} title={title} subtitle={subtitle} />

        {/* Desktop: horizontal flow */}
        <div className="hidden lg:grid lg:grid-cols-6 gap-4">
          {items.map((item, i) => {
            const Icon = ICONS[i];
            const isLast = i === items.length - 1;
            return (
              <ScrollReveal key={item.label} delay={i * 80}>
                <div className="relative">
                  <div
                    className="border-2 p-4 h-full flex flex-col transition-colors hover:border-brutal-accent"
                    style={{
                      borderColor: 'var(--brutal-border)',
                      backgroundColor: 'var(--brutal-surface)',
                    }}
                  >
                    <div
                      className="text-[10px] font-mono font-bold mb-2"
                      style={{ color: 'var(--brutal-accent)' }}
                    >
                      {item.num}
                    </div>
                    <Icon className="w-5 h-5 mb-3" style={{ color: 'var(--brutal-accent)' }} />
                    <div className="text-xs font-mono font-bold mb-1" style={{ color: 'var(--brutal-text)' }}>
                      {item.label}
                    </div>
                    <div className="text-[10px] font-mono mb-2" style={{ color: 'var(--brutal-muted)' }}>
                      {item.labelZh}
                    </div>
                    <p className="text-[10px] font-mono leading-relaxed mt-auto" style={{ color: 'var(--brutal-text-secondary)' }}>
                      {item.desc}
                    </p>
                  </div>
                  {!isLast && (
                    <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-4 h-4" style={{ color: 'var(--brutal-border)' }} />
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Mobile: vertical stack */}
        <div className="lg:hidden flex flex-col gap-4">
          {items.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <ScrollReveal key={item.label} delay={i * 60}>
                <div
                  className="border-2 p-4 flex items-start gap-4 transition-colors hover:border-brutal-accent"
                  style={{
                    borderColor: 'var(--brutal-border)',
                    backgroundColor: 'var(--brutal-surface)',
                  }}
                >
                  <div className="flex-shrink-0">
                    <div
                      className="w-8 h-8 flex items-center justify-center border mb-2"
                      style={{ borderColor: 'var(--brutal-border)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: 'var(--brutal-accent)' }} />
                    </div>
                    <div
                      className="text-[10px] font-mono font-bold text-center"
                      style={{ color: 'var(--brutal-accent)' }}
                    >
                      {item.num}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold mb-1" style={{ color: 'var(--brutal-text)' }}>
                      {item.label}
                      <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--brutal-muted)' }}>
                        {item.labelZh}
                      </span>
                    </div>
                    <p className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
