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

        {/* Live AI Coach Demo */}
        <div className="mt-12">
          <ScrollReveal>
            <div
              className="border-2 w-full"
              style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-bg)' }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3 border-b-2"
                style={{ borderColor: 'var(--brutal-border)' }}
              >
                <div className="w-3 h-3" style={{ backgroundColor: '#ff5f56' }} />
                <div className="w-3 h-3" style={{ backgroundColor: '#ffbd2e' }} />
                <div className="w-3 h-3" style={{ backgroundColor: '#27c93f' }} />
                <span className="ml-2 text-[10px] font-mono" style={{ color: 'var(--brutal-muted)' }}>
                  sparkbin-coach
                </span>
              </div>
              <div className="p-4 md:p-6 font-mono text-xs leading-relaxed overflow-x-auto">
                <div className="mb-3">
                  <span style={{ color: 'var(--brutal-muted)' }}>[System] Project "AI简历助手" entered stage 02 VALIDATE</span>
                </div>
                <div className="mb-3">
                  <span style={{ color: 'var(--brutal-accent)' }}>Coach Pixel:</span>
                  <span style={{ color: 'var(--brutal-text)' }}> 你验证了什么？别跟我说"我觉得有人需要"。</span>
                </div>
                <div className="mb-3">
                  <span style={{ color: 'var(--brutal-text-secondary)' }}>User: 我发了问卷，收了 47 份，63% 说愿意付费。</span>
                </div>
                <div className="mb-3">
                  <span style={{ color: 'var(--brutal-accent)' }}>Coach Pixel:</span>
                  <span style={{ color: 'var(--brutal-text)' }}> 样本量太小，置信区间不够。再去 3 个微信群问，凑够 100 份。</span>
                </div>
                <div className="mb-3">
                  <span style={{ color: 'var(--brutal-text-secondary)' }}>User: ...好吧。</span>
                </div>
                <div className="mb-3">
                  <span style={{ color: 'var(--brutal-muted)' }}>[2 hours later]</span>
                </div>
                <div className="mb-3">
                  <span style={{ color: 'var(--brutal-text-secondary)' }}>User: 108 份了，71% 愿意付 ￥29/月。</span>
                </div>
                <div className="mb-3">
                  <span style={{ color: 'var(--brutal-success)' }}>[GO]</span>
                  <span style={{ color: 'var(--brutal-text)' }}> Validation passed. Proceed to PROTOTYPE.</span>
                </div>
                <div>
                  <span style={{ color: 'var(--brutal-accent)' }}>$</span>
                  <span className="inline-block w-2 h-4 ml-1 align-middle" style={{ backgroundColor: 'var(--brutal-accent)' }} />
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
