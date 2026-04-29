export default function FAQPage() {
  const faqs = [
    {
      q: 'Is SparkBin free?',
      a: 'Self-hosted is completely free under MIT License. Cloud has a free tier with up to 3 projects.',
    },
    {
      q: 'Can I use my own API key?',
      a: 'Yes. Both Cloud and Self-hosted support bringing your own API key for AI providers.',
    },
    {
      q: 'What data is stored?',
      a: 'Project data, workflow stage progress, and AI chat history. Self-hosted stores everything locally.',
    },
    {
      q: 'How do I contribute?',
      a: 'See the Contributing Guide on GitHub. We welcome issues, PRs, and feature discussions.',
    },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-4" style={{ color: 'var(--brutal-text)' }}>
        FAQ
      </h1>
      <p className="text-sm font-mono mb-6" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
        Frequently asked questions about SparkBin.
      </p>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="border-2 p-4"
            style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-surface)' }}
          >
            <h3 className="text-sm font-mono font-bold mb-2" style={{ color: 'var(--brutal-text)' }}>
              Q: {faq.q}
            </h3>
            <p className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
              A: {faq.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
