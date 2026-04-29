import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const isZh = params.lang === 'zh';
  return {
    title: isZh ? '文档 - SparkBin' : 'Documentation - SparkBin',
    description: isZh
      ? 'SparkBin 文档：快速开始、工作流说明、AI 配置指南。'
      : 'SparkBin documentation: quick start, workflow guide, AI configuration.',
  };
}

export default function DocsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-4" style={{ color: 'var(--brutal-text)' }}>
        Quick Start
      </h1>
      <p className="text-sm font-mono mb-6" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
        Get SparkBin running in under 5 minutes. This guide covers both Cloud and Self-Hosted setups.
      </p>

      <div className="border-2 p-4 mb-6" style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-surface)' }}>
        <h2 className="text-sm font-mono font-bold mb-3" style={{ color: 'var(--brutal-text)' }}>
          Cloud (Recommended)
        </h2>
        <ol className="space-y-2 text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)' }}>
          <li>1. Go to <a href="https://app.sparkbin.dev" className="underline" style={{ color: 'var(--brutal-accent)' }}>app.sparkbin.dev</a></li>
          <li>2. Sign up with email or GitHub</li>
          <li>3. Create your first project and start the workflow</li>
        </ol>
      </div>

      <div className="border-2 p-4 mb-6" style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-surface)' }}>
        <h2 className="text-sm font-mono font-bold mb-3" style={{ color: 'var(--brutal-text)' }}>
          Self-Hosted
        </h2>
        <pre
          className="text-xs font-mono p-3 overflow-x-auto"
          style={{ backgroundColor: 'var(--brutal-bg)', border: '1px solid var(--brutal-border)', color: 'var(--brutal-text-secondary)' }}
        >
{`git clone https://github.com/yaolinhui/sparkbin.git
cd sparkbin
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
docker-compose up -d`}
        </pre>
      </div>

      <p className="text-xs font-mono" style={{ color: 'var(--brutal-muted)' }}>
        For detailed setup instructions, see the <a href="https://github.com/yaolinhui/sparkbin/blob/main/SELF_HOSTING.md" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--brutal-accent)' }}>Self-Hosting Guide</a>.
      </p>
    </div>
  );
}
