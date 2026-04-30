import { Bot, GitBranch, FileText, Calculator, Map, Github } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

const ICONS = [Bot, GitBranch, FileText, Calculator, Map, Github];

interface FeaturesSectionProps {
  label: string;
  title: string;
  subtitle: string;
  items: Array<{ title: string; desc: string }>;
  screenshotLabel?: string;
}

export function FeaturesSection({
  label,
  title,
  subtitle,
  items,
  screenshotLabel = '产品截图待补充',
}: FeaturesSectionProps) {
  return (
    <section id="features" className="py-16 md:py-24" style={{ backgroundColor: 'var(--brutal-surface)' }}>
      <div className="max-w-container mx-auto px-4 md:px-8">
        <SectionHeader label={label} title={title} subtitle={subtitle} />

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

        {/* Screenshot placeholders */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div
                className="border-2 flex flex-col items-center justify-center py-16 md:py-20"
                style={{
                  borderColor: 'var(--brutal-border)',
                  backgroundColor: 'var(--brutal-border)',
                }}
              >
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--brutal-muted)' }}>
                  SCREENSHOT_PLACEHOLDER
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <p
          className="text-center text-[10px] font-mono mt-4"
          style={{ color: 'var(--brutal-muted)' }}
        >
          {screenshotLabel}
        </p>
      </div>
    </section>
  );
}
