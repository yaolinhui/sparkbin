import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Terminal, LogOut, Server, Settings, ChevronDown, ChevronRight, User } from 'lucide-react';
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
import { PetHabitat } from './PetHabitat';
import { PixelPet } from './PixelPet';
import { PIXEL_PET_CATALOG } from './PixelPet.frames';
import { PET_OPTIONS, getContextDialogue } from './AIPetConfig.constants';
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
  const [petDialogue, setPetDialogue] = useState('');
  const petConfigKey = `sparkbin_pet_config_${getUserId() || 'guest'}`;
  const [petConfig, setPetConfig] = useState<AIPetConfigType | null>(() => {
    const saved = localStorage.getItem(petConfigKey);
    return saved ? JSON.parse(saved) : null;
  });
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all');
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // 初始加载（仅执行一次，避免 store action 引用变化导致重复请求）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchProjects();
    checkAIConfig(); // 检查 AI 配置状态

    // 如果已登录，从后端加载宠物配置
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
    setTimeout(() => {
      setIsPetBouncing(false);
    }, 300);
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

              <div className="text-right">
                <div className="text-xs text-brutal-muted">{t('system.last_sync')}</div>
                <div className="text-xs font-mono text-brutal-text">{formatLastSync()}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <ThemeSwitcher />
                <LanguageSwitcher />
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
                <Link
                  to="/profile"
                  className="btn-brutal h-9 flex items-center gap-2"
                  title="个人账户"
                >
                  <User className="w-4 h-4" />
                  <span className="text-xs font-mono">账户</span>
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
          <span className="text-brutal-accent">SELF-HOSTED MODE</span>
          <span className="text-brutal-muted">|</span>
          <span className="text-brutal-muted">Data stored in SQLite</span>
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
                    setIsCreateModalOpen(true);
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

      {/* AI Pet - Pixel Glass Habitat */}
      <PetHabitat
        petFrames={petFrames}
        petName={petName}
        personality={petConfig?.personality}
        dialogue={petDialogue}
        onPetClick={handlePetClick}
        onPetDoubleClick={() => setIsPetConfigOpen(true)}
        isBouncing={isPetBouncing}
      />

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

      {/* 退出登录确认对话框 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm border-2 border-brutal-border bg-brutal-surface p-6">
            <h3 className="text-sm font-mono font-bold mb-4">确认退出登录？</h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-brutal-bg text-brutal-text font-mono font-bold
                           border-2 border-brutal-border hover:border-brutal-accent hover:text-brutal-accent transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 py-3 bg-brutal-warning text-brutal-bg font-mono font-bold
                           border-2 border-brutal-warning hover:bg-brutal-bg hover:text-brutal-warning transition-colors"
              >
                确认退出
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
            }
            setPetConfig(config);
            localStorage.setItem(petConfigKey, JSON.stringify(config));
          }}
          onClose={() => setIsPetConfigOpen(false)}
        />
      )}
    </div>
  );
}

export default ProjectBoard;
