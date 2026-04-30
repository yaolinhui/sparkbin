import { ExternalLink } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

interface CTABannerProps {
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
}

export function CTABanner({ title, subtitle, primary, secondary }: CTABannerProps) {
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--brutal-bg)' }}>
      <div className="max-w-container mx-auto px-4 md:px-8">
        <ScrollReveal>
          <div
            className="border-2 p-8 md:p-12 text-center"
            style={{
              borderColor: 'var(--brutal-accent)',
              backgroundColor: 'var(--brutal-surface)',
            }}
          >
            <h2
              className="text-xl md:text-2xl font-mono font-bold tracking-tight mb-3 max-w-lg mx-auto"
              style={{ color: 'var(--brutal-text)' }}
            >
              {title}
            </h2>
            <p
              className="text-sm font-mono mb-8 max-w-md mx-auto"
              style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}
            >
              {subtitle}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="https://app.sparkbin.dev"
                className="inline-flex items-center px-6 py-3 text-sm font-mono font-bold border-2 transition-colors"
                style={{
                  backgroundColor: 'var(--brutal-accent)',
                  borderColor: 'var(--brutal-accent)',
                  color: 'var(--brutal-bg)',
                }}
              >
                {primary}
              </a>
              <a
                href="https://github.com/yaolinhui/sparkbin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 text-sm font-mono font-bold border-2 transition-colors hover:border-brutal-text"
                style={{
                  backgroundColor: 'var(--brutal-bg)',
                  borderColor: 'var(--brutal-border)',
                  color: 'var(--brutal-text)',
                }}
              >
                {secondary}
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
