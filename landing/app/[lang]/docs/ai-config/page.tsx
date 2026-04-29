export default function AIConfigPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-4" style={{ color: 'var(--brutal-text)' }}>
        AI Configuration
      </h1>
      <p className="text-sm font-mono mb-6" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
        SparkBin supports multiple AI backends. Configure your preferred provider to power the AI coach and content generation features.
      </p>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
            Supported Providers
          </h2>
          <ul className="space-y-2">
            {['DeepSeek', 'Kimi (Moonshot)', 'Doubao (ByteDance)', 'OpenAI'].map((provider) => (
              <li
                key={provider}
                className="text-xs font-mono px-3 py-2 border"
                style={{ borderColor: 'var(--brutal-border)', color: 'var(--brutal-text-secondary)' }}
              >
                {provider}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
            Configuration
          </h2>
          <p className="text-xs font-mono mb-3" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
            In your <code style={{ backgroundColor: 'var(--brutal-bg)', padding: '0.125rem 0.375rem', border: '1px solid var(--brutal-border)' }}>.env</code> file or via the Settings page:
          </p>
          <pre
            className="text-xs font-mono p-3 overflow-x-auto"
            style={{ backgroundColor: 'var(--brutal-surface)', border: '1px solid var(--brutal-border)', color: 'var(--brutal-text-secondary)' }}
          >
{`# Example: DeepSeek
AI_PROVIDER=deepseek
AI_API_KEY=your-api-key
AI_BASE_URL=https://api.deepseek.com/v1

# Example: OpenAI
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com/v1`}
          </pre>
        </section>

        <section>
          <h2 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
            Self-Hosted AI Proxy
          </h2>
          <p className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
            Self-hosted deployments can use the built-in AI proxy to manage API keys securely on the server side,
            preventing key exposure to the client.
          </p>
        </section>
      </div>
    </div>
  );
}
