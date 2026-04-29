export default function GettingStartedPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-4" style={{ color: 'var(--brutal-text)' }}>
        Getting Started
      </h1>
      <p className="text-sm font-mono mb-6" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
        This guide walks you through creating your first project in SparkBin and understanding the core concepts.
      </p>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
            1. Create an Account
          </h2>
          <p className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
            Sign up with email, GitHub, or use the default admin account in self-hosted mode.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
            2. Create Your First Project
          </h2>
          <p className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
            Click &quot;New Project&quot; on the dashboard. Give it a name and optionally a description.
            The project starts at Stage 1: IDEA.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
            3. Configure AI Backend
          </h2>
          <p className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
            Go to Settings &gt; AI Config and add your API key for DeepSeek, Kimi, Doubao, or OpenAI.
            Self-hosted users can also use the built-in proxy.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
            4. Start the Workflow
          </h2>
          <p className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
            Use the AI coach to guide you through each stage. Complete the stage checklist to advance.
          </p>
        </section>
      </div>
    </div>
  );
}
