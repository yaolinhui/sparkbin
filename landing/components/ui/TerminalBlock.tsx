'use client';

interface TerminalBlockProps {
  lines: string[];
}

export function TerminalBlock({ lines }: TerminalBlockProps) {
  return (
    <div className="border-2 w-full" style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-bg)' }}>
      {/* Window chrome */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b-2"
        style={{ borderColor: 'var(--brutal-border)' }}
      >
        <div className="w-3 h-3" style={{ backgroundColor: '#ff5f56' }} />
        <div className="w-3 h-3" style={{ backgroundColor: '#ffbd2e' }} />
        <div className="w-3 h-3" style={{ backgroundColor: '#27c93f' }} />
        <span className="ml-2 text-[10px] font-mono" style={{ color: 'var(--brutal-muted)' }}>
          sparkbin-cli
        </span>
      </div>
      {/* Terminal content */}
      <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto">
        {lines.map((line, i) => (
          <div key={i} className="mb-1">
            {line.startsWith('$') ? (
              <span>
                <span style={{ color: 'var(--brutal-accent)' }}>$</span>
                <span style={{ color: 'var(--brutal-text)' }}>{line.slice(1)}</span>
              </span>
            ) : line.startsWith('>') ? (
              <span style={{ color: 'var(--brutal-muted)' }}>{line}</span>
            ) : line.startsWith('[') && line.includes(']') ? (
              <span>
                <span style={{ color: 'var(--brutal-success)' }}>{line.split(']')[0]}]</span>
                <span style={{ color: 'var(--brutal-text-secondary)' }}>{line.split(']')[1]}</span>
              </span>
            ) : (
              <span style={{ color: 'var(--brutal-text-secondary)' }}>{line}</span>
            )}
          </div>
        ))}
        <div className="mt-2">
          <span style={{ color: 'var(--brutal-accent)' }}>$</span>
          <span className="inline-block w-2 h-4 ml-1 align-middle" style={{ backgroundColor: 'var(--brutal-accent)' }} />
        </div>
      </div>
    </div>
  );
}
