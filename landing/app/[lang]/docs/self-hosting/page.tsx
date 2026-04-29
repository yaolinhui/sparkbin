export default function SelfHostingPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-4" style={{ color: 'var(--brutal-text)' }}>
        Self-Hosting Guide
      </h1>
      <p className="text-sm font-mono mb-6" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
        Deploy SparkBin on your own server. Full control, full privacy, zero recurring costs.
      </p>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
            Requirements
          </h2>
          <ul className="space-y-1 text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)' }}>
            <li>• Docker & Docker Compose</li>
            <li>• 2GB RAM minimum</li>
            <li>• Reverse proxy (Nginx / Caddy / Traefik)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
            Quick Deploy
          </h2>
          <pre
            className="text-xs font-mono p-3 overflow-x-auto mb-3"
            style={{ backgroundColor: 'var(--brutal-surface)', border: '1px solid var(--brutal-border)', color: 'var(--brutal-text-secondary)' }}
          >
{`git clone https://github.com/yaolinhui/sparkbin.git
cd sparkbin
cp backend/.env.example backend/.env
# Edit backend/.env
docker-compose up -d`}
          </pre>
        </section>

        <section>
          <h2 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
            Environment Variables
          </h2>
          <p className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
            See <a href="https://github.com/yaolinhui/sparkbin/blob/main/SELF_HOSTING.md" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--brutal-accent)' }}>SELF_HOSTING.md</a> for the complete list of environment variables and their descriptions.
          </p>
        </section>
      </div>
    </div>
  );
}
