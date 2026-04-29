import { ScrollReveal } from './ScrollReveal';

interface SectionHeaderProps {
  label: string;
  title: string;
  subtitle?: string;
}

export function SectionHeader({ label, title, subtitle }: SectionHeaderProps) {
  return (
    <ScrollReveal className="text-center mb-12 md:mb-16">
      <div
        className="inline-block px-2 py-1 text-[10px] font-mono font-bold tracking-widest border mb-4"
        style={{ borderColor: 'var(--brutal-accent)', color: 'var(--brutal-accent)' }}
      >
        {label}
      </div>
      <h2
        className="text-2xl md:text-3xl font-mono font-bold tracking-tight mb-3"
        style={{ color: 'var(--brutal-text)' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm font-mono max-w-xl mx-auto" style={{ color: 'var(--brutal-text-secondary)' }}>
          {subtitle}
        </p>
      )}
    </ScrollReveal>
  );
}
