export default function WorkflowPage() {
  const stages = [
    { num: '01', label: 'IDEA', desc: 'Capture inspiration, assess feasibility, generate competitive analysis with AI.' },
    { num: '02', label: 'VALIDATE', desc: 'GO/NO-GO decision framework. Validate demand before building.' },
    { num: '03', label: 'PROTOTYPE', desc: 'AI-assisted MVP planning, tech stack recommendations, launch copy.' },
    { num: '04', label: 'SHIP', desc: 'Project management board with launch checklist.' },
    { num: '05', label: 'GROW', desc: 'Multi-platform content matrix, growth experiment tracking.' },
    { num: '06', label: 'MONETIZE', desc: 'Pricing strategy simulator, revenue forecasting.' },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-4" style={{ color: 'var(--brutal-text)' }}>
        Workflow
      </h1>
      <p className="text-sm font-mono mb-6" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
        SparkBin uses a structured 6-stage workflow designed specifically for indie hackers.
        Each stage has defined entry criteria, tasks, and exit conditions.
      </p>

      <div className="space-y-4">
        {stages.map((stage) => (
          <div
            key={stage.label}
            className="border-2 p-4 flex items-start gap-4"
            style={{ borderColor: 'var(--brutal-border)', backgroundColor: 'var(--brutal-surface)' }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center border text-xs font-mono font-bold"
              style={{ borderColor: 'var(--brutal-accent)', color: 'var(--brutal-accent)' }}
            >
              {stage.num}
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold mb-1" style={{ color: 'var(--brutal-text)' }}>
                {stage.label}
              </h3>
              <p className="text-xs font-mono" style={{ color: 'var(--brutal-text-secondary)', lineHeight: 1.6 }}>
                {stage.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
