import { useState, useEffect } from 'react';
import { X, Github, ArrowRight, Loader2, Star, GitFork, Check, AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n/hooks';
import { githubApi, authApi, type GitHubRepo, type GitHubImportPreview } from '../services/api';
import { useProjectStore } from '../stores/projectStore';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GitHubImportModal({ isOpen, onClose }: GitHubImportModalProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<'repos' | 'preview' | 'creating'>('repos');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [preview, setPreview] = useState<GitHubImportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const fetchProjects = useProjectStore((state) => state.fetchProjects);

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setStep('repos');
      setRepos([]);
      setSelectedRepo(null);
      setPreview(null);
      setIsLoading(false);
      setError(null);
      setIsConnected(null);
      checkConnection();
    }
  }, [isOpen]);

  const checkConnection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 尝试获取仓库列表，如果未连接会返回 400
      const data = await githubApi.listRepos(1, 1);
      setRepos(data);
      setIsConnected(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not connected') || message.includes('not configured')) {
        setIsConnected(false);
      } else {
        setError(message || 'Failed to fetch repositories');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = authApi.getGitHubConnectUrl();
  };

  const handleSelectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setStep('preview');
    setIsLoading(true);
    setError(null);
    try {
      const [owner, repoName] = repo.full_name.split('/');
      const data = await githubApi.previewImport(owner, repoName);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err) || 'Failed to analyze repository');
      setStep('repos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!selectedRepo || !preview) return;
    setStep('creating');
    setError(null);
    try {
      const [owner, repoName] = selectedRepo.full_name.split('/');
      await githubApi.importProject({
        owner,
        repo: repoName,
        title: preview.title,
        pain_point: preview.pain_point,
        original_idea: preview.original_idea,
        stage: preview.suggested_stage,
        readme_content: preview.readme_excerpt,
      });
      await fetchProjects();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err) || 'Failed to create project');
      setStep('preview');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="border border-brutal-border bg-brutal-surface w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-brutal-accent" />
            <span className="text-sm font-mono font-bold">{t('github.import_title') || '从 GitHub 导入'}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 border border-brutal-warning text-brutal-warning text-sm font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step: repos */}
          {step === 'repos' && (
            <div>
              {isConnected === false && !isLoading && (
                <div className="text-center py-12">
                  <Github className="w-12 h-12 text-brutal-muted mx-auto mb-4" />
                  <p className="text-sm font-mono text-brutal-muted mb-6">
                    {t('github.connect_prompt') || '需要授权访问你的 GitHub 公开仓库'}
                  </p>
                  <button
                    onClick={handleConnect}
                    className="btn-brutal-primary h-10 flex items-center gap-2 mx-auto"
                  >
                    <Github className="w-4 h-4" />
                    <span className="text-xs font-mono">{t('github.connect') || '连接 GitHub'}</span>
                  </button>
                </div>
              )}

              {isConnected === true && repos.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <p className="text-sm font-mono text-brutal-muted">
                    {t('github.no_repos') || '未找到公开仓库'}
                  </p>
                </div>
              )}

              {isConnected === true && repos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-brutal-muted mb-3">
                    {t('github.select_repo') || '选择要导入的仓库'}
                  </p>
                  {repos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => handleSelectRepo(repo)}
                      className="w-full text-left border border-brutal-border bg-brutal-bg p-3 hover:border-brutal-accent hover:bg-brutal-accent/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-brutal-text truncate">
                              {repo.name}
                            </span>
                            {repo.language && (
                              <span className="text-xs font-mono text-brutal-muted">
                                {repo.language}
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-xs font-mono text-brutal-muted mt-1 truncate">
                              {repo.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-brutal-muted flex-shrink-0 ml-4">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {repo.stars}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork className="w-3 h-3" />
                            {repo.forks}
                          </span>
                          <ArrowRight className="w-3 h-3 text-brutal-accent" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-brutal-accent" />
                  <span className="ml-3 text-sm font-mono text-brutal-muted">
                    {t('github.loading_repos') || '加载仓库中...'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step: preview */}
          {step === 'preview' && preview && selectedRepo && (
            <div className="space-y-4">
              <div className="border border-brutal-border bg-brutal-bg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Github className="w-4 h-4 text-brutal-accent" />
                  <span className="text-sm font-mono font-bold">{selectedRepo.full_name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-brutal-muted">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" /> {selectedRepo.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="w-3 h-3" /> {selectedRepo.forks}
                  </span>
                  {selectedRepo.language && (
                    <span>{selectedRepo.language}</span>
                  )}
                </div>
              </div>

              <div className="border border-brutal-border bg-brutal-bg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-brutal-muted uppercase">
                    {t('github.ai_analysis') || 'AI 分析结果'}
                  </span>
                  <span className={`text-xs font-mono px-2 py-0.5 border ${
                    preview.confidence >= 7
                      ? 'border-brutal-success text-brutal-success'
                      : preview.confidence >= 4
                        ? 'border-brutal-warning text-brutal-warning'
                        : 'border-brutal-muted text-brutal-muted'
                  }`}>
                    {t('github.confidence') || '置信度'}: {preview.confidence}/10
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-brutal-muted mb-1">
                      {t('project.title') || '项目标题'}
                    </label>
                    <div className="text-sm font-mono text-brutal-text">{preview.title}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-brutal-muted mb-1">
                      {t('project.pain_point') || '核心痛点'}
                    </label>
                    <div className="text-sm font-mono text-brutal-text">{preview.pain_point}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-brutal-muted mb-1">
                      {t('project.original_idea') || '原始想法'}
                    </label>
                    <div className="text-sm font-mono text-brutal-text">{preview.original_idea}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-brutal-muted mb-1">
                      {t('project.suggested_stage') || '建议阶段'}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-brutal-accent font-bold uppercase">
                        {preview.suggested_stage}
                      </span>
                      {preview.suggested_stage === 'idea' && (
                        <span className="text-xs font-mono text-brutal-muted">{t('stage.idea')}</span>
                      )}
                      {preview.suggested_stage === 'validate' && (
                        <span className="text-xs font-mono text-brutal-muted">{t('stage.validate')}</span>
                      )}
                      {preview.suggested_stage === 'prototype' && (
                        <span className="text-xs font-mono text-brutal-muted">{t('stage.prototype')}</span>
                      )}
                      {preview.suggested_stage === 'ship' && (
                        <span className="text-xs font-mono text-brutal-muted">{t('stage.ship')}</span>
                      )}
                      {preview.suggested_stage === 'grow' && (
                        <span className="text-xs font-mono text-brutal-muted">{t('stage.grow')}</span>
                      )}
                      {preview.suggested_stage === 'monetize' && (
                        <span className="text-xs font-mono text-brutal-muted">{t('stage.monetize')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('repos'); setSelectedRepo(null); setPreview(null); }}
                  className="btn-brutal h-10 flex-1"
                >
                  {t('action.back') || '返回'}
                </button>
                <button
                  onClick={handleCreateProject}
                  className="btn-brutal-primary h-10 flex-1 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {t('action.confirm_create') || '确认创建'}
                </button>
              </div>
            </div>
          )}

          {/* Step: creating */}
          {step === 'creating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brutal-accent mb-4" />
              <p className="text-sm font-mono text-brutal-muted">
                {t('github.creating_project') || '正在创建项目...'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg flex-shrink-0">
          <div className="text-xs font-mono text-brutal-muted">
            {'>'} GITHUB_IMPORT_MODULE...
            <span className="animate-blink">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}
