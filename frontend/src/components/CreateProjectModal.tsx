import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useAIStore } from '../stores/aiStore';
import { useI18n } from '../i18n';
import { aiService } from '../services/ai';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const { t } = useI18n();
  const [painPoint, setPainPoint] = useState('');
  const [title, setTitle] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);

  const createProject = useProjectStore((state) => state.createProject);
  const isAIConfigured = useAIStore((state) => state.isConfigured);

  if (!isOpen) return null;

  const handleOptimize = async () => {
    if (!painPoint.trim()) return;

    if (!isAIConfigured) {
      setError('Please configure AI API first (Settings → AI Config)');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const result = await aiService.optimizePainPoint(painPoint);

      const titleMatch = result.match(/标题[:：]\s*(.+)/);
      const painPointMatch = result.match(/痛点[:：]\s*(.+)/s);

      if (titleMatch) {
        setTitle(titleMatch[1].trim());
      } else {
        const lines = result.split('\n').filter(line => line.trim());
        setTitle(lines[0].slice(0, 30));
      }

      if (painPointMatch) {
        setPainPoint(painPointMatch[1].trim());
      }

      setStep(2);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('error.optimize_failed');
      setError(errorMessage);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;

    const project = await createProject(title, painPoint);
    if (project) {
      setPainPoint('');
      setTitle('');
      setStep(1);
      setError(null);
      onClose();
    } else {
      setError('Failed to create project');
    }
  };

  const handleClose = () => {
    setPainPoint('');
    setTitle('');
    setStep(1);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/95 flex items-center justify-center z-50 p-4">
      <div className="border border-brutal-border bg-brutal-surface w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border">
          <div>
            <span className="text-xs text-brutal-muted font-mono">// </span>
            <span className="text-sm font-mono font-bold">
              {step === 1 ? t('modal.init_project') : t('modal.confirm_params')}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center
                       hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 border border-brutal-warning text-brutal-warning text-sm font-mono">
              <span className="text-brutal-warning">[{t('ai.error_prefix')}]</span> {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                  {t('modal.input_description')}
                </label>
                <textarea
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value)}
                  placeholder={`>>> ${t('placeholder.describe_pain_point')}`}
                  className="w-full h-32 p-3 border border-brutal-border bg-brutal-bg resize-none
                             focus:border-brutal-accent transition-colors font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleOptimize}
                  disabled={!painPoint.trim() || isOptimizing}
                  className="btn-brutal-primary flex items-center gap-2 flex-1"
                >
                  {isOptimizing ? (
                    <>
                      <div className="w-4 h-4 border border-brutal-bg border-t-transparent animate-spin" />
                      {t('ai.processing')}
                    </>
                  ) : (
                    <>
                      <span className="text-brutal-bg">&gt;</span>
                      {t('action.generate_with_ai')}
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setTitle(painPoint.slice(0, 30));
                    setStep(2);
                  }}
                  disabled={!painPoint.trim()}
                  className="btn-brutal"
                >
                  {t('action.skip')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                  {t('modal.project_title')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border border-brutal-border bg-brutal-bg
                             focus:border-brutal-accent transition-colors font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                  {t('project.description')}
                </label>
                <textarea
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value)}
                  className="w-full h-24 p-3 border border-brutal-border bg-brutal-bg resize-none
                             focus:border-brutal-accent transition-colors font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="btn-brutal flex-1"
                >
                  &lt; {t('nav.back')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!title.trim()}
                  className="btn-brutal-primary flex-1"
                >
                  {t('action.execute')}
                  <ArrowRight className="w-4 h-4 inline ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg">
          <div className="text-xs font-mono text-brutal-muted">
            {step === 1 ? `> ${t('project.awaiting_input')}` : `> ${t('project.ready_to_commit')}`}
            <span className="animate-blink">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}
