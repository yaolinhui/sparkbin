import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// 兼容 BrowserRouter 的 useBlocker（React Router v6 data router 专用 hook 的 polyfill）
function useBlocker(shouldBlock: boolean) {
  const location = useLocation();
  const [state, setState] = useState<'unblocked' | 'blocked'>('unblocked');
  const retryRef = useRef<(() => void) | null>(null);
  const ignoringPopState = useRef(false);

  useEffect(() => {
    if (!shouldBlock) return;

    const handlePopState = () => {
      if (ignoringPopState.current) return;
      setState('blocked');
      // 继续时真正执行后退（pushState 额外加了一条当前记录，所以 go(-1) 即可回到上一页）
      retryRef.current = () => {
        ignoringPopState.current = true;
        window.history.go(-1);
        setTimeout(() => {
          ignoringPopState.current = false;
        }, 100);
      };
      // 阻止实际导航，将用户留在当前页面
      window.history.pushState(null, '', location.pathname + location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [shouldBlock, location]);

  const proceed = useCallback(() => {
    setState('unblocked');
    retryRef.current?.();
    retryRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setState('unblocked');
    retryRef.current = null;
  }, []);

  return { state, proceed, reset, location };
}
import { ArrowLeft, Pause, Play, Archive, LogOut, MoreVertical, Sun, Moon, GitGraph, Trash2, Pencil, Cpu } from 'lucide-react';
import { useTheme } from '../theme/hooks';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useProjectStore, convertProjectDetailToProject } from '../stores/projectStore';
import { useI18n, useStatusLabel, useStageLabel } from '../i18n/hooks';
import { StageFlow } from './StageFlow';
import { RichTextEditor } from './RichTextEditor';
import { AIChat } from './AIChat';
import { projectsApi } from '../services/api';
import { IdeaStage } from './IdeaStage';
import { ValidateStage } from './ValidateStage';
import { PrototypeStage } from './PrototypeStage';
import { ShipStage } from './ShipStage';
import { GrowStage } from './GrowStage';
import { MonetizeStage } from './MonetizeStage';
import { ProjectBlueprint } from './ProjectBlueprint';
import { AgentCockpit } from './AgentCockpit';
import { type StageKey, type ProjectStatus } from '../types';

interface ProjectDetailProps {
  onLogout: () => void;
}

interface IdeaSyncNote {
  id: string;
  title: string;
  content: string;
  color: 'default' | 'accent' | 'warning' | 'success';
}

interface ValidateSyncItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'validated' | 'failed';
  createdAt: string;
}

interface PrototypeSyncFeature {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'todo' | 'doing' | 'done';
  notes: string;
  order: number;
}

interface ShipSyncFeedback {
  id: string;
  content: string;
  rating: number;
  source: string;
  createdAt: string;
}

interface GrowSyncItem {
  id: string;
  title: string;
  type: 'tutorial' | 'showcase' | 'story' | 'tech' | 'tips';
  channel: 'xiaohongshu' | 'twitter' | 'jike' | 'v2ex' | 'blog' | 'producthunt';
  scheduledDate: string;
  status: 'draft' | 'scheduled' | 'published';
  content: string;
}

interface MonetizeSyncTier {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year' | 'lifetime';
  features: string[];
  highlighted: boolean;
}

const parseJsonSafe = <T,>(raw: string, fallback: T): T => {
  if (!raw || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const markdownToPlainText = (content: string): string =>
  content
    .replace(/\r/g, '')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, '').trim())
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();

const getSyncTitle = (content: string): string => {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return 'AI 同步建议';
  const firstLine = lines[0].replace(/[：:]+$/, '');
  return firstLine.length > 24 ? `${firstLine.slice(0, 24)}...` : firstLine;
};

const formatRichTextBlock = (content: string): string =>
  content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) =>
      `<p>${line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</p>`
    )
    .join('');

