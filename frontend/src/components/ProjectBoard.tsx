import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Github, Terminal, LogOut, Server, Settings, Cat } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useAIStore } from '../stores/aiStore';
import { isAdmin } from '../services/api';
import { useI18n } from '../i18n';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { GitHubConfigModal } from './GitHubConfigModal';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ModelSelector } from './ModelSelector';
import { AIPetConfig } from './AIPetConfig';
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
  const navigate = useNavigate();
  const { t } = useI18n();
  const projects = useProjectStore((state) => state.projects);
  const isLoading = useProjectStore((state) => state.isLoading);
  const error = useProjectStore((state) => state.error);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const lastSyncAt = useProjectStore((state) => state.lastSyncAt);
  const checkAIConfig = useAIStore((state) => state.checkConfiguration);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPetConfigOpen, setIsPetConfigOpen] = useState(false);
  const [petConfig, setPetConfig] = useState<AIPetConfigType | null>(() => {
    const saved = localStorage.getItem('sparkbin_pet_config');
    return saved ? JSON.parse(saved) : null;
  });
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all');

  // 初始加载
  useEffect(() => {
    fetchProjects();
    checkAIConfig(); // 检查 AI 配置状态
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

  return (
    <div className="min-h-screen bg-brutal-bg text-brutal-text font-mono">
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
                  <span className="status-dot status-online" style={{ borderRadius: '50%' }} />
                  {status.text}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-brutal-muted">{t('system.last_sync')}</div>
                <div className="text-xs font-mono text-brutal-text">{formatLastSync()}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
                <button
                  onClick={() => setIsPetConfigOpen(true)}
                  className="btn-brutal flex items-center gap-2"
                  title="AI 宠物配置"
                >
                  <Cat className="w-4 h-4" />
                  <span className="text-xs font-mono">宠物</span>
                </button>
                {isAdmin() && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="btn-brutal flex items-center gap-2"
                    title="系统管理"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-xs font-mono">管理</span>
                  </button>
                )}
                <ModelSelector />
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="btn-brutal flex items-center gap-2"
                  title="GitHub Backup"
                >
                  <Github className="w-4 h-4" />
                </button>
                <button
                  onClick={onLogout}
                  className="btn-brutal flex items-center gap-2 border-brutal-warning text-brutal-warning"
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
          <div className="grid grid-cols-4 gap-4">
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

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-3 border-b border-brutal-warning bg-brutal-warning/10">
          <div className="flex items-center gap-2 text-brutal-warning text-sm font-mono">
            <span className="font-bold">ERROR:</span>
            <span>{error}</span>
            <button
              onClick={() => fetchProjects()}
              className="ml-auto underline hover:no-underline"
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-6">
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
              onClick={() => setFilter('all')}
              className="ml-4 text-xs text-brutal-muted hover:text-brutal-text underline"
            >
              [CLEAR]
            </button>
          </div>
        )}

        {/* Filtered Projects */}
        {filteredProjects.length > 0 && (
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
            </div>
          </>
        )}

        {/* Archived Projects - only show when filter === 'all' */}
        {filter === 'all' && filteredArchived.length > 0 && (
          <>
            <SectionHeader title={t('section.archived_projects')} index={2} />
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
          <div className="border border-brutal-border bg-brutal-surface p-12 text-center">
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

      {/* Add Button - Brutalist Style */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 border-2 border-brutal-accent bg-brutal-bg text-brutal-accent
                   hover:bg-brutal-accent hover:text-brutal-bg
                   transition-colors duration-75
                   flex items-center justify-center"
        style={{ boxShadow: '4px 4px 0px var(--brutal-accent)' }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <GitHubConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
      {isPetConfigOpen && (
        <AIPetConfig
          config={petConfig}
          onSave={(config: AIPetConfigType) => {
            setPetConfig(config);
            localStorage.setItem('sparkbin_pet_config', JSON.stringify(config));
          }}
          onClose={() => setIsPetConfigOpen(false)}
        />
      )}
    </div>
  );
}
