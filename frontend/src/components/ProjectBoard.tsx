import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Terminal, LogOut, Server, Settings, Cat, ChevronDown, ChevronRight, Lock, User } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { GitHubImportModal } from './GitHubImportModal';
import { useProjectStore } from '../stores/projectStore';
import { useAIStore } from '../stores/aiStore';
import { isAdmin, getUserId, authApi, isAuthenticated } from '../services/api';
import { useI18n } from '../i18n/hooks';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ModelSelector } from './ModelSelector';
import { AIPetConfig } from './AIPetConfig';
import { PixelPet } from './PixelPet';
import { PIXEL_PET_CATALOG } from './PixelPet.frames';
import { ChangePasswordModal } from './ChangePasswordModal';
import { UpgradePromptModal } from './UpgradePromptModal';
import { PET_OPTIONS, PERSONALITY_OPTIONS, getContextDialogue } from './AIPetConfig.constants';
import type { AIPetConfig as AIPetConfigType } from '../types';

interface ProjectBoardProps {
  onLogout: () => void;
}

// Data Display Component - Brutalist Style
function DataDisplay({
  value,
  label,
  unit = '',
  isActive = false,
  onClick
}: {
  value: string | number;
  label: string;
  unit?: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`border p-3 cursor-pointer transition-colors ${
        isActive
          ? 'border-brutal-accent bg-brutal-accent/10'
          : 'border-brutal-border bg-brutal-surface hover:bg-brutal-surface-hover'
      }`}
    >
      <div className="text-2xl font-mono font-bold text-brutal-text">
        {value}<span className="text-brutal-accent">{unit}</span>
      </div>
      <div className="text-xs font-mono uppercase tracking-wider text-brutal-muted mt-1">
        {label}
      </div>
    </div>
  );
}

// Section Header - Code Comment Style
function SectionHeader({ title, index }: { title: string; index: number }) {
  return (
    <div className="flex items-center gap-4 my-6">
      <span className="text-brutal-muted font-mono text-xs">// {title}</span>
      <div className="flex-1 h-px bg-brutal-border" />
      <span className="text-brutal-muted font-mono text-xs">{String(index).padStart(3, '0')}</span>
    </div>
  );
}

