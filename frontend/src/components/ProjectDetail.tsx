import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pause, Play, Archive, LogOut, ChevronUp, Menu, GitGraph } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useI18n, useStatusLabel, useStageLabel } from '../i18n/hooks';
import type { Project, Stage } from "../types";
import { StageFlow } from './StageFlow';
import { RichTextEditor } from './RichTextEditor';
import { AIChat } from './AIChat';
import { IdeaStage } from './IdeaStage';
import { ValidateStage } from './ValidateStage';
import { PrototypeStage } from './PrototypeStage';
import { ShipStage } from './ShipStage';
import { GrowStage } from './GrowStage';
import { MonetizeStage } from './MonetizeStage';
import { ProjectBlueprint } from './ProjectBlueprint';
import { type StageKey, type ProjectStatus } from '../types';

interface ProjectDetailProps {
  onLogout: () => void;
}

const STAGE_NUMBERS: Record<StageKey, string> = {
  idea: '01',
  validate: '02',
  prototype: '03',
  ship: '04',
  grow: '05',
  monetize: '06',
};

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

  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false); // 头部折叠状态
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [viewingStage, setViewingStage] = useState<StageKey | null>(null); // 正在查看的阶段（可切换）
  const [isAIChatCollapsed, setIsAIChatCollapsed] = useState(false); // AI 聊天折叠状态
  const [showBlueprint, setShowBlueprint] = useState(false); // 项目蓝图显示状态

  // 如果没有项目数据或 stages 为空，获取完整项目详情
  useEffect(() => {
    if (!id) return;

    // 如果没有项目数据，或 stages 为空对象（从列表页导航过来），需要获取完整详情
    const needsFetch = !project || !project.stages || Object.keys(project.stages).length === 0;

    if (needsFetch) {
      setIsLoading(true);
      setFetchError(null);

      // 使用 projectsApi.get 获取完整详情（包含所有 stages）
      import('../services/api').then(({ projectsApi }) => {
        projectsApi.get(id)
          .then((detail) => {
            // 更新 store 中的项目数据
            useProjectStore.setState((state) => ({
              projects: [
                ...state.projects.filter((p) => p.id !== id),
                {
                  id: detail.id,
                  title: detail.title,
                  painPoint: detail.pain_point,
                  status: detail.status,
                  currentStage: detail.current_stage,
                  stages: detail.stages.reduce((acc, s) => {
                    acc[s.stage_key] = {
                      content: s.content,
                      completedAt: s.completed_at,
                      isLocked: s.is_locked,
                    };
                    return acc;
                  }, {} as Record<string, Stage> as unknown as Project["stages"]),
                  createdAt: detail.created_at,
                  updatedAt: detail.updated_at,
                },
              ],
            }));
            setIsLoading(false);
          })
          .catch((err) => {
            console.error('Failed to fetch project:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
              setFetchError('无法连接到服务器，请检查后端是否已启动');
            } else if (errorMessage.includes('404')) {
              setFetchError('项目不存在');
            } else if (errorMessage.includes('401')) {
              setFetchError('登录已过期，请重新登录');
            } else {
              setFetchError(`加载失败: ${errorMessage}`);
            }
            setIsLoading(false);
          });
      });
    }
  }, [id, project]);

  // 计算当前阶段和标签 - 必须在条件返回之前
  const availableStages = project ? Object.entries(project.stages || {}) : [];
  const validCurrentStage: StageKey = project && availableStages.some(([key]) => key === project.currentStage)
    ? project.currentStage
    : (availableStages[0]?.[0] as StageKey) || 'idea';
  const currentStageLabel = useStageLabel(validCurrentStage);
  // 注意：useStatusLabel 必须在所有条件分支之前调用
  const statusLabelValue = useStatusLabel(project?.status ?? 'active');
  const statusLabel = project ? statusLabelValue : 'ACTIVE';

  // 加载中状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center font-mono">
        <div className="text-center border border-brutal-border bg-brutal-surface p-8">
          <div className="w-8 h-8 border-2 border-brutal-accent border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-brutal-muted text-sm">{'>'} LOADING_PROJECT_DATA...</p>
        </div>
      </div>
    );
  }

  // 获取失败状态
  if (fetchError) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center font-mono">
        <div className="text-center border-2 border-brutal-warning bg-brutal-surface p-8 max-w-md">
          <p className="text-brutal-warning font-mono text-sm mb-2">{'>'} ERROR</p>
          <p className="text-brutal-text mb-6">{fetchError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="btn-brutal h-9 focus-visible:ring-2 focus-visible:ring-brutal-accent focus-visible:outline-none"
            >
              重试
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-brutal-primary h-9 focus-visible:ring-2 focus-visible:ring-brutal-accent focus-visible:outline-none"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center font-mono">
        <div className="text-center border border-brutal-border bg-brutal-surface p-8">
          <p className="text-brutal-muted mb-4">{t('error.project_not_found')}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-brutal h-9 focus-visible:ring-2 focus-visible:ring-brutal-accent focus-visible:outline-none"
          >
            {t('action.return_to_dashboard')}
          </button>
        </div>
      </div>
    );
  }

  // 计算完成的阶段
  const completedStages = availableStages
    .filter(([, stage]) => stage?.isLocked)
    .map(([key]) => key as StageKey);

  const currentStageData = project.stages?.[validCurrentStage];
  const isCurrentStageLocked = currentStageData?.isLocked ?? false;

  // 计算显示的阶段：如果用户点击了其他阶段查看，则显示该阶段，否则显示当前阶段
  const displayStage = viewingStage ?? validCurrentStage;
  const displayStageData = project.stages?.[displayStage];
  const isDisplayStageLocked = displayStageData?.isLocked ?? false;
  const handleContentChange = async (content: string) => {
    await updateStageContent(project.id, validCurrentStage, content);
  };

  const handleCompleteStage = async () => {
    if (isCurrentStageLocked || !currentStageData) return;

    const currentContent = currentStageData?.content || '';
    const isContentEmpty = !currentContent || currentContent.trim() === '' || currentContent === '<p></p>';

    if (isContentEmpty && !showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    setIsCompleting(true);
    await completeStage(project.id, validCurrentStage);
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
    const stageData = project.stages?.[validCurrentStage];
    const currentContent = stageData?.content || '';
    const newContent = currentContent
      ? `${currentContent}\n\n${content}`
      : content;
    await updateStageContent(project.id, validCurrentStage, newContent);
  };

  const renderStatusButton = () => {
    switch (project.status) {
      case 'active':
        return (
          <button
            onClick={() => handleStatusChange('paused')}
            className="btn-brutal h-9 flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            {t('action.pause')}
          </button>
        );
      case 'paused':
        return (
          <button
            onClick={() => handleStatusChange('active')}
            className="btn-brutal h-9 flex items-center gap-2 text-brutal-success border-brutal-success"
          >
            <Play className="w-4 h-4" />
            {t('action.resume')}
          </button>
        );
      case 'archived':
        return (
          <button
            onClick={() => handleStatusChange('active')}
            className="btn-brutal h-9 flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            {t('action.restore')}
          </button>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-brutal-bg text-brutal-text font-mono">
      {/* Header - 可折叠 */}
      <div className="border-b border-brutal-border bg-brutal-surface">
        {isHeaderExpanded ? (
          // 展开状态 - 显示完整信息
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
                <button
                  onClick={() => setShowBlueprint(true)}
                  className="btn-brutal h-9 flex items-center gap-2 text-brutal-accent border-brutal-accent"
                  title="项目蓝图"
                >
                  <GitGraph className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">蓝图</span>
                </button>
                <button
                  onClick={() => setIsHeaderExpanded(false)}
                  className="btn-brutal h-9 p-2"
                  title="折叠头部"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                {renderStatusButton()}
                {project.status !== 'archived' && (
                  <button
                    onClick={() => handleStatusChange('archived')}
                    className="btn-brutal h-9 focus-visible:ring-2 focus-visible:ring-brutal-accent focus-visible:outline-none"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="btn-brutal h-9 flex items-center gap-2 border-brutal-warning text-brutal-warning"
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
        ) : (
          // 折叠状态 - 单行显示
          <div className="px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-1 text-brutal-muted hover:text-brutal-text transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {/* 当前阶段高亮显示 */}
                <div className="flex items-center gap-2 border border-brutal-accent px-2 py-1">
                  <span className="text-xs font-mono text-brutal-accent">
                    {STAGE_NUMBERS[validCurrentStage]}
                  </span>
                  <span className="text-xs font-mono text-brutal-accent">
                    {currentStageLabel}
                  </span>
                </div>
                <h1 className="text-base font-mono font-bold truncate">
                  {project.title}
                </h1>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowBlueprint(true)}
                  className="btn-brutal h-9 p-2 text-brutal-accent border-brutal-accent"
                  title="项目蓝图"
                >
                  <GitGraph className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsHeaderExpanded(true)}
                  className="btn-brutal h-9 p-2"
                  title="展开头部"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleStatusChange(project.status === 'active' ? 'paused' : 'active')}
                  className="btn-brutal h-9 p-2"
                >
                  {project.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={onLogout}
                  className="btn-brutal h-9 p-2 border-brutal-warning text-brutal-warning"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stage Flow - 包含阶段跳转、进度和提交按钮 */}
      <StageFlow
        currentStage={validCurrentStage}
        viewingStage={displayStage}
        completedStages={completedStages}
        onStageClick={(stage) => setViewingStage(stage)}
        onCompleteStage={handleCompleteStage}
        isCompleting={isCompleting}
        canComplete={!isCurrentStageLocked}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden min-h-0" >
        {/* Left: Editor - 根据 AI 聊天状态自适应宽度 */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-brutal-border bg-brutal-surface transition-all duration-300">
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {displayStage === 'idea' ? (
              <IdeaStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
              />
            ) : displayStage === 'validate' ? (
              <ValidateStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
              />
            ) : displayStage === 'prototype' ? (
              <PrototypeStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
              />
            ) : displayStage === 'ship' ? (
              <ShipStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
              />
            ) : displayStage === 'grow' ? (
              <GrowStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
              />
            ) : displayStage === 'monetize' ? (
              <MonetizeStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
              />
            ) : currentStageData ? (
              <div className="h-full p-6 overflow-y-auto">
                <RichTextEditor
                  content={currentStageData.content || ''}
                  onChange={handleContentChange}
                  placeholder={`// ${t('placeholder.enter_notes')}`}
                  readonly={isCurrentStageLocked}
                />
              </div>
            ) : (
              <div className="p-6 text-brutal-muted text-sm">
                {t('error.stage_not_found')}
              </div>
            )}

          </div>
        </div>

        {/* Right: AI Chat - 根据折叠状态动态调整宽度 */}
        <div
          className={`bg-brutal-bg transition-all duration-300 ease-in-out flex-shrink-0 h-full ${
            isAIChatCollapsed ? 'w-12' : 'w-[420px]'
          }`}
        >
          <AIChat
            stage={validCurrentStage}
            projectTitle={project.title}
            onGenerateContent={handleGenerateContent}
            isCollapsed={isAIChatCollapsed}
            onCollapsedChange={setIsAIChatCollapsed}
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
                  className="flex-1 btn-brutal h-9 py-3"
                >
                  {'<'} RETURN_TO_EDIT
                </button>
                <button
                  onClick={handleConfirmProceed}
                  className="flex-1 btn-brutal-primary h-9 py-3"
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

      {/* Project Blueprint Modal */}
      {showBlueprint && (
        <ProjectBlueprint
          project={project}
          onClose={() => setShowBlueprint(false)}
          onStageClick={(stage) => {
            setViewingStage(stage);
            setShowBlueprint(false);
          }}
        />
      )}
    </div>
  );
}
