import { useNavigate } from 'react-router-dom';
import { Pause, Archive, ArrowRight, Calendar } from 'lucide-react';
import { useI18n, useStageLabel, useStatusLabel } from '../i18n';
import type { Project } from '../types';
import { type StageKey } from '../types';

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;

  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface ProjectCardProps {
  project: Project;
  index: number;
  compact?: boolean;
}

const STAGE_NUMBERS: Record<StageKey, string> = {
  idea: '01',
  validate: '02',
  prototype: '03',
  ship: '04',
  grow: '05',
  monetize: '06',
};

export function ProjectCard({ project, index, compact }: ProjectCardProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const stageLabel = useStageLabel(project.currentStage);
  const statusLabel = useStatusLabel(project.status);

  const getStatusIndicator = () => {
    switch (project.status) {
      case 'paused':
        return (
          <span className="flex items-center gap-2 text-brutal-warning text-xs">
            <Pause className="w-3 h-3" />
            {statusLabel}
          </span>
        );
      case 'archived':
        return (
          <span className="flex items-center gap-2 text-brutal-muted text-xs">
            <Archive className="w-3 h-3" />
            {statusLabel}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-2 text-brutal-success text-xs">
            <span className="status-dot status-online" style={{ borderRadius: '50%' }} />
            {statusLabel}
          </span>
        );
    }
  };

  const completedStagesCount = Object.values(project.stages).filter(
    (s) => s.isLocked
  ).length;

  const progressPercent = Math.round((completedStagesCount / 6) * 100);

  if (compact) {
    return (
      <div
        className="bg-brutal-surface p-3 flex items-center justify-between cursor-pointer
                   hover:brightness-95 transition-all"
        onClick={() => navigate(`/project/${project.id}`)}
      >
        <div className="flex items-center gap-4">
          <span className="text-brutal-muted font-mono text-xs">
            {String(index + 1).padStart(3, '0')}
          </span>
          <span className="text-sm font-mono">{project.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-xs text-brutal-muted">
            <Calendar className="w-3 h-3" />
            {formatDate(project.createdAt)}
          </span>
          {getStatusIndicator()}
          <ArrowRight className="w-4 h-4 text-brutal-muted" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-brutal-surface p-4 cursor-pointer hover:brightness-95 transition-all
                 border-r border-b border-brutal-border last:border-r-0"
      onClick={() => navigate(`/project/${project.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-brutal-muted">
            {String(index + 1).padStart(3, '0')}
          </span>
          <div className="w-10 h-10 border border-brutal-border flex items-center justify-center">
            <span className="text-xs font-mono text-brutal-accent">
              {STAGE_NUMBERS[project.currentStage]}
            </span>
          </div>
        </div>
        {getStatusIndicator()}
      </div>

      {/* Title */}
      <h3 className="font-mono font-bold text-sm mb-2 line-clamp-1">
        {project.title}
      </h3>

      {/* Pain Point */}
      <p className="text-xs text-brutal-muted mb-4 line-clamp-2 min-h-[2rem]">
        {project.painPoint}
      </p>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-brutal-muted">{t('project.progress')}</span>
          <span className="text-brutal-accent font-mono">{progressPercent}%</span>
        </div>
        <div className="h-1 bg-brutal-border">
          <div
            className="h-full bg-brutal-accent transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-brutal-border">
        <span className="text-xs font-mono text-brutal-accent">
          {stageLabel}
        </span>
        <span className="text-xs font-mono text-brutal-muted">
          {completedStagesCount}/6 {t('stage.stages_completed')}
        </span>
      </div>

      {/* Created Date */}
      <div className="flex items-center gap-1 mt-2 text-xs text-brutal-muted">
        <Calendar className="w-3 h-3" />
        <span>创建于 {formatDate(project.createdAt)}</span>
      </div>
    </div>
  );
}
