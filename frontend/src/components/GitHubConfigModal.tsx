import { useState, useEffect } from 'react';
import { X, Github, ArrowRight } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useI18n } from '../i18n/hooks';

interface GitHubConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GitHubConfigModal({ isOpen, onClose }: GitHubConfigModalProps) {
  const { t } = useI18n();
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [filePath, setFilePath] = useState('data/projects.json');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const githubConfig = useProjectStore((state) => state.githubConfig);
  const setGitHubConfig = useProjectStore((state) => state.setGitHubConfig);
  const loadFromGitHub = useProjectStore((state) => state.loadFromGitHub);

  useEffect(() => {
    if (githubConfig) {
      setToken(githubConfig.token);
      setOwner(githubConfig.owner);
      setRepo(githubConfig.repo);
      setFilePath(githubConfig.filePath);
    }
  }, [githubConfig]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
          },
        }
      );

      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setGitHubConfig({ token, owner, repo, filePath });
    await loadFromGitHub();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="border border-brutal-border bg-brutal-surface w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-brutal-accent" />
            <span className="text-xs text-brutal-muted font-mono">// </span>
            <span className="text-sm font-mono font-bold">{t('github.config')}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center
                       hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              {t('github.token')}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full p-3 border border-brutal-border bg-brutal-bg
                         focus:border-brutal-accent transition-colors font-mono text-sm"
            />
            <p className="text-xs text-brutal-muted mt-1 font-mono">
              {t('github.scope_required')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                {t('github.owner')}
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="username"
                className="w-full p-3 border border-brutal-border bg-brutal-bg
                           focus:border-brutal-accent transition-colors font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                {t('github.repository')}
              </label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="repo-name"
                className="w-full p-3 border border-brutal-border bg-brutal-bg
                           focus:border-brutal-accent transition-colors font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              {t('github.file_path')}
            </label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="data/projects.json"
              className="w-full p-3 border border-brutal-border bg-brutal-bg
                         focus:border-brutal-accent transition-colors font-mono text-sm"
            />
          </div>

          {testResult === 'success' && (
            <div className="p-3 border border-brutal-success text-brutal-success text-sm font-mono">
              <span className="text-brutal-success">[{t('ai.ok_prefix')}]</span> Connection established
            </div>
          )}

          {testResult === 'error' && (
            <div className="p-3 border border-brutal-warning text-brutal-warning text-sm font-mono">
              <span className="text-brutal-warning">[{t('ai.error_prefix')}]</span> {t('error.connection_failed')}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleTest}
              disabled={!token || !owner || !repo || isTesting}
              className="btn-brutal h-9 flex-1"
            >
              {isTesting ? `${t('ai.processing')}` : t('action.test_connection')}
            </button>
            <button
              onClick={handleSave}
              disabled={!token || !owner || !repo}
              className="btn-brutal-primary h-9 flex-1"
            >
              {t('action.save')}
              <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg">
          <div className="text-xs font-mono text-brutal-muted">
            {'>'} CONFIGURE_SYNC_MODULE...
            <span className="animate-blink">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}