export function ProjectBoard({ onLogout }: ProjectBoardProps) {
  const { t } = useI18n();
  const stageLabelMap: Record<string, string> = {
    idea: t('stage.idea'),
    validate: t('stage.validate'),
    prototype: t('stage.prototype'),
    ship: t('stage.ship'),
    grow: t('stage.grow'),
    monetize: t('stage.monetize'),
  };
  const projects = useProjectStore((state) => state.projects);
  const isLoading = useProjectStore((state) => state.isLoading);
  const error = useProjectStore((state) => state.error);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const lastSyncAt = useProjectStore((state) => state.lastSyncAt);
  const checkAIConfig = useAIStore((state) => state.checkConfiguration);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isPetConfigOpen, setIsPetConfigOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [showPetBubble, setShowPetBubble] = useState(false);
  const [petDialogue, setPetDialogue] = useState('');
  const petConfigKey = `sparkbin_pet_config_${getUserId() || 'guest'}`;
  const [petConfig, setPetConfig] = useState<AIPetConfigType | null>(() => {
    const saved = localStorage.getItem(petConfigKey);
    return saved ? JSON.parse(saved) : null;
  });
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all');
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [quota, setQuota] = useState<{
    ai_calls_used_this_month: number;
    ai_calls_limit: number;
    projects_used: number;
    projects_limit: number | null;
  } | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  // 初始加载（仅执行一次，避免 store action 引用变化导致重复请求）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchProjects();
    checkAIConfig(); // 检查 AI 配置状态

    // 如果已登录，从后端加载宠物配置和配额
    if (isAuthenticated()) {
      authApi.getMe()
        .then((data) => {
          if (data.pet_config) {
            const config: AIPetConfigType = {
              type: data.pet_config.type as AIPetConfigType['type'],
              name: data.pet_config.name,
              personality: data.pet_config.personality as AIPetConfigType['personality'],
              verbosity: data.pet_config.verbosity as AIPetConfigType['verbosity'],
            };
            setPetConfig(config);
            localStorage.setItem(petConfigKey, JSON.stringify(config));
          }
          if (data.quota) {
            setQuota(data.quota);
          }
          if (data.oauth_provider) {
            setOauthProvider(data.oauth_provider);
          }
        })
        .catch(() => {
          // 失败时保持 localStorage 的值
        });
    }

    // 检查是否刚从 GitHub OAuth 连接成功返回
    if (sessionStorage.getItem('sparkbin_github_connected') === '1') {
      sessionStorage.removeItem('sparkbin_github_connected');
      setIsGitHubModalOpen(true);
    }

    // 检查是否刚从 OAuth 绑定成功返回
    if (sessionStorage.getItem('sparkbin_oauth_bind_success') === '1') {
      sessionStorage.removeItem('sparkbin_oauth_bind_success');
      showToast('第三方账号绑定成功', 'success');
      // 刷新 OAuth 状态
      authApi.getMe()
        .then((data) => {
          if (data.oauth_provider) {
            setOauthProvider(data.oauth_provider);
          }
        })
        .catch(() => {});
    }
  // petConfigKey 由 userId 派生，登录后不会改变；showToast 是稳定引用
  // fetchProjects / checkAIConfig 来自 Zustand，首次挂载时即确定
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stats
  const { activeProjects, archivedProjects, pausedProjects } = useMemo(() => {
    const active = projects.filter((p) => p.status === 'active');
    const archived = projects.filter((p) => p.status === 'archived');
    const paused = projects.filter((p) => p.status === 'paused');

    return {
      activeProjects: active,
      archivedProjects: archived,
      pausedProjects: paused,
    };
  }, [projects]);

  // 按创建时间排序（最早的在前，用于序号001,002...）
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [projects]);

  // Filtered projects based on selected filter
  const { filteredProjects, filteredArchived } = useMemo(() => {
    switch (filter) {
      case 'active':
        return { filteredProjects: sortedProjects.filter((p) => p.status === 'active'), filteredArchived: [] };
      case 'paused':
        return { filteredProjects: sortedProjects.filter((p) => p.status === 'paused'), filteredArchived: [] };
      case 'archived':
        return { filteredProjects: [], filteredArchived: sortedProjects.filter((p) => p.status === 'archived') };
      default: // 'all' - show all non-archived + archived separately
        return {
          filteredProjects: sortedProjects.filter((p) => p.status !== 'archived'),
          filteredArchived: sortedProjects.filter((p) => p.status === 'archived')
        };
    }
  }, [sortedProjects, filter]);

  const formatLastSync = () => {
    if (!lastSyncAt) return t('status.never_synced');
    const date = new Date(lastSyncAt);
    return date.toISOString().replace('T', ' ').slice(0, 19);
  };

  const getSystemStatus = () => {
    if (isLoading) return { text: t('status.syncing'), color: 'text-brutal-warning' };
    return { text: 'ONLINE', color: 'text-brutal-success' };
  };

  const status = getSystemStatus();

  // 宠物配置
  const selectedPet = PET_OPTIONS.find(p => p.id === petConfig?.type) || PET_OPTIONS[0];
  const petName = petConfig?.name || selectedPet.name;
  const petColor = selectedPet.color;
  const petFrames = PIXEL_PET_CATALOG[petConfig?.type || 'cat'] || PIXEL_PET_CATALOG['cat'];

  // 点击宠物显示问候（上下文感知）
  const [isPetBouncing, setIsPetBouncing] = useState(false);
  const handlePetClick = () => {
    setIsPetBouncing(true);

    // 计算项目上下文
    const currentStageKey = (activeProjects[0]?.currentStage || 'idea') as import('../types').StageKey;
    const currentStageName = stageLabelMap[currentStageKey] || currentStageKey;
    const currentProject = activeProjects[0];
    const currentStageData = currentProject?.stages?.[currentStageKey];
    const stageContent = currentStageData?.content || '';
    const isStageEmpty = !stageContent || stageContent.length < 20;
    const completedStagesCount = Object.values(currentProject?.stages || {}).filter((s: import('../types').Stage) => s?.completedAt).length;
    const hasWarnings = currentProject ?
      Object.entries(currentProject.stages || {}).some(([, stage]: [string, import('../types').Stage]) => {
        if (!stage?.isLocked) return false;
        const text = stage?.content || '';
        return text.length < 20;
      }) || isStageEmpty
      : false;

    const dialogue = getContextDialogue(
      petConfig?.type || 'cat',
      petConfig?.personality || 'gentle',
      {
        currentStage: currentStageKey,
        stageName: currentStageName,
        isStageEmpty,
        completedStages: completedStagesCount,
        totalStages: 6,
        projectStatus: currentProject?.status || 'active',
        hasWarnings,
      }
    );

    setPetDialogue(dialogue);
    setShowPetBubble(true);
    setTimeout(() => {
      setShowPetBubble(false);
      setIsPetBouncing(false);
    }, 4500);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-brutal-bg text-brutal-text font-mono">
      {/* Header - Terminal Style */}
      <header className="border-b border-brutal-border bg-brutal-surface">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-brutal-accent flex items-center justify-center">
                <Terminal className="w-4 h-4 text-brutal-accent" />
              </div>
              <div>
                <h1 className="text-sm font-mono font-bold tracking-wider">
                  {t('app.title')}<span className="text-brutal-accent">.EXE</span>
                </h1>
                <p className="text-xs text-brutal-muted">{t('app.subtitle')}</p>
              </div>
            </div>

            {/* System Status */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-brutal-muted">{t('system.status')}</div>
                <div className={`text-xs font-mono ${status.color} flex items-center gap-2`}>
                  <span className="status-dot status-online rounded-full"  />
                  {status.text}
                </div>
              </div>

              {quota && quota.projects_limit !== null && quota.projects_limit > 0 && (
                <div className="text-right">
                  <div className="text-xs text-brutal-muted">项目配额</div>
                  <div className={`text-xs font-mono ${quota.projects_used >= quota.projects_limit ? 'text-brutal-warning' : 'text-brutal-text'}`}>
                    {quota.projects_used} / {quota.projects_limit}
                  </div>
                </div>
              )}

              <div className="text-right">
                <div className="text-xs text-brutal-muted">{t('system.last_sync')}</div>
                <div className="text-xs font-mono text-brutal-text">{formatLastSync()}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <ThemeSwitcher />
                <LanguageSwitcher />
                <button
                  type="button"
                  onClick={() => setIsPetConfigOpen(true)}
                  className="btn-brutal h-9 flex items-center gap-2"
                  title="AI 宠物配置"
                >
                  <Cat className="w-4 h-4" />
                  <span className="text-xs font-mono">宠物</span>
                </button>
                {isAdmin() && (
                  <Link
                    to="/admin"
                    className="btn-brutal h-9 flex items-center gap-2"
                    title="系统管理"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-xs font-mono">管理</span>
                  </Link>
                )}
                <ModelSelector />
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="btn-brutal h-9 flex items-center gap-2"
                  title="修改密码"
                >
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-mono">改密</span>
                </button>
                <Link
                  to="/profile"
                  className="btn-brutal h-9 flex items-center gap-2"
                  title="个人资料"
                >
                  <User className="w-4 h-4" />
                  <span className="text-xs font-mono">资料</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="btn-brutal h-9 flex items-center gap-2"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="border-t border-brutal-border px-6 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DataDisplay
              value={projects.length}
              label={t('system.total_projects')}
              isActive={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <DataDisplay
              value={activeProjects.length}
              label={t('project.active_projects')}
              isActive={filter === 'active'}
              onClick={() => setFilter('active')}
            />
            <DataDisplay
              value={pausedProjects.length}
              label={t('project.paused_projects')}
              isActive={filter === 'paused'}
              onClick={() => setFilter('paused')}
            />
            <DataDisplay
              value={archivedProjects.length}
              label={t('section.archived_projects')}
              isActive={filter === 'archived'}
              onClick={() => setFilter('archived')}
            />
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`px-4 py-2 border-2 font-mono text-sm shadow-lg
              ${toast.type === 'success' ? 'border-brutal-success bg-brutal-bg text-brutal-success' : ''}
              ${toast.type === 'error' ? 'border-brutal-warning bg-brutal-bg text-brutal-warning' : ''}
              ${toast.type === 'info' ? 'border-brutal-accent bg-brutal-bg text-brutal-accent' : ''}
            `}
          >
            <div className="flex items-center gap-2">
              <span>{toast.message}</span>
              <button type="button" onClick={hideToast} className="text-xs opacity-60 hover:opacity-100">×</button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-3 border-b border-brutal-warning bg-brutal-warning/10">
          <div className="flex items-center gap-2 text-brutal-warning text-sm font-mono">
            <span className="font-bold">ERROR:</span>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchProjects()}
              className="ml-auto underline hover:no-underline"
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6">
        {/* Backend Mode Badge */}
        <div className="mb-4 p-2 border border-brutal-accent bg-brutal-accent/5 text-xs font-mono flex items-center gap-2">
          <Server className="w-3 h-3 text-brutal-accent" />
          <span className="text-brutal-accent">BACKEND MODE</span>
          <span className="text-brutal-muted">|</span>
          <span className="text-brutal-muted">Data stored in PostgreSQL</span>
        </div>

        {/* Filter Status */}
        {filter !== 'all' && (
          <div className="mb-4 p-2 border border-brutal-accent bg-brutal-accent/10 text-sm font-mono">
            <span className="text-brutal-muted">// FILTER: </span>
            <span className="text-brutal-accent uppercase">{filter}</span>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="ml-4 text-xs text-brutal-muted hover:text-brutal-text underline"
            >
              [CLEAR]
            </button>
          </div>
        )}

        {/* Filtered Projects */}
        {(filteredProjects.length > 0 || filter === 'all') && (
          <>
            <SectionHeader
              title={filter === 'all' ? t('section.active_projects') : `FILTERED: ${filter}`}
              index={1}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                />
              ))}
              {/* 添加新项目卡片 */}
              {filter !== 'archived' && (
                <button
                  type="button"
                  onClick={() => {
                    const canCreate =
                      !quota ||
                      quota.projects_limit === null ||
                      quota.projects_used < quota.projects_limit;
                    if (canCreate) {
                      setIsCreateModalOpen(true);
                    } else {
                      setShowUpgradeModal(true);
                    }
                  }}
                  className="bg-brutal-surface border-2 border-dashed border-brutal-border p-4 cursor-pointer
                           hover:border-brutal-accent hover:bg-brutal-accent/5
                           transition-all flex flex-col items-center justify-center min-h-[200px]"
                >
                  <div className="w-12 h-12 border-2 border-brutal-border rounded-full flex items-center justify-center mb-3
                                group-hover:border-brutal-accent">
                    <Plus className="w-6 h-6 text-brutal-muted" />
                  </div>
                  <span className="text-sm font-mono text-brutal-muted">添加新项目</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* Archived Projects - only show when filter === 'all' */}
        {filter === 'all' && filteredArchived.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setIsArchivedExpanded((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2 my-6 border border-brutal-border bg-brutal-bg hover:bg-brutal-surface-hover transition-colors group"
            >
              <span className="text-brutal-muted group-hover:text-brutal-text transition-colors">
                {isArchivedExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </span>
              <span className="text-brutal-muted font-mono text-xs">// {t('section.archived_projects')}</span>
              <div className="flex-1 h-px bg-brutal-border opacity-50" />
              <span className="text-brutal-muted font-mono text-xs">{String(filteredArchived.length).padStart(3, '0')}</span>
            </button>
            {isArchivedExpanded && (
              <div className="space-y-px border border-brutal-border" style={{ backgroundColor: 'var(--brutal-border)' }}>
                {filteredArchived.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={filteredProjects.length + index}
                    compact
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Filtered Archived - only when filter === 'archived' */}
        {filter === 'archived' && filteredArchived.length > 0 && (
          <>
            <SectionHeader title={t('section.archived_projects')} index={1} />
            <div className="space-y-px border border-brutal-border" style={{ backgroundColor: 'var(--brutal-border)' }}>
              {filteredArchived.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  compact
                />
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {(filter === 'all'
          ? projects.length === 0
          : filter === 'archived'
            ? filteredArchived.length === 0
            : filteredProjects.length === 0
        ) && (
          <div className="border border-brutal-border bg-brutal-surface p-12 text-center mt-6">
            <div className="text-6xl mb-4 opacity-30">&gt;_</div>
            <h3 className="text-sm font-mono uppercase tracking-wider mb-2">
              {filter === 'all' ? t('project.no_projects') : `No ${filter} projects found`}
            </h3>
            <p className="text-brutal-muted text-sm mb-6">
              {filter === 'all' ? t('project.create_first') : 'Try selecting a different filter'}
            </p>
            <div className="text-xs text-brutal-muted font-mono">
              {'>'} {t('project.awaiting_input')}
              <span className="animate-blink">_</span>
            </div>
          </div>
        )}
      </main>

      {/* AI Pet - Fixed Bottom Right */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2">
        {/* 对话气泡 */}
        {showPetBubble && (
          <div className="mb-2 relative"
          >
            <div
              className="px-4 py-3 rounded-2xl text-sm font-mono text-center max-w-[200px]"
              style={{
                backgroundColor: petColor,
                color: 'var(--brutal-bg)',
                border: '2px solid var(--brutal-text)',
                boxShadow: '4px 4px 0px var(--brutal-text)',
              }}
            >
              {petDialogue}
            </div>
            {/* 气泡尾巴 */}
            <div
              className="absolute -bottom-2 right-6 w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: `8px solid ${petColor}`,
              }}
            />
          </div>
        )}

        {/* 宠物按钮 */}
        <button
          type="button"
          onClick={handlePetClick}
          onDoubleClick={() => setIsPetConfigOpen(true)}
          className={`relative w-16 h-16 bg-brutal-bg rounded-lg
                     transition-all duration-200
                     flex items-center justify-center
                     hover:scale-105 hover:shadow-lg ${
                       isPetBouncing ? 'scale-110' : 'animate-pulse-slow'
                     }`}
          style={{ boxShadow: '2px 2px 8px rgba(0,0,0,0.15)' }}
          title={`${petName} - 单击互动 / 双击配置`}
        >
          <PixelPet frames={petFrames} scale={2} animation="idle" />
          {/* 性格装饰 */}
          {(() => {
            const P = PERSONALITY_OPTIONS.find(p => p.id === petConfig?.personality);
            return P ? (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-brutal-bg border border-brutal-border rounded-full"
              >
                <P.icon className="w-3 h-3" style={{ color: P.color }} />
              </span>
            ) : null;
          })()}
        </button>

        {/* 配置按钮 */}
        <button
          type="button"
          onClick={() => setIsPetConfigOpen(true)}
          className="text-[10px] text-brutal-muted hover:text-brutal-accent font-mono transition-colors"
        >
          双击宠物也可配置
        </button>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onImportFromGitHub={() => setIsGitHubModalOpen(true)}
      />
      <GitHubImportModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onSuccess={() => setIsChangePasswordOpen(false)}
        onClose={() => setIsChangePasswordOpen(false)}
      />
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="projects"
      />

      {/* 账号设置模态框 */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md border-2 border-brutal-border bg-brutal-surface p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider">账号设置</h2>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="text-brutal-muted hover:text-brutal-text text-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* 第三方账号绑定 */}
              <div className="border border-brutal-border p-4">
                <div className="text-xs font-mono text-brutal-muted mb-3 uppercase tracking-wider">
                  第三方账号绑定
                </div>

                {/* Google */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm font-mono">Google</span>
                  </div>
                  {oauthProvider === 'google' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await authApi.unbindOAuth('google');
                          setOauthProvider(null);
                          showToast('Google 账号已解绑', 'success');
                        } catch (e: unknown) {
                          const msg = e instanceof Error ? e.message : '解绑失败';
                          showToast(msg, 'error');
                        }
                      }}
                      className="text-xs font-mono px-3 py-1 border border-brutal-warning text-brutal-warning hover:bg-brutal-warning hover:text-brutal-bg transition-colors"
                    >
                      解绑
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = authApi.getOAuthBindUrl('google');
                      }}
                      className="text-xs font-mono px-3 py-1 border border-brutal-accent text-brutal-accent hover:bg-brutal-accent hover:text-brutal-bg transition-colors"
                    >
                      绑定
                    </button>
                  )}
                </div>

                {/* GitHub */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span className="text-sm font-mono">GitHub</span>
                  </div>
                  {oauthProvider === 'github' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await authApi.unbindOAuth('github');
                          setOauthProvider(null);
                          showToast('GitHub 账号已解绑', 'success');
                        } catch (e: unknown) {
                          const msg = e instanceof Error ? e.message : '解绑失败';
                          showToast(msg, 'error');
                        }
                      }}
                      className="text-xs font-mono px-3 py-1 border border-brutal-warning text-brutal-warning hover:bg-brutal-warning hover:text-brutal-bg transition-colors"
                    >
                      解绑
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = authApi.getOAuthBindUrl('github');
                      }}
                      className="text-xs font-mono px-3 py-1 border border-brutal-accent text-brutal-accent hover:bg-brutal-accent hover:text-brutal-bg transition-colors"
                    >
                      绑定
                    </button>
                  )}
                </div>

                {oauthProvider && (
                  <div className="text-[10px] font-mono text-brutal-muted mt-2">
                    当前已绑定: {oauthProvider}
                  </div>
                )}
                {!oauthProvider && (
                  <div className="text-[10px] font-mono text-brutal-muted mt-2">
                    未绑定第三方账号
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 退出登录确认对话框 —— 宠物挽留版 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm border-2 border-brutal-border bg-brutal-surface p-6 flex flex-col items-center">
            {/* 宠物挽留对话气泡 */}
            <div className="mb-4 relative self-stretch">
              <div
                className="px-4 py-3 text-sm font-mono text-center"
                style={{
                  backgroundColor: petColor,
                  color: 'var(--brutal-bg)',
                  border: '2px solid var(--brutal-text)',
                  boxShadow: '4px 4px 0px var(--brutal-text)',
                }}
              >
                {getContextDialogue(
                  petConfig?.type || 'cat',
                  petConfig?.personality || 'gentle',
                  { isLeaving: true }
                )}
              </div>
              {/* 气泡尾巴 */}
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: `8px solid ${petColor}`,
                }}
              />
            </div>

            {/* 宠物动画 */}
            <div className="w-20 h-20 flex items-center justify-center mb-4">
              <PixelPet frames={petFrames} scale={3} animation="idle" />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-brutal-accent text-brutal-bg font-mono font-bold
                           border-2 border-brutal-accent
                           hover:bg-brutal-bg hover:text-brutal-accent
                           transition-colors
                           active:translate-x-[2px] active:translate-y-[2px]"
              >
                留下陪我
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-3 bg-brutal-bg text-brutal-text font-mono font-bold
                           border-2 border-brutal-border
                           hover:border-brutal-accent hover:text-brutal-accent
                           transition-colors
                           active:translate-x-[2px] active:translate-y-[2px]"
              >
                狠心离开
              </button>
            </div>
          </div>
        </div>
      )}

      {isPetConfigOpen && (
        <AIPetConfig
          config={petConfig}
          onSave={async (config: AIPetConfigType) => {
            if (isAuthenticated()) {
              try {
                await authApi.updatePetConfig(config);
                setPetConfig(config);
                localStorage.setItem(petConfigKey, JSON.stringify(config));
              } catch {
                // 后端保存失败，不更新本地状态
              }
            } else {
              setPetConfig(config);
              localStorage.setItem(petConfigKey, JSON.stringify(config));
            }
          }}
          onClose={() => setIsPetConfigOpen(false)}
        />
      )}
    </div>
  );
}

export default ProjectBoard;
