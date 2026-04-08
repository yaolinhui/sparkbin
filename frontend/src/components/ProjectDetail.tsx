import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Pause, Play, Archive, Lock, ChevronRight, ChevronDown, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useProjectStore } from '../stores/projectStore';
import { useI18n, useStatusLabel, useStageLabel } from '../i18n';
import { StageFlow } from './StageFlow';
import { RichTextEditor } from './RichTextEditor';
import { AIChat } from './AIChat';
import { type StageKey, type ProjectStatus } from '../types';

interface ProjectDetailProps {
  onLogout: () => void;
}

export function ProjectDetail({ onLogout }: ProjectDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const project = useProjectStore((state) =>
    state.projects.find((p) => p.id === id)
  );
  const updateStageContent = useProjectStore((state) => state.updateStageContent);
  const completeStage = useProjectStore((state) => state.completeStage);
  const updateProjectStatus = useProjectStore((state) => state.updateProjectStatus);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);

  const [isCompleting, setIsCompleting] = useState(false);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 如果没有项目数据，尝试重新加载
  useEffect(() => {
    if (!project && id) {
      fetchProjects();
    }
  }, [id, project]);

  if (!project) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center font-mono">
        <div className="text-center border border-brutal-border bg-brutal-surface p-8">
          <p className="text-brutal-muted mb-4">{t('error.project_not_found')}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-brutal"
          >
            {t('action.return_to_dashboard')}
          </button>
        </div>
      </div>
    );
  }

  const completedStages = Object.entries(project.stages)
    .filter(([_, stage]) => stage.isLocked)
    .map(([key]) => key as StageKey);

  const currentStageData = project.stages[project.currentStage];
  const isCurrentStageLocked = currentStageData.isLocked;
  const currentStageLabel = useStageLabel(project.currentStage);

  const handleContentChange = async (content: string) => {
    await updateStageContent(project.id, project.currentStage, content);
  };

  const handleCompleteStage = async () => {
    if (isCurrentStageLocked) return;

    const currentContent = currentStageData.content;
    const isContentEmpty = !currentContent || currentContent.trim() === '' || currentContent === '<p></p>';

    if (isContentEmpty && !showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    setIsCompleting(true);
    await completeStage(project.id, project.currentStage);
    setIsCompleting(false);
    setShowConfirmModal(false);
  };

  const handleConfirmProceed = () => {
    setShowConfirmModal(false);
    setTimeout(() => handleCompleteStage(), 0);
  };

  const handleCancelProceed = () => {
    setShowConfirmModal(false);
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    await updateProjectStatus(project.id, status);
  };

  const handleGenerateContent = async (content: string) => {
    const currentContent = project.stages[project.currentStage].content;
    const newContent = currentContent
      ? `${currentContent}\n\n${content}`
      : content;
    await updateStageContent(project.id, project.currentStage, newContent);
  };

  const toggleStageExpand = (stageKey: string) => {
    setExpandedStage(expandedStage === stageKey ? null : stageKey);
  };

  const renderStatusButton = () => {
    switch (project.status) {
      case 'active':
        return (
          <button
            onClick={() => handleStatusChange('paused')}
            className="btn-brutal flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            {t('action.pause')}
          </button>
        );
      case 'paused':
        return (
          <button
            onClick={() => handleStatusChange('active')}
            className="btn-brutal flex items-center gap-2 text-brutal-success border-brutal-success"
          >
            <Play className="w-4 h-4" />
            {t('action.resume')}
          </button>
        );
      case 'archived':
        return (
          <button
            onClick={() => handleStatusChange('active')}
            className="btn-brutal flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            {t('action.restore')}
          </button>
        );
    }
  };

  const statusLabel = useStatusLabel(project.status);

  return (
    <div className="min-h-screen bg-brutal-bg text-brutal-text font-mono">
      {/* Header */}
      <div className="border-b border-brutal-border bg-brutal-surface">
        <div className="px-6 py-4">
          {/* Top row: Back button + Title + Actions */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-brutal-muted hover:text-brutal-text transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">{t('nav.back')}</span>
              </button>
              <h1 className="text-xl font-mono font-bold truncate">
                {project.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {renderStatusButton()}
              {project.status !== 'archived' && (
                <button
                  onClick={() => handleStatusChange('archived')}
                  className="btn-brutal"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onLogout}
                className="btn-brutal flex items-center gap-2 border-brutal-warning text-brutal-warning"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Second row: Project ID + Status + Description */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-brutal-muted">// {t('project.id')}</span>
              <span className="text-xs text-brutal-accent font-mono">{project.id.slice(0, 8).toUpperCase()}</span>
              <span className={`text-xs px-2 py-0.5 border ml-2 ${
                project.status === 'active' ? 'border-brutal-success text-brutal-success' :
                project.status === 'paused' ? 'border-brutal-warning text-brutal-warning' :
                'border-brutal-muted text-brutal-muted'
              }`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-brutal-muted font-mono mt-2">{project.painPoint}</p>
        </div>
      </div>

      {/* Stage Flow */}
      <StageFlow
        currentStage={project.currentStage}
        completedStages={completedStages}
      />

      {/* Main Content */}
      <div className="flex h-[calc(100vh-220px)]">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col border-r border-brutal-border bg-brutal-surface">
          <div className="flex items-center justify-between px-6 py-3 border-b border-brutal-border">
            <div className="flex items-center gap-3">
              <span className="text-xs text-brutal-muted">//</span>
              <span className="font-mono text-sm">
                {currentStageLabel}
              </span>
              {isCurrentStageLocked && (
                <span className="flex items-center gap-1 text-xs text-brutal-muted">
                  <Lock className="w-3 h-3" />
                  {t('status.locked')}
                </span>
              )}
            </div>
            {!isCurrentStageLocked && (
              <button
                onClick={handleCompleteStage}
                disabled={isCompleting}
                className="btn-brutal-primary flex items-center gap-2"
              >
                {isCompleting ? (
                  <div className="w-4 h-4 border border-brutal-bg border-t-transparent animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {t('action.commit_stage')}
              </button>
            )}
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            <RichTextEditor
              content={currentStageData.content}
              onChange={handleContentChange}
              placeholder={`// ${t('placeholder.enter_notes')}`}
              readonly={isCurrentStageLocked}
            />

            {completedStages.length > 0 && (
              <div className="mt-8 pt-8 border-t border-brutal-border">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-brutal-muted">//</span>
                  <span className="text-xs font-mono text-brutal-muted">{t('project.previous_stages')}</span>
                </div>
                <div className="space-y-2">
                  {completedStages.map((stageKey) => (
                    <CompletedStageView
                      key={stageKey}
                      stageKey={stageKey}
                      content={project.stages[stageKey].content}
                      isExpanded={expandedStage === stageKey}
                      onToggle={() => toggleStageExpand(stageKey)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Chat */}
        <div className="w-[420px] bg-brutal-bg">
          <AIChat
            stage={project.currentStage}
            projectTitle={project.title}
            onGenerateContent={handleGenerateContent}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-brutal-bg/90 flex items-center justify-center z-50 p-4">
          <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
              <div className="flex items-center gap-2">
                <span className="text-xs text-brutal-muted font-mono">//</span>
                <span className="text-sm font-mono font-bold">CONFIRM</span>
              </div>
              <button
                onClick={handleCancelProceed}
                className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-sm font-mono mb-4">
                <p className="text-brutal-text mb-2">
                  {'>'} WARNING: EMPTY_STAGE_CONTENT
                </p>
                <p className="text-brutal-muted">
                  当前阶段尚未记录内容，确定要完成并进入下一阶段吗？
                </p>
              </div>

              <div className="text-xs font-mono text-brutal-muted border-l-2 border-brutal-accent pl-3 py-2 mb-6">
                Stage: {currentStageLabel}<br />
                Status: NO_CONTENT_DETECTED
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelProceed}
                  className="flex-1 btn-brutal py-3"
                >
                  {'<'} RETURN_TO_EDIT
                </button>
                <button
                  onClick={handleConfirmProceed}
                  className="flex-1 btn-brutal-primary py-3"
                >
                  PROCEED {'>'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg">
              <div className="text-xs font-mono text-brutal-muted">
                {'>'} AWAITING_USER_INPUT...
                <span className="animate-blink">_</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for completed stages
function CompletedStageView({
  stageKey,
  content,
  isExpanded,
  onToggle
}: {
  stageKey: StageKey;
  content: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const stageLabel = useStageLabel(stageKey);

  return (
    <div className="border border-brutal-border bg-brutal-bg">
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-brutal-surface transition-colors"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-brutal-accent" />
        ) : (
          <ChevronRight className="w-4 h-4 text-brutal-accent" />
        )}
        <span className="text-xs font-mono">
          {stageLabel}
        </span>
        <Lock className="w-3 h-3 text-brutal-muted ml-auto" />
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-brutal-border">
          <div className="prose prose-sm max-w-none text-brutal-muted pt-3 prose-headings:text-brutal-text prose-headings:font-mono prose-strong:text-brutal-accent prose-code:text-brutal-accent prose-code:bg-brutal-surface prose-code:px-1 prose-pre:bg-brutal-surface prose-pre:border prose-pre:border-brutal-border">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
