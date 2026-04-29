'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    router.replace('/zh/');
    const timer = setTimeout(() => setShowFallback(true), 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: 'var(--brutal-bg)' }}
    >
      <div
        className="animate-spin"
        style={{
          width: '32px',
          height: '32px',
          border: '2px solid var(--brutal-accent)',
          borderTopColor: 'transparent',
        }}
      />
      <p className="font-mono text-xs" style={{ color: 'var(--brutal-muted)' }}>
        Redirecting...
      </p>
      {showFallback && (
        <a
          href="/zh/"
          className="px-4 py-2 text-xs font-mono font-bold border-2"
          style={{
            backgroundColor: 'var(--brutal-accent)',
            borderColor: 'var(--brutal-accent)',
            color: 'var(--brutal-bg)',
          }}
        >
          Click to enter
        </a>
      )}
      <noscript>
        <meta httpEquiv="refresh" content="0;url=/zh/" />
        <p className="font-mono text-xs" style={{ color: 'var(--brutal-text-secondary)' }}>
          JavaScript is disabled.{' '}
          <a href="/zh/" style={{ color: 'var(--brutal-accent)', textDecoration: 'underline' }}>
            Click here to continue.
          </a>
        </p>
      </noscript>
    </div>
  );
}
