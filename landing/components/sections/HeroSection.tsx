import { Lock, ExternalLink, CheckCircle } from 'lucide-react';
import { TerminalBlock } from '@/components/ui/TerminalBlock';

interface HeroSectionProps {
  badge: string;
  title1: string;
  title2: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  trust: {
    opensource: string;
    selfhost: string;
    aiproxy: string;
  };
}

export function HeroSection({
  badge,
  title1,
  title2,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  trust,
}: HeroSectionProps) {
  const terminalLines = [
    '$ sparkbin init my-idea',
    '> Creating project workspace...',
    '[OK] Project "my-idea" initialized',
    '[OK] AI coach assigned: "Spark"',
    '',
    '$ sparkbin stage --list',
    '> 01 IDEA        - Capture and assess',
    '> 02 VALIDATE    - GO/NO-GO decision',
    '> 03 PROTOTYPE   - Build MVP plan',
    '> 04 SHIP        - Launch checklist',
    '> 05 GROW        - Growth experiments',
    '> 06 MONETIZE    - Pricing simulator',
    '',
    '$ sparkbin validate --run',
    '> Analyzing market fit...',
    '[GO] Demand validated. Proceed to prototype.',
  ];

  const trustItems = [
    { key: 'opensource' as const, icon: CheckCircle },
    { key: 'selfhost' as const, icon: CheckCircle },
    { key: 'aiproxy' as const, icon: CheckCircle },
  ];

  return (
    <section
      className="min-h-screen flex items-center pt-14"
      style={{ backgroundColor: 'var(--brutal-bg)' }}
    >
      <div className="max-w-container mx-auto px-4 md:px-8 py-16 md:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div>
            <div
              className="inline-block px-2 py-1 text-[10px] font-mono font-bold tracking-widest border mb-6"
              style={{ borderColor: 'var(--brutal-accent)', color: 'var(--brutal-accent)' }}
            >
              {badge}
            </div>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-mono font-bold tracking-tight leading-tight mb-4"
              style={{ color: 'var(--brutal-text)' }}
            >
              {title1}
              <br />
              <span style={{ color: 'var(--brutal-accent)' }}>{title2}</span>
            </h1>
            <p
              className="text-sm md:text-base font-mono mb-8 max-w-md"
              style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}
            >
              {subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              <a
                href="https://app.sparkbin.wanchun.me"
                className="inline-flex items-center px-6 py-3 text-sm font-mono font-bold border-2 transition-colors"
                style={{
                  backgroundColor: 'var(--brutal-accent)',
                  borderColor: 'var(--brutal-accent)',
                  color: 'var(--brutal-bg)',
                }}
              >
                <Lock className="w-4 h-4 mr-2" />
                {ctaPrimary}
              </a>
              <a
                href="https://github.com/yaolinhui/sparkbin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 text-sm font-mono font-bold border-2 transition-colors hover:border-brutal-text"
                style={{
                  backgroundColor: 'var(--brutal-surface)',
                  borderColor: 'var(--brutal-border)',
                  color: 'var(--brutal-text)',
                }}
              >
                {ctaSecondary}
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </div>

            {/* Trust tags */}
            <div className="flex flex-wrap gap-4">
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color: 'var(--brutal-success)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--brutal-muted)' }}>
                      {trust[item.key]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Terminal */}
          <div className="hidden md:block">
            <TerminalBlock lines={terminalLines} />
          </div>
        </div>
      </div>
    </section>
  );
}