const buildSyncedStageContent = (
  stage: StageKey,
  currentContent: string,
  aiReply: string,
  mode: 'append' | 'replace'
): string => {
  const cleanText = markdownToPlainText(aiReply).trim();
  const syncText = cleanText || 'AI 同步建议';
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const syncTitle = getSyncTitle(syncText);
  const isReplace = mode === 'replace';

  if (stage === 'idea') {
    const existing = parseJsonSafe<IdeaSyncNote[]>(currentContent, []);
    const safeExisting = Array.isArray(existing) ? existing : [];
    const note: IdeaSyncNote = {
      id: Date.now().toString(),
      title: isReplace ? 'AI 同步摘要' : syncTitle,
      content: syncText,
      color: 'accent',
    };
    return JSON.stringify(isReplace ? [note] : [...safeExisting, note]);
  }

  if (stage === 'validate') {
    const existing = parseJsonSafe<Record<string, unknown>>(currentContent, {});
    const existingItems = Array.isArray(existing.items) ? (existing.items as ValidateSyncItem[]) : [];
    const existingTools = Array.isArray(existing.tools) ? existing.tools : [];
    const item: ValidateSyncItem = {
      id: Date.now().toString(),
      title: syncTitle,
      description: syncText,
      status: 'pending',
      createdAt: now,
    };
    if (isReplace) {
      // replace 模式只替换 items，保留 tools / smokeTests / decision 等其他字段
      return JSON.stringify({
        ...existing,
        items: [item],
      });
    }
    return JSON.stringify({
      ...existing,
      items: [...existingItems, item],
      tools: existingTools,
    });
  }

  if (stage === 'prototype') {
    const existing = parseJsonSafe<Record<string, unknown>>(currentContent, {});
    const existingFeatures = Array.isArray(existing.features) ? (existing.features as PrototypeSyncFeature[]) : [];
    const feature: PrototypeSyncFeature = {
      id: Date.now().toString(),
      name: syncTitle,
      priority: 'P1',
      status: 'todo',
      notes: syncText,
      order: isReplace ? 0 : existingFeatures.length,
    };
    const baseChecklist = {
      domain: false,
      ssl: false,
      payment: false,
      analytics: false,
      feedback: false,
    };
    if (isReplace) {
      return JSON.stringify({
        selectedPlatform: 'web',
        features: [feature],
        releaseChecklist: baseChecklist,
      });
    }
    return JSON.stringify({
      ...existing,
      features: [...existingFeatures, feature],
      releaseChecklist:
        existing.releaseChecklist && typeof existing.releaseChecklist === 'object'
          ? existing.releaseChecklist
          : baseChecklist,
    });
  }

  if (stage === 'ship') {
    const existing = parseJsonSafe<Record<string, unknown>>(currentContent, {});
    const existingFeedbacks = Array.isArray(existing.feedbacks) ? (existing.feedbacks as ShipSyncFeedback[]) : [];
    const feedback: ShipSyncFeedback = {
      id: Date.now().toString(),
      content: syncText,
      rating: 5,
      source: 'AI同步',
      createdAt: now,
    };
    const baseShip = {
      checklist: {
        domain: false,
        ssl: false,
        payment: false,
        analytics: false,
        socialMedia: false,
      },
      platformBindings: [],
      contents: [],
      metrics: {
        newUsers: 0,
        activeUsers: 0,
        feedbackCount: 0,
        bugReports: 0,
      },
    };
    if (isReplace) {
      return JSON.stringify({
        ...baseShip,
        feedbacks: [feedback],
      });
    }
    return JSON.stringify({
      ...baseShip,
      ...existing,
      feedbacks: [...existingFeedbacks, feedback],
    });
  }

  if (stage === 'grow') {
    const existing = parseJsonSafe<Record<string, unknown>>(currentContent, {});
    const existingCalendar = Array.isArray(existing.contentCalendar) ? (existing.contentCalendar as GrowSyncItem[]) : [];
    const syncItem: GrowSyncItem = {
      id: Date.now().toString(),
      title: syncTitle,
      type: 'tips',
      channel: 'blog',
      scheduledDate: today,
      status: 'draft',
      content: syncText,
    };
    if (isReplace) {
      return JSON.stringify({
        contentCalendar: [syncItem],
        channelMetrics: [],
      });
    }
    return JSON.stringify({
      ...existing,
      contentCalendar: [...existingCalendar, syncItem],
      channelMetrics: Array.isArray(existing.channelMetrics) ? existing.channelMetrics : [],
    });
  }

  if (stage === 'monetize') {
    const existing = parseJsonSafe<Record<string, unknown>>(currentContent, {});
    const existingTiers = Array.isArray(existing.pricingTiers) ? (existing.pricingTiers as MonetizeSyncTier[]) : [];
    const tier: MonetizeSyncTier = {
      id: Date.now().toString(),
      name: isReplace ? 'AI 建议方案' : syncTitle,
      price: 19,
      period: 'month',
      features: syncText.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 6),
      highlighted: false,
    };
    const baseMonetize = {
      strategy: 'freemium',
      mrr: 0,
      totalRevenue: 0,
      paidUsers: 0,
      funnel: {
        visitors: 0,
        signups: 0,
        trials: 0,
        paid: 0,
      },
      testMode: false,
    };
    if (isReplace) {
      return JSON.stringify({
        ...baseMonetize,
        pricingTiers: [tier],
      });
    }
    return JSON.stringify({
      ...baseMonetize,
      ...existing,
      pricingTiers: [...existingTiers, tier],
    });
  }

  const currentRichText = currentContent.trim();
  const syncedBlock = formatRichTextBlock(syncText);
  if (isReplace || !currentRichText) {
    return syncedBlock || '<p>AI 同步建议</p>';
  }
  return `${currentRichText}${syncedBlock}`;
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
  const reopenStage = useProjectStore((state) => state.reopenStage);
  const updateProject = useProjectStore((state) => state.updateProject);
  const updateProjectStatus = useProjectStore((state) => state.updateProjectStatus);
  const deleteProject = useProjectStore((state) => state.deleteProject);

  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false); // 更多菜单显示状态
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncCandidate, setSyncCandidate] = useState('');
  const [syncMode, setSyncMode] = useState<'append' | 'replace'>('append');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewingStage, setViewingStage] = useState<StageKey | null>(null); // 正在查看的阶段（可切换）
  const [isAIChatCollapsed, setIsAIChatCollapsed] = useState(false); // AI 聊天折叠状态
  const [showBlueprint, setShowBlueprint] = useState(false); // 项目蓝图显示状态
  const [showAgentCockpit, setShowAgentCockpit] = useState(false); // Agent 驾驶舱显示状态
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);
  const dirtyEditorsRef = useRef<Set<string>>(new Set());
  const forceProceedRef = useRef<boolean>(false);
  const [dirtyCount, setDirtyCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasUnsavedChanges = dirtyCount > 0 || isEditingTitle;

  const markDirty = useCallback((key: string, dirty: boolean) => {
    if (dirty) {
      dirtyEditorsRef.current.add(key);
    } else {
      dirtyEditorsRef.current.delete(key);
    }
    setDirtyCount(dirtyEditorsRef.current.size);
  }, []);

  // 拦截浏览器返回按钮导航
  const blocker = useBlocker(hasUnsavedChanges);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      pendingNavRef.current = () => blocker.proceed();
      setShowLeaveConfirm(true);
    }
  }, [blocker]);

  // 清理保存状态定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, []);

  const { toggleTheme, isLight } = useTheme();

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      pendingNavRef.current = () => navigate('/');
      setShowLeaveConfirm(true);
    } else {
      navigate('/');
    }
  };

  const confirmLeave = () => {
    setShowLeaveConfirm(false);
    pendingNavRef.current?.();
    pendingNavRef.current = null;
  };

  const cancelLeave = () => {
    setShowLeaveConfirm(false);
    // 如果是由 useBlocker 拦截的导航，需要调用 reset 解除阻塞
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    pendingNavRef.current = null;
  };

  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyEditorsRef.current.size > 0 || isEditingTitle) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditingTitle]);

  // 如果没有项目数据或 stages 为空，获取完整项目详情
  useEffect(() => {
    if (!id) return;

    // 如果没有项目数据，或 stages 为空对象（从列表页导航过来），需要获取完整详情
    const needsFetch = !project || !project.stages || Object.keys(project.stages).length === 0;

    if (!needsFetch) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setFetchError(null);

    // 使用 projectsApi.get 获取完整详情（包含所有 stages）
    projectsApi.get(id)
      .then((detail) => {
        if (cancelled) return;
        // 更新 store 中的项目数据
        const updatedProject = convertProjectDetailToProject(detail);
        useProjectStore.setState((state) => ({
          projects: [
            ...state.projects.filter((p) => p.id !== id),
            updatedProject,
          ],
        }));
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
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

    return () => {
      cancelled = true;
    };
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

  // 计算显示的阶段：如果用户点击了其他阶段查看，则显示该阶段，否则显示当前阶段
  const displayStage = viewingStage ?? validCurrentStage;
  const displayStageData = project?.stages?.[displayStage];
  const isDisplayStageLocked = displayStageData?.isLocked ?? false;

  const handleContentChange = useCallback(async (content: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
    }
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // 必须保存到用户正在查看的阶段，而不是项目的 currentStage
        const targetStage = displayStage || validCurrentStage;
        await updateStageContent(project!.id, targetStage, content);
        setSaveStatus('saved');
        saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 1000);
  }, [project?.id, validCurrentStage, displayStage, updateStageContent]);

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

  if (!project || !project.stages || Object.keys(project.stages).length === 0) {
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
    .filter(([, stage]) => stage?.completedAt)
    .map(([key]) => key as StageKey);

  const currentStageData = project.stages?.[validCurrentStage];
  const isCurrentStageLocked = currentStageData?.isLocked ?? false;

  /**
   * 检查阶段内容是否包含用户实质填写的内容。
   * 各阶段存储格式不同（JSON 数组/对象），需要按阶段解析并验证。
   */
  const isStageContentMeaningful = (stage: StageKey, content: string): boolean => {
    const trimmed = content.trim();
    if (!trimmed || trimmed === '<p></p>') return false;

    // idea: 便利贴阶段，检查是否有非占位符、非 painPoint 自动填入的实质内容
    if (stage === 'idea') {
      try {
        const notes = JSON.parse(trimmed) as Array<{ content?: string }>;
        if (!Array.isArray(notes) || notes.length === 0) return false;
        const placeholders = [
          '描述你想解决的核心问题...',
          '谁会使用这个产品？',
          '用户在什么情况下会用？',
          '简述核心功能...',
          '与现有方案相比，你的优势是什么？',
          '点击编辑...',
        ];
        const painPointTrimmed = project.painPoint.trim();
        return notes.some((note) => {
          const noteContent = note.content?.trim() ?? '';
          if (!noteContent) return false;
          // painPoint 自动填入第一个 note，不算用户主动填写的内容
          if (noteContent === painPointTrimmed) return false;
          // 排除占位符文本
          return !placeholders.some((p) => noteContent.includes(p));
        });
      } catch {
        return false;
      }
    }

    // validate: 验证阶段，检查是否有已验证/失败/进行中的项，或已有决策
    if (stage === 'validate') {
      try {
        const data = JSON.parse(trimmed) as {
          items?: Array<{ status?: string }>;
          decision?: string;
        };
        const items = Array.isArray(data.items) ? data.items : [];
        if (items.length === 0) return false;
        return (
          items.some((item) => item.status !== 'pending') || !!data.decision
        );
      } catch {
        return false;
      }
    }

    // prototype: 原型阶段，检查是否选择了平台或有非默认的自定义功能
    // PrototypeStage 会自动生成3个默认功能（id: '1','2','3'），这些不算用户实质填写
    if (stage === 'prototype') {
      try {
        const data = JSON.parse(trimmed) as {
          features?: Array<{ id?: string; name?: string; notes?: string }>;
          selectedPlatform?: string;
        };
        if (!!data.selectedPlatform) return true;
        const features = Array.isArray(data.features) ? data.features : [];
        // 默认 features 的 ID 是 '1','2','3'，notes 是固定的几个值
        const defaultFeatureIds = ['1', '2', '3'];
        const defaultNotes = ['基础账户系统', '主要业务逻辑', '用户偏好设置', '继承自想法阶段的解决方案'];
        const hasCustomFeatures = features.some((f) => {
          if (!defaultFeatureIds.includes(f.id || '')) return true;
          if (!defaultNotes.includes(f.notes || '')) return true;
          return false;
        });
        return hasCustomFeatures;
      } catch {
        return false;
      }
    }

    // ship: 发布阶段，检查是否有勾选检查项、绑定平台、发布内容、用户反馈或上线地址
    if (stage === 'ship') {
      try {
        const data = JSON.parse(trimmed) as {
          checklist?: Record<string, boolean>;
          platformBindings?: unknown[];
          contents?: unknown[];
          feedbacks?: unknown[];
          launchUrl?: string;
        };
        const hasChecked = Object.values(data.checklist || {}).some((v) => v === true);
        return (
          hasChecked ||
          (Array.isArray(data.platformBindings) && data.platformBindings.length > 0) ||
          (Array.isArray(data.contents) && data.contents.length > 0) ||
          (Array.isArray(data.feedbacks) && data.feedbacks.length > 0) ||
          !!data.launchUrl
        );
      } catch {
        return false;
      }
    }

    // grow: 增长阶段，检查是否有内容日历条目
    if (stage === 'grow') {
      try {
        const data = JSON.parse(trimmed) as { contentCalendar?: unknown[] };
        return Array.isArray(data.contentCalendar) && data.contentCalendar.length > 0;
      } catch {
        return false;
      }
    }

    // monetize: 变现阶段，检查是否有自定义定价、收入数据或漏斗数据
    if (stage === 'monetize') {
      try {
        const data = JSON.parse(trimmed) as {
          pricingTiers?: unknown[];
          mrr?: number;
          totalRevenue?: number;
          paidUsers?: number;
          funnel?: { visitors?: number; signups?: number; trials?: number; paid?: number };
        };
        const tiers = Array.isArray(data.pricingTiers) ? data.pricingTiers : [];
        const hasCustomTiers = tiers.length > 3;
        const hasRevenue = (data.mrr ?? 0) > 0 || (data.totalRevenue ?? 0) > 0 || (data.paidUsers ?? 0) > 0;
        const funnel = data.funnel || {};
        const hasFunnel =
          (funnel.visitors ?? 0) > 0 ||
          (funnel.signups ?? 0) > 0 ||
          (funnel.trials ?? 0) > 0 ||
          (funnel.paid ?? 0) > 0;
        return hasCustomTiers || hasRevenue || hasFunnel;
      } catch {
        return false;
      }
    }

    // 默认（富文本阶段）：只要内容非空即视为有意义
    return true;
  };

  const handleCompleteStage = async () => {
    if (isCurrentStageLocked || !currentStageData) return;

    const currentContent = currentStageData?.content || '';
    const hasMeaningfulContent = isStageContentMeaningful(validCurrentStage, currentContent);

    if (!hasMeaningfulContent && !showConfirmModal && !forceProceedRef.current) {
      setShowConfirmModal(true);
      return;
    }

    forceProceedRef.current = false;
    setIsCompleting(true);
    await completeStage(project.id, validCurrentStage);
    setIsCompleting(false);
    setShowConfirmModal(false);
  };

  const handleReopenStage = async () => {
    if (!displayStageData || !displayStageData.isLocked) return;
    await reopenStage(project.id, displayStage);
  };

  const handleConfirmProceed = () => {
    forceProceedRef.current = true;
    setShowConfirmModal(false);
    setTimeout(() => handleCompleteStage(), 0);
  };

  const handleCancelProceed = () => {
    setShowConfirmModal(false);
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    await updateProjectStatus(project.id, status);
  };

  const startEditTitle = () => {
    if (!project) return;
    setEditTitle(project.title);
    setIsEditingTitle(true);
  };

  const saveTitle = async () => {
    if (!project) return;
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== project.title) {
      await updateProject(project.id, { title: trimmed });
    }
    setIsEditingTitle(false);
    setEditTitle('');
  };

  const cancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditTitle('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      cancelEditTitle();
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmInput('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (isDeletingProject) return;
    setShowDeleteModal(false);
    setDeleteConfirmInput('');
    setDeleteError(null);
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmInput.trim() !== project.title) {
      setDeleteError('请输入与项目标题完全一致的文本后再删除。');
      return;
    }

    setIsDeletingProject(true);
    setDeleteError(null);

    try {
      await deleteProject(project.id);
      setShowDeleteModal(false);
      navigate('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除失败，请稍后重试。';
      setDeleteError(message);
    } finally {
      setIsDeletingProject(false);
    }
  };

  const openSyncModal = (content: string) => {
    setSyncCandidate(content);
    setSyncMode('append');
    setSyncError(null);
    setShowSyncModal(true);
  };

  const closeSyncModal = () => {
    if (isSyncing) return;
    setShowSyncModal(false);
    setSyncCandidate('');
    setSyncError(null);
    setSyncMode('append');
  };

  const handleConfirmSync = async () => {
    if (!syncCandidate.trim()) {
      setSyncError('同步内容为空，无法写入左侧面板。');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const targetStage = displayStage || validCurrentStage;
      const stageData = project.stages?.[targetStage];
      const currentContent = stageData?.content || '';
      const nextContent = buildSyncedStageContent(targetStage, currentContent, syncCandidate, syncMode);
      await updateStageContent(project.id, targetStage, nextContent);
      setShowSyncModal(false);
      setSyncCandidate('');
      setSyncMode('append');
    } catch (error) {
      const message = error instanceof Error ? error.message : '同步失败，请稍后重试。';
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateContent = async (content: string) => {
    openSyncModal(content);
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
            className="btn-brutal h-9 flex items-center gap-2"
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
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-brutal-bg text-brutal-text font-mono">
      {/* Header - 固定显示核心项目信息 */}
      <div className="border-b border-brutal-border bg-brutal-surface">
        <div className="px-6 py-4">
          {/* Top row: Back button + Title + Actions */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={handleBackClick}
                className="flex items-center gap-2 text-brutal-muted hover:text-brutal-text transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">{t('nav.back')}</span>
              </button>
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={handleTitleKeyDown}
                  autoFocus
                  className="text-xl font-mono font-bold bg-brutal-bg border border-brutal-accent px-2 py-1 flex-1 min-w-0 focus:outline-none"
                />
              ) : (
                <button
                  onClick={startEditTitle}
                  className="flex items-center gap-2 group flex-1 min-w-0 text-left"
                  title="点击修改项目名称"
                >
                  <h1 className="text-xl font-mono font-bold truncate">
                    {project.title}
                  </h1>
                  <Pencil className="w-3 h-3 text-brutal-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeSwitcher />
              <LanguageSwitcher />
              <button
                onClick={() => setShowBlueprint(true)}
                className="btn-brutal h-9 flex items-center gap-2 text-brutal-accent border-brutal-accent"
                title="项目蓝图"
              >
                <GitGraph className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">蓝图</span>
              </button>
              <button
                onClick={() => setShowAgentCockpit(true)}
                className="btn-brutal h-9 flex items-center gap-2 text-brutal-success border-brutal-success"
                title="AI Agent 驾驶舱"
              >
                <Cpu className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Agent</span>
              </button>
              {renderStatusButton()}
              {project.status !== 'archived' && (
                <button
                  onClick={() => handleStatusChange('archived')}
                  className="btn-brutal h-9 focus-visible:ring-2 focus-visible:ring-brutal-accent focus-visible:outline-none"
                  title="归档项目"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setShowMoreMenu((v) => !v)}
                  className="btn-brutal h-9 p-2"
                  title="更多选项"
                  aria-expanded={showMoreMenu}
                  aria-haspopup="menu"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMoreMenu && (
                  <div
                    className="absolute right-0 top-full mt-1 border-2 border-brutal-border bg-brutal-surface shadow-lg min-w-[160px] z-50"
                    role="menu"
                  >
                    <button
                      onClick={() => {
                        toggleTheme();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-mono text-brutal-text hover:bg-brutal-surface-hover transition-colors"
                      role="menuitem"
                    >
                      {isLight ? (
                        <>
                          <Moon className="w-4 h-4" />
                          <span>切换深色</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-4 h-4" />
                          <span>切换浅色</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onLogout();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-mono text-brutal-text hover:bg-brutal-surface-hover transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>退出登录</span>
                    </button>
                    <div className="border-t border-brutal-border my-1" />
                    <button
                      onClick={() => {
                        openDeleteModal();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-mono text-brutal-warning hover:bg-brutal-warning/10 transition-colors"
                      role="menuitem"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>删除项目</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Second row: Project ID + Status + Pain Point */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-brutal-muted">// {t('project.id')}</span>
            <span className="text-xs text-brutal-accent font-mono">{project.id.slice(0, 8).toUpperCase()}</span>
            <span className={`text-xs px-2 py-0.5 border ${
              project.status === 'active' ? 'border-brutal-success text-brutal-success' :
              project.status === 'paused' ? 'border-brutal-warning text-brutal-warning' :
              'border-brutal-muted text-brutal-muted'
            }`}>
              {statusLabel}
            </span>
            <span className="text-sm text-brutal-muted font-mono truncate">{project.painPoint}</span>
          </div>
        </div>
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
            {/* 自动保存状态指示器 */}
            <div className="px-4 py-1.5 border-b border-brutal-border flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-mono text-brutal-muted">
                // {currentStageLabel}
              </span>
              {saveStatus !== 'idle' && (
                <span className={`text-xs font-mono ${
                  saveStatus === 'saving' ? 'text-brutal-warning' :
                  saveStatus === 'saved' ? 'text-brutal-success' :
                  'text-brutal-error'
                }`}>
                  {saveStatus === 'saving' && '保存中...'}
                  {saveStatus === 'saved' && '已保存'}
                  {saveStatus === 'error' && '保存失败'}
                </span>
              )}
            </div>
            {displayStage === 'idea' ? (
              <IdeaStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
                onToggleLock={handleReopenStage}
                onDirtyChange={(d) => markDirty('idea', d)}
              />
            ) : displayStage === 'validate' ? (
              <ValidateStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
                onToggleLock={handleReopenStage}
                onDirtyChange={(d) => markDirty('validate', d)}
              />
            ) : displayStage === 'prototype' ? (
              <PrototypeStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
                onToggleLock={handleReopenStage}
                onDirtyChange={(d) => markDirty('prototype', d)}
              />
            ) : displayStage === 'ship' ? (
              <ShipStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
                onToggleLock={handleReopenStage}
                onDirtyChange={(d) => markDirty('ship', d)}
              />
            ) : displayStage === 'grow' ? (
              <GrowStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
                onToggleLock={handleReopenStage}
                onDirtyChange={(d) => markDirty('grow', d)}
              />
            ) : displayStage === 'monetize' ? (
              <MonetizeStage
                project={project}
                onUpdateContent={handleContentChange}
                isLocked={isDisplayStageLocked}
                onToggleLock={handleReopenStage}
                onDirtyChange={(d) => markDirty('monetize', d)}
              />
            ) : currentStageData ? (
              <div className="flex-1 min-h-0 p-6 overflow-y-auto">
                <RichTextEditor
                  content={currentStageData.content || ''}
                  onChange={handleContentChange}
                  placeholder={`// ${t('placeholder.enter_notes')}`}
                  readonly={isCurrentStageLocked}
                  onDirtyChange={(d) => markDirty(`editor_${validCurrentStage}`, d)}
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
          className={`bg-brutal-bg transition-all duration-300 ease-in-out flex-shrink-0 self-stretch flex flex-col ${
            isAIChatCollapsed ? 'w-12' : 'w-full sm:w-[320px] md:w-[380px] lg:w-[420px] max-w-[420px]'
          }`}
        >
          <AIChat
            stage={validCurrentStage}
            projectId={project.id}
            projectTitle={project.title}
            onGenerateContent={handleGenerateContent}
            onSyncRequest={openSyncModal}
            isCollapsed={isAIChatCollapsed}
            onCollapsedChange={setIsAIChatCollapsed}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="border-2 border-brutal-accent bg-brutal-surface w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-brutal-accent bg-brutal-bg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-brutal-accent">SYNC TO LEFT PANEL</span>
                <span className="text-xs font-mono text-brutal-muted">阶段: {currentStageLabel}</span>
              </div>
              <button
                onClick={closeSyncModal}
                disabled={isSyncing}
                className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm font-mono text-brutal-text">
                {'>'} 将右侧 AI 回复同步到左侧当前阶段面板。
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSyncMode('append')}
                  className={`h-10 border font-mono text-sm transition-colors ${
                    syncMode === 'append'
                      ? 'border-brutal-accent text-brutal-accent bg-brutal-accent/10'
                      : 'border-brutal-border'
                  }`}
                >
                  追加写入（推荐）
                </button>
                <button
                  onClick={() => setSyncMode('replace')}
                  className={`h-10 border font-mono text-sm transition-colors ${
                    syncMode === 'replace'
                      ? 'border-brutal-warning text-brutal-warning bg-brutal-warning/10'
                      : 'border-brutal-border'
                  }`}
                >
                  覆盖当前阶段
                </button>
              </div>

              <div className="border border-brutal-border bg-brutal-bg p-3 max-h-64 overflow-y-auto">
                <div className="text-xs text-brutal-muted font-mono mb-2">SYNC_PREVIEW</div>
                <pre className="text-sm font-mono whitespace-pre-wrap break-words text-brutal-text">{syncCandidate}</pre>
              </div>

              {syncError && (
                <div className="text-xs font-mono text-brutal-warning border border-brutal-warning/40 p-2 bg-brutal-warning/10">
                  {syncError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeSyncModal}
                  disabled={isSyncing}
                  className="flex-1 btn-brutal h-10 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmSync}
                  disabled={isSyncing}
                  className="flex-1 btn-brutal-primary h-10 disabled:opacity-50"
                >
                  {isSyncing ? '同步中...' : '确认同步'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="border-2 border-brutal-warning bg-brutal-surface w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-brutal-warning bg-brutal-bg">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-brutal-warning" />
                <span className="text-sm font-mono font-bold text-brutal-warning">DELETE PROJECT</span>
              </div>
              <button
                onClick={closeDeleteModal}
                disabled={isDeletingProject}
                className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="text-sm font-mono mb-4 text-brutal-text">
                {'>'} 此操作会将项目从你的列表中删除（后端执行软删除）。
              </div>
              <div className="text-sm font-mono mb-4 text-brutal-warning">
                {'>'} 请确认你要删除项目：<span className="font-bold">{project.title}</span>
              </div>

              <label className="block text-xs font-mono text-brutal-muted mb-2">
                输入项目标题以确认删除
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                disabled={isDeletingProject}
                placeholder={project.title}
                className="w-full h-10 px-3 border border-brutal-border bg-brutal-bg text-brutal-text font-mono"
              />

              {deleteError && (
                <div className="mt-3 text-xs font-mono text-brutal-warning border border-brutal-warning/40 p-2 bg-brutal-warning/10">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeDeleteModal}
                  disabled={isDeletingProject}
                  className="flex-1 btn-brutal h-10 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={isDeletingProject || deleteConfirmInput.trim() !== project.title}
                  className="flex-1 btn-brutal h-10 border-brutal-warning text-brutal-warning disabled:opacity-50"
                >
                  {isDeletingProject ? '删除中...' : '确认删除'}
                </button>
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

      {/* Agent Cockpit Modal */}
      {showAgentCockpit && (
        <AgentCockpit
          project={project}
          isOpen={showAgentCockpit}
          onClose={() => setShowAgentCockpit(false)}
        />
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="border-2 border-brutal-warning bg-brutal-surface p-6 max-w-md w-full mx-4">
            <p className="text-brutal-warning font-mono text-sm mb-2">{'>'} WARNING</p>
            <p className="text-brutal-text font-mono mb-6">当前有未保存的内容，确定要离开吗？</p>
            <div className="flex gap-3">
              <button onClick={cancelLeave} className="flex-1 btn-brutal h-9">继续编辑</button>
              <button onClick={confirmLeave} className="flex-1 btn-brutal-primary h-9">确定离开</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetail;
