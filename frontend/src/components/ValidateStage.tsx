import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Users,
  MessageSquare,
  Target,
  Plus,
  X,
  Check,
  Play,
  AlertCircle,
  FileText,
  ExternalLink,
  Save,
  MoreHorizontal,
  Trash2,
  Edit3,
  BarChart3,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useI18n } from '../i18n/hooks';
import { aiService } from '../services/ai';
import { surveyApi } from '../services/api';
import type { Survey, SurveyResponse, SurveyAnalysis } from '../types';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Project, ValidationItem, ValidationTool, ValidationData } from '../types';

interface ValidateStageProps {
  project: Project;
  onUpdateContent: (content: string) => Promise<void>;
  isLocked: boolean;
  onToggleLock?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

// AI 宠物 ASCII 形象
const AI_PET_ROBOT = `
    [o_o]
    /| |\\
     d b
`;

const AI_PET_CAT = `
    /\\_/\\
   ( o.o )
    > ^ <
`;

const STATUS_CONFIG = {
  pending: {
    label: '待验证',
    color: 'border-brutal-border bg-brutal-surface text-brutal-muted',
    icon: ClipboardList,
  },
  in_progress: {
    label: '进行中',
    color: 'border-brutal-warning bg-brutal-warning/10 text-brutal-warning',
    icon: Play,
  },
  validated: {
    label: '已验证',
    color: 'border-brutal-success bg-brutal-success/10 text-brutal-success',
    icon: Check,
  },
  failed: {
    label: '验证失败',
    color: 'border-brutal-error bg-brutal-error/10 text-brutal-error',
    icon: AlertCircle,
  },
};

const TOOL_TYPES = {
  survey: { label: '问卷', icon: FileText, color: 'text-brutal-accent' },
  interview: { label: '访谈', icon: Users, color: 'text-brutal-success' },
  community: { label: '社区', icon: MessageSquare, color: 'text-brutal-warning' },
  competitor: { label: '竞品', icon: Target, color: 'text-brutal-muted' },
};

export function ValidateStage({ project, onUpdateContent, isLocked, onToggleLock, onDirtyChange }: ValidateStageProps) {
  const { t } = useI18n();
  const [data, setData] = useState<ValidationData>({ items: [], tools: [] });
  const [showAddItem, setShowAddItem] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange?.(editingItem !== null || showAddItem);
  }, [editingItem, showAddItem, onDirtyChange]);

  const [generatingTool, setGeneratingTool] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 问卷系统状态
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [showSurveyPreview, setShowSurveyPreview] = useState<Survey | null>(null);
  const [surveyLinkCopied, setSurveyLinkCopied] = useState(false);

  // 数据可视化 + AI 分析状态
  const [showSurveyData, setShowSurveyData] = useState<Survey | null>(null);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [showSurveyAnalysis, setShowSurveyAnalysis] = useState<Survey | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SurveyAnalysis | null>(null);
  const [isAnalyzingSurvey, setIsAnalyzingSurvey] = useState(false);

  // 表单状态
  // 验证结果录入模板配置
  type ValidationType = 'pain_point' | 'scenario' | 'competitor' | 'pricing' | 'generic';

  const getValidationType = (title: string): ValidationType => {
    const t = title.toLowerCase();
    if (t.includes('痛点')) return 'pain_point';
    if (t.includes('场景')) return 'scenario';
    if (t.includes('竞品') || t.includes('对手')) return 'competitor';
    if (t.includes('付费') || t.includes('定价') || t.includes('1元') || t.includes('价格')) return 'pricing';
    return 'generic';
  };

  interface FieldConfig {
    label: string;
    placeholder: string;
  }

  interface ValidationTemplate {
    methodLabel: string;
    methodPlaceholder: string;
    scaleLabel: string;
    scalePlaceholder: string;
    fields: FieldConfig[];
    conclusionOptions: { value: 'passed' | 'failed' | 'needs_more'; label: string; desc: string }[];
  }

  const VALIDATION_TEMPLATES: Record<ValidationType, ValidationTemplate> = {
    pain_point: {
      methodLabel: '验证方式',
      methodPlaceholder: '例如：面对面访谈了5位目标用户，问了他们平时遇到这个痛点的频率',
      scaleLabel: '接触了多少人？',
      scalePlaceholder: '例如：5',
      fields: [
        { label: '用户确认有此痛点的比例？', placeholder: '例如：4/5 的人表示经常遇到这个问题' },
        { label: '用户目前的替代方案是什么？', placeholder: '例如：他们现在用 Excel 手动记录，觉得很麻烦' },
        { label: '如果不解决，影响有多大？', placeholder: '例如：影响不大，只是偶尔觉得不方便' },
      ],
      conclusionOptions: [
        { value: 'passed', label: '痛点真实存在', desc: '可以继续' },
        { value: 'failed', label: '痛点不存在或不够痛', desc: '需要调整方向' },
        { value: 'needs_more', label: '还需要再验证', desc: '证据不足' },
      ],
    },
    scenario: {
      methodLabel: '验证方式',
      methodPlaceholder: '例如：观察了3位用户的日常工作流程',
      scaleLabel: '观察/访谈了多少人？',
      scalePlaceholder: '例如：3',
      fields: [
        { label: '描述的场景在用户日常中真实发生吗？', placeholder: '例如：是的，每天上班第一件事就是处理这个' },
        { label: '发生频率大概是？', placeholder: '例如：每天至少 2-3 次' },
        { label: '有没有发现新的使用场景？', placeholder: '例如：还发现他们在下班路上也会用到' },
      ],
      conclusionOptions: [
        { value: 'passed', label: '场景成立', desc: '可以继续' },
        { value: 'failed', label: '场景不成立', desc: '需要调整方向' },
        { value: 'needs_more', label: '还需要再验证', desc: '证据不足' },
      ],
    },
    competitor: {
      methodLabel: '调研方式',
      methodPlaceholder: '例如：对比了3款竞品 + 访谈了6位用户',
      scaleLabel: '调研了多少竞品/用户？',
      scalePlaceholder: '例如：3款竞品，6位用户',
      fields: [
        { label: '用户当前主要使用的替代方案？', placeholder: '例如：Notion + 微信群' },
        { label: '对现有方案最不满意的地方？', placeholder: '例如：信息太分散，经常找不到历史记录' },
        { label: '用户切换到你产品的意愿？', placeholder: '例如：表示如果迁移成本低愿意尝试' },
      ],
      conclusionOptions: [
        { value: 'passed', label: '竞品有明显弱点', desc: '有机会切入' },
        { value: 'failed', label: '现有方案已经足够好', desc: '差异化不够' },
        { value: 'needs_more', label: '还需要再调研', desc: '证据不足' },
      ],
    },
    pricing: {
      methodLabel: '验证方式',
      methodPlaceholder: '例如：做了定价测试页面，收集了20个邮箱',
      scaleLabel: '参与测试/访谈的人数？',
      scalePlaceholder: '例如：20',
      fields: [
        { label: '明确表示愿意付费的比例？', placeholder: '例如：15/20 愿意付费' },
        { label: '用户可接受的价格区间？', placeholder: '例如：多数人接受 9-19 元/月' },
        { label: '不付费的主要顾虑？', placeholder: '例如：担心数据安全、觉得功能不够多' },
      ],
      conclusionOptions: [
        { value: 'passed', label: '用户愿意付费', desc: '可以推进' },
        { value: 'failed', label: '用户不愿付费', desc: '需要调整模式' },
        { value: 'needs_more', label: '还需要再测试', desc: '证据不足' },
      ],
    },
    generic: {
      methodLabel: '验证方式',
      methodPlaceholder: '例如：线上问卷收集了50份有效回答',
      scaleLabel: '接触了多少人？',
      scalePlaceholder: '例如：50',
      fields: [
        { label: '最重要的发现是什么？', placeholder: '例如：超过70%的受访者表示有这个需求' },
        { label: '还有什么值得记录的？', placeholder: '例如：年轻人和年长者的需求差异很大' },
      ],
      conclusionOptions: [
        { value: 'passed', label: '假设成立', desc: '可以继续' },
        { value: 'failed', label: '假设不成立', desc: '需要调整方向' },
        { value: 'needs_more', label: '还需要再验证', desc: '证据不足' },
      ],
    },
  };

  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [resultForm, setResultForm] = useState<{
    sampleSize: number;
    keyFindings: string[];
    conclusion: 'passed' | 'failed' | 'needs_more';
    notes: string;
  }>({
    sampleSize: 0,
    keyFindings: [''],
    conclusion: 'passed',
    notes: '',
  });

  useEffect(() => {
    const validateStage = project.stages?.validate;
    if (validateStage?.content) {
      try {
        const parsed = JSON.parse(validateStage.content);
        if (parsed && typeof parsed === 'object') {
          setData({
            items: parsed.items || [],
            tools: parsed.tools || [],
            decision: parsed.decision,
            decisionReason: parsed.decisionReason,
          });
          return;
        }
      } catch {
        // 解析失败，使用空状态
      }
    }
    // content 为空时不自动创建默认值
    setData({ items: [], tools: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.stages?.validate?.content]);

  // 加载问卷列表
  useEffect(() => {
    if (!project.id) return;
    surveyApi.list(project.id)
      .then((list) => setSurveys(list))
      .catch(() => setSurveys([]));
  }, [project.id]);

  // 实时轮询：每 10 秒刷新问卷列表（更新回收数）
  useEffect(() => {
    if (!project.id) return;
    const timer = setInterval(() => {
      surveyApi.list(project.id)
        .then((list) => setSurveys(list))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [project.id]);

  // 保存数据
  const saveData = async (newData: ValidationData) => {
    const content = JSON.stringify(newData);
    await onUpdateContent(content);
  };

  // 添加验证项
  const addItem = async () => {
    if (!newItemTitle.trim()) return;

    const newItem: ValidationItem = {
      id: Date.now().toString(),
      title: newItemTitle,
      description: newItemDescription,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const newData = { ...data, items: [...data.items, newItem] };
    setData(newData);
    await saveData(newData);

    setNewItemTitle('');
    setNewItemDescription('');
    setShowAddItem(false);
  };

  // 删除验证项
  const deleteItem = async (id: string) => {
    const newData = { ...data, items: data.items.filter((item) => item.id !== id) };
    setData(newData);
    await saveData(newData);
  };

  // 更新状态
  const updateStatus = async (id: string, status: ValidationItem['status']) => {
    const newData = {
      ...data,
      items: data.items.map((item) =>
        item.id === id ? { ...item, status } : item
      ),
    };
    setData(newData);
    await saveData(newData);
  };

  // 开始编辑
  const startEdit = (item: ValidationItem) => {
    setEditingItem(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description);
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editingItem) return;

    const newData = {
      ...data,
      items: data.items.map((item) =>
        item.id === editingItem
          ? { ...item, title: editTitle, description: editDescription }
          : item
      ),
    };
    setData(newData);
    await saveData(newData);
    setEditingItem(null);
  };

  // 刷新问卷列表
  const refreshSurveys = async () => {
    if (!project.id) return;
    try {
      const list = await surveyApi.list(project.id);
      setSurveys(list);
    } catch {
      setSurveys([]);
    }
  };

  // 加载问卷回答数据
  const loadSurveyResponses = async (survey: Survey) => {
    if (!project.id) return;
    setLoadingResponses(true);
    setShowSurveyData(survey);
    try {
      const list = await surveyApi.getResponses(project.id, survey.id);
      setSurveyResponses(list);
    } catch {
      setSurveyResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  // AI 分析问卷
  const analyzeSurvey = async (survey: Survey) => {
    if (!project.id) return;
    setIsAnalyzingSurvey(true);
    setShowSurveyAnalysis(survey);
    try {
      const result = await surveyApi.analyze(project.id, survey.id);
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisResult(null);
      console.error('AI analysis failed:', err);
    } finally {
      setIsAnalyzingSurvey(false);
    }
  };

  // 生成验证工具
  const generateTool = async (type: keyof typeof TOOL_TYPES) => {
    setGeneratingTool(type);
    try {
      if (type === 'survey') {
        // 问卷走后端 AI 生成 + 创建记录
        const survey = await surveyApi.generate(project.id, {
          topic: project.title,
          target_users: project.painPoint || '',
          question_count: 8,
        });
        setSurveys((prev) => [survey, ...prev]);
        // 同时保存一个轻量引用到工具箱
        const newTool: ValidationTool = {
          id: survey.id,
          type: 'survey',
          title: survey.title,
          content: `问卷已生成，公开 ID: ${survey.public_id}`,
          generatedAt: new Date().toISOString(),
        };
        const newData = { ...data, tools: [...data.tools, newTool] };
        setData(newData);
        await saveData(newData);
      } else {
        const ideaContent = project.stages?.idea?.content || '';
        const tools = await aiService.generateValidationTools(
          project.title,
          project.painPoint,
          ideaContent,
          type
        );

        const newTool: ValidationTool = {
          id: Date.now().toString(),
          type,
          title: tools.title,
          content: tools.content,
          generatedAt: new Date().toISOString(),
        };

        const newData = { ...data, tools: [...data.tools, newTool] };
        setData(newData);
        await saveData(newData);
      }
    } catch (error) {
      console.error('Failed to generate tool:', error);
    } finally {
      setGeneratingTool(null);
    }
  };

  // 删除工具
  const deleteTool = async (id: string) => {
    const newData = { ...data, tools: data.tools.filter((tool) => tool.id !== id) };
    setData(newData);
    await saveData(newData);
  };

  // 打开结果录入
  const openResultModal = (item: ValidationItem) => {
    setShowResultModal(item.id);
    const vType = getValidationType(item.title);
    const template = VALIDATION_TEMPLATES[vType];
    const defaultFields = template.fields.map(() => '');
    const savedFindings = item.result?.keyFindings || [];
    // 如果有已保存的发现，用它；否则用模板预填的空字段
    const keyFindings = savedFindings.length > 0 ? savedFindings : defaultFields;
    setResultForm({
      sampleSize: item.result?.sampleSize || 0,
      keyFindings,
      conclusion: item.result?.conclusion || 'passed',
      notes: item.result?.notes || '',
    });
  };

  // 保存验证结果
  const saveResult = async () => {
    if (!showResultModal) return;

    const newStatus: ValidationItem['status'] = resultForm.conclusion === 'passed' ? 'validated' : 'failed';

    const newData = {
      ...data,
      items: data.items.map((item) =>
        item.id === showResultModal
          ? {
              ...item,
              result: {
                sampleSize: resultForm.sampleSize,
                keyFindings: resultForm.keyFindings.filter((f) => f.trim()),
                conclusion: resultForm.conclusion,
                notes: resultForm.notes,
              },
              status: newStatus,
            }
          : item
      ),
    };
    setData(newData);
    await saveData(newData);
    setShowResultModal(null);
  };

  // 获取 AI 分析
  const getAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await aiService.analyzeValidation(
        project.title,
        data.items
      );
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Failed to get AI analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 做出 GO/NO-GO 决策
  const makeDecision = async (decision: 'go' | 'no_go' | 'maybe', reason: string) => {
    const newData = { ...data, decision, decisionReason: reason };
    setData(newData);
    await saveData(newData);
    setShowDecisionModal(false);
  };

  // 按状态分组
  const pendingItems = data.items.filter((item) => item.status === 'pending');
  const inProgressItems = data.items.filter((item) => item.status === 'in_progress');
  const completedItems = data.items.filter(
    (item) => item.status === 'validated' || item.status === 'failed'
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 获取列 ID 对应的状态
  const getStatusFromColumnId = (columnId: string): ValidationItem['status'] => {
    switch (columnId) {
      case 'pending': return 'pending';
      case 'in_progress': return 'in_progress';
      case 'validated': return 'validated';
      default: return 'pending';
    }
  };

  // 获取状态对应的列 ID
  const getColumnIdFromStatus = (status: ValidationItem['status']) => {
    if (status === 'pending') return 'pending';
    if (status === 'in_progress') return 'in_progress';
    return 'validated';
  };

  // 处理拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // 处理拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || isLocked) return;

    const activeId = active.id as string;
    const activeItem = data.items.find((i) => i.id === activeId);
    if (!activeItem) return;

    const overId = over.id as string;
    let targetColumn = overId;

    // 如果落在卡片上，找到该卡片所在的列
    if (!['pending', 'in_progress', 'validated'].includes(overId)) {
      const overItem = data.items.find((i) => i.id === overId);
      if (overItem) {
        targetColumn = getColumnIdFromStatus(overItem.status);
      }
    }

    const sourceColumn = getColumnIdFromStatus(activeItem.status);
    if (sourceColumn !== targetColumn) {
      // 跨列拖拽：更新状态
      const newStatus = getStatusFromColumnId(targetColumn);
      await updateStatus(activeId, newStatus);
    } else {
      // 同列内排序或拖到空白区域
      if (overId === activeId) return;

      let targetItemId = overId;
      if (['pending', 'in_progress', 'validated'].includes(overId)) {
        // 拖到列空白区域：以该列最后一张卡片为目标
        const columnItems = data.items.filter((i) => getColumnIdFromStatus(i.status) === overId);
        const lastItem = columnItems[columnItems.length - 1];
        if (!lastItem || lastItem.id === activeId) return;
        targetItemId = lastItem.id;
      }

      const oldIndex = data.items.findIndex((i) => i.id === activeId);
      const newIndex = data.items.findIndex((i) => i.id === targetItemId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const newItems = [...data.items];
      newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, activeItem);
      const newData = { ...data, items: newItems };
      setData(newData);
      await saveData(newData);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-brutal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-brutal-border bg-brutal-surface">
        <div className="flex items-center gap-3">
          <Target className="w-4 h-4 text-brutal-accent" />
          <span className="font-mono text-sm">{t('stage.validate')}</span>
          <span className="text-xs text-brutal-muted">
            ({data.items.filter((i) => i.status !== 'pending').length}/{data.items.length} 验证中)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isLocked && (
            <button
              onClick={() => setShowAddItem(true)}
              className="btn-brutal h-9 flex items-center gap-2 text-xs"
            >
              <Plus className="w-3 h-3" />
              添加验证项
            </button>
          )}
          <button
            onClick={getAIAnalysis}
            disabled={isAnalyzing || data.items.length === 0}
            className="btn-brutal h-9 flex items-center gap-2 text-xs"
          >
            {isAnalyzing ? (
              <div className="w-3 h-3 border border-brutal-text border-t-transparent animate-spin" />
            ) : (
              <span className="text-brutal-accent">✨</span>
            )}
            AI 分析
          </button>
          {isLocked && (
            <button
              onClick={onToggleLock}
              className="btn-brutal h-9 flex items-center gap-2 text-xs text-brutal-warning border-brutal-warning"
            >
              <Edit3 className="w-3 h-3" />
              重新打开编辑
            </button>
          )}
        </div>
      </div>

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className="p-4 border-b border-brutal-border bg-brutal-surface/50">
          <div className="flex items-start gap-4">
            <pre className="text-xs text-brutal-accent font-mono leading-none flex-shrink-0">
              {AI_PET_ROBOT}
            </pre>
            <div className="flex-1">
              <p className="text-sm font-mono text-brutal-text whitespace-pre-line">
                {aiAnalysis}
              </p>
              <button
                onClick={() => setAiAnalysis(null)}
                className="text-xs text-brutal-muted hover:text-brutal-text mt-2"
              >
                [关闭]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Banner */}
      {data.decision && (
        <div
          className={`px-6 py-2 border-b font-mono text-sm flex items-center justify-between ${
            data.decision === 'go'
              ? 'bg-brutal-success/10 border-brutal-success text-brutal-success'
              : data.decision === 'no_go'
              ? 'bg-brutal-error/10 border-brutal-error text-brutal-error'
              : 'bg-brutal-warning/10 border-brutal-warning text-brutal-warning'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>
              决策结果:
              {data.decision === 'go' && ' GO (继续)'}
              {data.decision === 'no_go' && ' NO-GO (放弃)'}
              {data.decision === 'maybe' && ' MAYBE (待定)'}
            </span>
            <span className="text-xs opacity-70">| {data.decisionReason}</span>
          </div>
          {!isLocked && (
            <button
              onClick={() => setShowDecisionModal(true)}
              className="text-xs underline hover:no-underline"
            >
              修改决策
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {data.items.length === 0 && !isLocked && (
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => {
                const defaultItems: ValidationItem[] = [
                  { id: '1', title: '痛点真实性验证', description: '目标用户是否真的有这个痛点？', status: 'pending', createdAt: new Date().toISOString() },
                  { id: '2', title: '付费意愿验证', description: '用户是否愿意为此付费？', status: 'pending', createdAt: new Date().toISOString() },
                  { id: '3', title: '场景真实性验证', description: '描述的使用场景是否真实存在？', status: 'pending', createdAt: new Date().toISOString() },
                  { id: '4', title: '竞品弱点分析', description: '现有竞品的不足之处是什么？', status: 'pending', createdAt: new Date().toISOString() },
                ];
                const newData = { ...data, items: defaultItems };
                setData(newData);
                saveData(newData);
              }}
              className="text-xs font-mono border border-brutal-accent text-brutal-accent px-3 py-1.5 hover:bg-brutal-accent/10 transition-colors"
            >
              添加默认验证项
            </button>
          </div>
        )}
        {data.items.length > 0 && (
          <>
            {/* Kanban Board */}
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="flex-1 flex gap-4 p-6 overflow-x-auto min-h-0">
                {/* Pending Column */}
            <DroppableKanbanColumn
              id="pending"
              title="待验证"
              count={pendingItems.length}
              color="border-brutal-border"
            >
              {pendingItems.map((item) => (
                <DraggableValidationCard
                  key={item.id}
                  id={item.id}
                  item={item}
                  isLocked={isLocked}
                >
                  <ValidationCard
                    item={item}
                    isLocked={isLocked}
                    onStart={() => updateStatus(item.id, 'in_progress')}
                    onEdit={() => startEdit(item)}
                    onDelete={() => deleteItem(item.id)}
                  />
                </DraggableValidationCard>
              ))}
            </DroppableKanbanColumn>

            {/* In Progress Column */}
            <DroppableKanbanColumn
              id="in_progress"
              title="进行中"
              count={inProgressItems.length}
              color="border-brutal-warning"
            >
              {inProgressItems.map((item) => (
                <DraggableValidationCard
                  key={item.id}
                  id={item.id}
                  item={item}
                  isLocked={isLocked}
                >
                  <ValidationCard
                    item={item}
                    isLocked={isLocked}
                    onRecord={() => openResultModal(item)}
                    onEdit={() => startEdit(item)}
                    onDelete={() => deleteItem(item.id)}
                  />
                </DraggableValidationCard>
              ))}
            </DroppableKanbanColumn>

            {/* Completed Column */}
            <DroppableKanbanColumn
              id="validated"
              title="已验证"
              count={completedItems.length}
              color="border-brutal-success"
            >
              {completedItems.map((item) => (
                <DraggableValidationCard
                  key={item.id}
                  id={item.id}
                  item={item}
                  isLocked={isLocked}
                >
                  <ValidationCard
                    item={item}
                    isLocked={isLocked}
                    onRecord={() => openResultModal(item)}
                    onEdit={() => startEdit(item)}
                    onDelete={() => deleteItem(item.id)}
                  />
                </DraggableValidationCard>
              ))}
            </DroppableKanbanColumn>
          </div>

          {/* DragOverlay：通过 portal 渲染在 DOM 最外层，避免被父容器 overflow 裁剪 */}
          <DragOverlay>
            {activeId ? (
              <div className="ring-2 ring-brutal-accent shadow-lg cursor-grabbing">
                {(() => {
                  const item = data.items.find((i) => i.id === activeId);
                  if (!item) return null;
                  return (
                    <ValidationCard
                      item={item}
                      isLocked={isLocked}
                      onStart={() => updateStatus(item.id, 'in_progress')}
                      onRecord={() => openResultModal(item)}
                      onEdit={() => startEdit(item)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  );
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
          </>
        )}

        {/* Tools Panel */}
        <div className="w-80 border-l border-brutal-border bg-brutal-surface flex flex-col">
          <div className="px-4 py-3 border-b border-brutal-border">
            <span className="font-mono text-sm">验证工具箱</span>
          </div>

          <div className="p-4 space-y-2 border-b border-brutal-border">
            <p className="text-xs text-brutal-muted font-mono mb-3">生成验证工具</p>
            {(Object.keys(TOOL_TYPES) as Array<keyof typeof TOOL_TYPES>).map(
              (type) => {
                const config = TOOL_TYPES[type];
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => generateTool(type)}
                    disabled={generatingTool === type || isLocked}
                    className="w-full btn-brutal h-9 flex items-center justify-between text-xs py-2"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      {config.label}
                    </span>
                    {generatingTool === type ? (
                      <div className="w-3 h-3 border border-brutal-text border-t-transparent animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </button>
                );
              }
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {data.tools.length === 0 && surveys.length === 0 ? (
              <p className="text-xs text-brutal-muted font-mono text-center py-8">
                点击上方按钮生成验证工具
              </p>
            ) : (
              <>
                {/* 问卷列表 */}
                {surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className="border-2 border-brutal-accent bg-brutal-bg p-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brutal-accent" />
                        <span className="text-xs font-mono font-bold truncate">{survey.title}</span>
                      </div>
                      {!isLocked && (
                        <button
                          onClick={async () => {
                            await surveyApi.delete(project.id, survey.id);
                            refreshSurveys();
                          }}
                          className="text-brutal-muted hover:text-brutal-warning"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                        survey.status === 'active'
                          ? 'border-brutal-success text-brutal-success'
                          : 'border-brutal-muted text-brutal-muted'
                      }`}>
                        {survey.status === 'active' ? '收集中' : '已关闭'}
                      </span>
                      <span className="text-[10px] font-mono text-brutal-muted">
                        {survey.response_count} 份回答
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setShowSurveyPreview(survey)}
                        className="text-xs text-left px-2 py-1.5 border border-brutal-accent text-brutal-accent hover:bg-brutal-accent/10 transition-colors font-mono"
                      >
                        查看问卷
                      </button>
                      <button
                        onClick={() => loadSurveyResponses(survey)}
                        className="text-xs text-left px-2 py-1.5 border border-brutal-border hover:border-brutal-text transition-colors font-mono flex items-center gap-1"
                      >
                        <BarChart3 className="w-3 h-3" />
                        查看数据
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/s/${survey.public_id}`;
                          navigator.clipboard.writeText(url);
                          setSurveyLinkCopied(true);
                          setTimeout(() => setSurveyLinkCopied(false), 2000);
                        }}
                        className="text-xs text-left px-2 py-1.5 border border-brutal-border hover:border-brutal-text transition-colors font-mono flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {surveyLinkCopied ? '已复制' : '复制链接'}
                      </button>
                      <button
                        onClick={() => analyzeSurvey(survey)}
                        className="text-xs text-left px-2 py-1.5 border border-brutal-border hover:border-brutal-warning transition-colors font-mono flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        AI 分析
                      </button>
                      <button
                        onClick={async () => {
                          const next = survey.status === 'active' ? 'closed' : 'active';
                          await surveyApi.publish(project.id, survey.id, next as 'active' | 'closed');
                          refreshSurveys();
                        }}
                        disabled={isLocked}
                        className="col-span-2 text-xs text-left px-2 py-1.5 border border-brutal-border hover:border-brutal-warning transition-colors font-mono disabled:opacity-50"
                      >
                        {survey.status === 'active' ? '关闭收集' : '重新开启'}
                      </button>
                    </div>
                  </div>
                ))}

                {/* 其他工具列表 */}
                {data.tools.filter((t) => t.type !== 'survey').map((tool) => {
                  const config = TOOL_TYPES[tool.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={tool.id}
                      className="border border-brutal-border bg-brutal-bg p-3"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${config.color}`} />
                          <span className="text-xs font-mono font-bold">
                            {tool.title}
                          </span>
                        </div>
                        {!isLocked && (
                          <button
                            onClick={() => deleteTool(tool.id)}
                            className="text-brutal-muted hover:text-brutal-warning"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-mono text-brutal-muted whitespace-pre-wrap line-clamp-4">
                        {tool.content}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(tool.content)}
                        className="mt-2 text-xs text-brutal-accent hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        复制内容
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Decision Button */}
          {!data.decision && completedItems.length > 0 && (
            <div className="p-4 border-t border-brutal-border">
              <button
                onClick={() => setShowDecisionModal(true)}
                className="w-full btn-brutal-primary h-9 text-xs py-3"
              >
                做出 GO/NO-GO 决策
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItem && (
        <Modal title="添加验证项" onClose={() => setShowAddItem(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2">
                验证目标
              </label>
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
                placeholder="例如：用户是否愿意付费？"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2">
                详细描述
              </label>
              <textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm h-24 resize-none"
                placeholder="描述要验证的具体问题和预期结果..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddItem(false)}
                className="flex-1 btn-brutal h-9 py-2"
              >
                取消
              </button>
              <button
                onClick={addItem}
                disabled={!newItemTitle.trim()}
                className="flex-1 btn-brutal-primary h-9 py-2"
              >
                添加
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <Modal title="编辑验证项" onClose={() => setEditingItem(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2">
                验证目标
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2">
                详细描述
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm h-24 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 btn-brutal h-9 py-2"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 btn-brutal-primary h-9 py-2"
              >
                保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Result Modal */}
      {showResultModal && (() => {
        const currentItem = data.items.find((i) => i.id === showResultModal);
        if (!currentItem) return null;
        const vType = getValidationType(currentItem.title);
        const tmpl = VALIDATION_TEMPLATES[vType];
        return (
          <Modal title={`录入结果：${currentItem.title}`} onClose={() => setShowResultModal(null)}>
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
              {/* 验证项描述提示 */}
              <div className="p-3 border border-brutal-border bg-brutal-bg">
                <p className="text-xs font-mono text-brutal-muted">{currentItem.description}</p>
              </div>

              {/* 验证方式 */}
              <div>
                <label className="block text-xs font-mono text-brutal-text mb-2 font-bold">
                  {tmpl.methodLabel}
                </label>
                <textarea
                  value={resultForm.notes}
                  onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })}
                  className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm h-16 resize-none"
                  placeholder={tmpl.methodPlaceholder}
                />
              </div>

              {/* 接触规模 */}
              <div>
                <label className="block text-xs font-mono text-brutal-text mb-2 font-bold">
                  {tmpl.scaleLabel}
                </label>
                <input
                  type="text"
                  value={resultForm.sampleSize || ''}
                  onChange={(e) => {
                    const n = parseInt(e.target.value);
                    setResultForm({ ...resultForm, sampleSize: isNaN(n) ? 0 : n });
                  }}
                  className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
                  placeholder={tmpl.scalePlaceholder}
                />
              </div>

              {/* 引导式发现 */}
              <div className="space-y-3">
                <p className="text-xs font-mono text-brutal-text font-bold">验证发现</p>
                {tmpl.fields.map((field, index) => (
                  <div key={index}>
                    <label className="block text-xs font-mono text-brutal-muted mb-1.5">
                      {field.label}
                    </label>
                    <textarea
                      value={resultForm.keyFindings[index] || ''}
                      onChange={(e) => {
                        const newFindings = [...resultForm.keyFindings];
                        newFindings[index] = e.target.value;
                        // 确保数组长度至少和模板字段一样多
                        while (newFindings.length < tmpl.fields.length) {
                          newFindings.push('');
                        }
                        setResultForm({ ...resultForm, keyFindings: newFindings });
                      }}
                      className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm h-16 resize-none"
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>

              {/* 结论 */}
              <div>
                <p className="text-xs font-mono text-brutal-text font-bold mb-2">验证结论</p>
                <div className="space-y-2">
                  {tmpl.conclusionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setResultForm({ ...resultForm, conclusion: opt.value })}
                      className={`w-full p-3 border-2 text-left transition-colors ${
                        resultForm.conclusion === opt.value
                          ? opt.value === 'passed'
                            ? 'border-brutal-success bg-brutal-success/10'
                            : opt.value === 'failed'
                            ? 'border-brutal-error bg-brutal-error/10'
                            : 'border-brutal-warning bg-brutal-warning/10'
                          : 'border-brutal-border hover:border-brutal-text/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-mono font-bold ${
                          resultForm.conclusion === opt.value
                            ? opt.value === 'passed'
                              ? 'text-brutal-success'
                              : opt.value === 'failed'
                              ? 'text-brutal-error'
                              : 'text-brutal-warning'
                            : 'text-brutal-text'
                        }`}>
                          {opt.label}
                        </span>
                        <span className="text-xs font-mono text-brutal-muted">{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowResultModal(null)}
                  className="flex-1 btn-brutal h-9 py-2"
                >
                  取消
                </button>
                <button
                  onClick={saveResult}
                  className="flex-1 btn-brutal-primary h-9 py-2"
                >
                  保存结果
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Decision Modal */}
      {showDecisionModal && (
        <DecisionModal
          onClose={() => setShowDecisionModal(false)}
          onDecide={makeDecision}
          items={data.items}
          projectId={project.id}
          projectTitle={project.title}
          projectPainPoint={project.painPoint}
        />
      )}

      {/* Survey Preview Modal */}
      {showSurveyPreview && (
        <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
              <div className="flex items-center gap-2">
                <span className="text-xs text-brutal-muted font-mono">//</span>
                <span className="text-sm font-mono font-bold">问卷预览</span>
              </div>
              <button
                onClick={() => setShowSurveyPreview(null)}
                className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="border border-brutal-border bg-brutal-bg p-3">
                <p className="text-xs font-mono text-brutal-muted mb-2">公开链接</p>
                <div className="flex gap-2 mb-3">
                  <input
                    readOnly
                    value={`${window.location.origin}/s/${showSurveyPreview.public_id}`}
                    className="flex-1 p-2 bg-brutal-surface border border-brutal-border font-mono text-xs"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/s/${showSurveyPreview.public_id}`);
                      setSurveyLinkCopied(true);
                      setTimeout(() => setSurveyLinkCopied(false), 2000);
                    }}
                    className="px-3 py-2 border border-brutal-accent text-brutal-accent text-xs font-mono hover:bg-brutal-accent/10 transition-colors"
                  >
                    {surveyLinkCopied ? '已复制' : '复制'}
                  </button>
                </div>
                <div className="flex justify-center">
                  <QRCodeSVG
                    value={`${window.location.origin}/s/${showSurveyPreview.public_id}`}
                    size={160}
                    level="M"
                    bgColor="#1a1a1a"
                    fgColor="#00ff9d"
                    style={{ border: '2px solid #333' }}
                  />
                </div>
                <p className="text-center text-[10px] font-mono text-brutal-muted mt-1">扫码填写问卷</p>
              </div>

              <div className="space-y-3">
                {showSurveyPreview.config.questions.map((q, i) => (
                  <div key={q.id} className="border border-brutal-border bg-brutal-bg p-3">
                    <p className="text-xs font-mono font-bold mb-1">
                      {i + 1}. {q.title}
                      {q.required && <span className="text-brutal-error">*</span>}
                    </p>
                    <p className="text-[10px] font-mono text-brutal-muted">
                      类型: {q.type === 'single_choice' ? '单选' : q.type === 'multi_choice' ? '多选' : q.type === 'rating' ? '评分' : '文本'}
                      {q.options && ` | 选项: ${q.options.join(' / ')}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Survey Data Visualization Modal */}
      {showSurveyData && (
        <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brutal-accent" />
                <span className="text-sm font-mono font-bold">{showSurveyData.title} - 数据统计</span>
              </div>
              <button
                onClick={() => setShowSurveyData(null)}
                className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-6">
              {loadingResponses ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-brutal-accent animate-spin" />
                  <span className="ml-2 text-xs font-mono text-brutal-muted">加载数据中...</span>
                </div>
              ) : surveyResponses.length === 0 ? (
                <p className="text-xs font-mono text-brutal-muted text-center py-8">暂无回答数据</p>
              ) : (
                <>
                  <p className="text-xs font-mono text-brutal-muted">共 {surveyResponses.length} 份回答</p>
                  {showSurveyData.config.questions.map((q) => {
                    if (q.type === 'text') {
                      const answers = surveyResponses
                        .map((r) => r.answers[q.id])
                        .filter((a): a is string => typeof a === 'string' && a.trim().length > 0);
                      return (
                        <div key={q.id} className="border border-brutal-border bg-brutal-bg p-3">
                          <p className="text-xs font-mono font-bold mb-2">{q.title}</p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {answers.slice(0, 10).map((a, i) => (
                              <p key={i} className="text-[10px] font-mono text-brutal-muted border-l-2 border-brutal-border pl-2">
                                {a}
                              </p>
                            ))}
                            {answers.length > 10 && (
                              <p className="text-[10px] font-mono text-brutal-accent">还有 {answers.length - 10} 条...</p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    const counts: Record<string, number> = {};
                    surveyResponses.forEach((r) => {
                      const ans = r.answers[q.id];
                      if (q.type === 'multi_choice' && Array.isArray(ans)) {
                        ans.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
                      } else if (typeof ans === 'string' && ans) {
                        counts[ans] = (counts[ans] || 0) + 1;
                      }
                    });
                    const total = surveyResponses.length;
                    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

                    if (q.type === 'rating') {
                      const sum = entries.reduce((acc, [val, cnt]) => acc + Number(val) * cnt, 0);
                      const avg = entries.length > 0 ? (sum / total).toFixed(1) : '0';
                      return (
                        <div key={q.id} className="border border-brutal-border bg-brutal-bg p-3">
                          <p className="text-xs font-mono font-bold mb-2">{q.title}</p>
                          <p className="text-lg font-mono text-brutal-accent mb-3">平均分: {avg} / {q.scale || 5}</p>
                          <div className="space-y-1.5">
                            {entries.map(([val, cnt]) => {
                              const pct = Math.round((cnt / total) * 100);
                              return (
                                <div key={val} className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono w-6 text-right">{val}★</span>
                                  <div className="flex-1 h-3 bg-brutal-surface border border-brutal-border">
                                    <div
                                      className="h-full bg-brutal-accent transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono w-8">{cnt} ({pct}%)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={q.id} className="border border-brutal-border bg-brutal-bg p-3">
                        <p className="text-xs font-mono font-bold mb-2">{q.title}</p>
                        <div className="space-y-1.5">
                          {entries.map(([label, cnt]) => {
                            const pct = Math.round((cnt / total) * 100);
                            return (
                              <div key={label} className="flex items-center gap-2">
                                <span className="text-[10px] font-mono w-20 truncate" title={label}>{label}</span>
                                <div className="flex-1 h-3 bg-brutal-surface border border-brutal-border">
                                  <div
                                    className="h-full bg-brutal-accent transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono w-8">{cnt}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Survey AI Analysis Modal */}
      {showSurveyAnalysis && (
        <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brutal-warning" />
                <span className="text-sm font-mono font-bold">AI 分析洞察</span>
              </div>
              <button
                onClick={() => { setShowSurveyAnalysis(null); setAnalysisResult(null); }}
                className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4">
              {isAnalyzingSurvey ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-brutal-warning animate-spin" />
                  <span className="ml-2 text-xs font-mono text-brutal-muted">AI 正在分析数据...</span>
                </div>
              ) : !analysisResult ? (
                <p className="text-xs font-mono text-brutal-muted text-center py-8">分析失败，请重试</p>
              ) : (
                <>
                  <div className="border border-brutal-border bg-brutal-bg p-3">
                    <p className="text-xs font-mono font-bold text-brutal-accent mb-1">整体总结</p>
                    <p className="text-xs font-mono text-brutal-text whitespace-pre-line">{analysisResult.summary}</p>
                  </div>

                  <div className="border border-brutal-border bg-brutal-bg p-3">
                    <p className="text-xs font-mono font-bold text-brutal-accent mb-2">核心发现</p>
                    <ul className="space-y-1">
                      {analysisResult.key_findings.map((f, i) => (
                        <li key={i} className="text-xs font-mono text-brutal-text flex items-start gap-2">
                          <span className="text-brutal-accent">{i + 1}.</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {Object.keys(analysisResult.sentiment).length > 0 && (
                    <div className="border border-brutal-border bg-brutal-bg p-3">
                      <p className="text-xs font-mono font-bold text-brutal-accent mb-2">情感分布</p>
                      <div className="space-y-1.5">
                        {Object.entries(analysisResult.sentiment).map(([label, count]) => {
                          const total = Object.values(analysisResult.sentiment).reduce((a, b) => a + b, 0);
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                          return (
                            <div key={label} className="flex items-center gap-2">
                              <span className="text-[10px] font-mono w-12">{label}</span>
                              <div className="flex-1 h-3 bg-brutal-surface border border-brutal-border">
                                <div
                                  className="h-full bg-brutal-warning transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono w-8">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="border border-brutal-border bg-brutal-bg p-3">
                    <p className="text-xs font-mono font-bold text-brutal-accent mb-2">建议</p>
                    <ul className="space-y-1">
                      {analysisResult.recommendations.map((r, i) => (
                        <li key={i} className="text-xs font-mono text-brutal-text flex items-start gap-2">
                          <span className="text-brutal-warning">▸</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border border-brutal-border bg-brutal-bg p-3">
                    <p className="text-xs font-mono font-bold text-brutal-accent mb-1">后续行动</p>
                    <p className="text-xs font-mono text-brutal-text">{analysisResult.next_steps}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 子组件：可拖放看板列
function DroppableKanbanColumn({
  id,
  title,
  count,
  color,
  children,
}: {
  id: string;
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column' } });

  return (
    <div className="flex-shrink-0 min-w-[260px] w-64 lg:w-72 flex flex-col">
      <div
        className={`flex items-center justify-between px-3 py-2 border-t-2 ${color} bg-brutal-surface`}
      >
        <span className="text-xs font-mono font-bold">{title}</span>
        <span className="text-xs font-mono text-brutal-muted">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 border-x border-b border-brutal-border bg-brutal-bg/50 p-3 space-y-3 overflow-y-auto transition-colors ${
          isOver ? 'bg-brutal-accent/10' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// 子组件：可拖拽验证卡片包装器
function DraggableValidationCard({
  id,
  item,
  isLocked,
  children,
}: {
  id: string;
  item: ValidationItem;
  isLocked: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { type: 'card', item },
    disabled: isLocked,
  });

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        transition: 'transform 0.15s ease',
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${isDragging ? 'opacity-0' : ''} ${isLocked ? '' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {children}
    </div>
  );
}

// 子组件：验证卡片
function ValidationCard({
  item,
  isLocked,
  onStart,
  onRecord,
  onEdit,
  onDelete,
}: {
  item: ValidationItem;
  isLocked: boolean;
  onStart?: () => void;
  onRecord?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_CONFIG[item.status];
  const StatusIcon = status.icon;

  return (
    <div className={`border-2 ${status.color} bg-brutal-bg p-3 group`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-mono font-bold truncate">{item.title}</span>
        </div>
        {!isLocked && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="text-brutal-muted hover:text-brutal-text">
              <Edit3 className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="text-brutal-muted hover:text-brutal-warning">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <p className="text-xs font-mono text-brutal-muted mb-3 line-clamp-2">
        {item.description}
      </p>

      {item.result && (
        <div className="mb-3 p-2 bg-brutal-surface border border-brutal-border">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-brutal-muted">样本:</span>
            <span>{item.result.sampleSize}</span>
            <span className="text-brutal-muted ml-2">结论:</span>
            <span
              className={
                item.result.conclusion === 'passed'
                  ? 'text-brutal-success'
                  : item.result.conclusion === 'failed'
                  ? 'text-brutal-error'
                  : 'text-brutal-warning'
              }
            >
              {item.result.conclusion === 'passed' && '通过'}
              {item.result.conclusion === 'failed' && '失败'}
              {item.result.conclusion === 'needs_more' && '需更多'}
            </span>
          </div>
        </div>
      )}

      {!isLocked && (
        <div className="flex gap-2">
          {item.status === 'pending' && onStart && (
            <button
              onClick={onStart}
              className="flex-1 py-1 text-xs bg-brutal-warning text-brutal-bg font-mono flex items-center justify-center gap-1"
            >
              <Play className="w-3 h-3" />
              开始验证
            </button>
          )}
          {(item.status === 'in_progress' ||
            item.status === 'validated' ||
            item.status === 'failed') &&
            onRecord && (
              <button
                onClick={onRecord}
                className="flex-1 py-1 text-xs border border-brutal-accent text-brutal-accent font-mono flex items-center justify-center gap-1"
              >
                <Save className="w-3 h-3" />
                {item.result ? '修改结果' : '录入结果'}
              </button>
            )}
        </div>
      )}
    </div>
  );
}

// 子组件：模态框
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-brutal-muted font-mono">//</span>
            <span className="text-sm font-mono font-bold">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// 子组件：决策模态框
function DecisionModal({
  onClose,
  onDecide,
  items,
  projectId,
  projectTitle,
  projectPainPoint,
}: {
  onClose: () => void;
  onDecide: (decision: 'go' | 'no_go' | 'maybe', reason: string) => void;
  items: ValidationItem[];
  projectId: string;
  projectTitle: string;
  projectPainPoint: string;
}) {
  const [selectedDecision, setSelectedDecision] = useState<'go' | 'no_go' | 'maybe' | null>(null);
  const [reason, setReason] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const analyze = async () => {
      if (items.length === 0) return;
      setIsAnalyzing(true);
      setAnalysisError(null);
      try {
        const analysis = await aiService.analyzeDecision(
          projectId,
          projectTitle,
          projectPainPoint,
          items
        );
        setAiAnalysis(analysis);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI 分析失败';
        setAnalysisError(message);
      } finally {
        setIsAnalyzing(false);
      }
    };
    analyze();
  }, [items, projectId, projectTitle, projectPainPoint]);

  const validatedCount = items.filter((i) => i.status === 'validated').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const totalCompleted = validatedCount + failedCount;

  const handleDecide = () => {
    if (selectedDecision) {
      onDecide(selectedDecision, reason);
    }
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-brutal-muted font-mono">//</span>
            <span className="text-sm font-mono font-bold">GO/NO-GO 决策</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            ×
          </button>
        </div>

        {/* AI 分析 */}
        <div className="p-6 border-b border-brutal-border">
          <div className="flex items-start gap-4">
            <pre className="text-xs text-brutal-accent font-mono leading-none flex-shrink-0">
              {AI_PET_CAT}
            </pre>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-brutal-text mb-3">
                我帮你分析了验证数据，这是深度分析报告：
              </p>

              {isAnalyzing ? (
                <div className="flex items-center gap-2 text-xs font-mono text-brutal-muted">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  正在分析验证数据...
                </div>
              ) : analysisError ? (
                <div className="p-3 border border-brutal-warning text-brutal-warning text-xs font-mono">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {analysisError}
                </div>
              ) : (
                <div className="p-3 bg-brutal-bg border border-brutal-border max-h-[300px] overflow-y-auto">
                  <p className="text-xs font-mono text-brutal-muted mb-2">
                    📊 验证统计: {validatedCount} 通过 / {failedCount} 失败 / {totalCompleted} 完成
                  </p>
                  <div className="text-xs font-mono text-brutal-text whitespace-pre-line">
                    {aiAnalysis}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Decision Options */}
        <div className="p-6 space-y-4">
          <p className="text-xs font-mono text-brutal-muted">你的决策：</p>

          <button
            onClick={() => setSelectedDecision('go')}
            className={`w-full p-4 border-2 text-left ${
              selectedDecision === 'go'
                ? 'border-brutal-success bg-brutal-success/10'
                : 'border-brutal-border hover:border-brutal-success/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Check className={`w-5 h-5 ${selectedDecision === 'go' ? 'text-brutal-success' : ''}`} />
              <div>
                <p className="font-mono font-bold text-brutal-success">GO - 继续</p>
                <p className="text-xs font-mono text-brutal-muted mt-1">
                  痛点真实、需求验证通过，进入原型阶段
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedDecision('no_go')}
            className={`w-full p-4 border-2 text-left ${
              selectedDecision === 'no_go'
                ? 'border-brutal-error bg-brutal-error/10'
                : 'border-brutal-border hover:border-brutal-error/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <X className={`w-5 h-5 ${selectedDecision === 'no_go' ? 'text-brutal-error' : ''}`} />
              <div>
                <p className="font-mono font-bold text-brutal-error">NO-GO - 放弃</p>
                <p className="text-xs font-mono text-brutal-muted mt-1">
                  痛点不存在或用户不愿付费，项目归档
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedDecision('maybe')}
            className={`w-full p-4 border-2 text-left ${
              selectedDecision === 'maybe'
                ? 'border-brutal-warning bg-brutal-warning/10'
                : 'border-brutal-border hover:border-brutal-warning/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <MoreHorizontal
                className={`w-5 h-5 ${selectedDecision === 'maybe' ? 'text-brutal-warning' : ''}`}
              />
              <div>
                <p className="font-mono font-bold text-brutal-warning">MAYBE - 待定</p>
                <p className="text-xs font-mono text-brutal-muted mt-1">
                  需要更多信息或调整方向，回到想法阶段
                </p>
              </div>
            </div>
          </button>

          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2">
              决策理由（可选）
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm h-20 resize-none"
              placeholder="记录决策的原因..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-brutal-border bg-brutal-bg flex gap-3">
          <button onClick={onClose} className="flex-1 btn-brutal h-9 py-3">
            取消
          </button>
          <button
            onClick={handleDecide}
            disabled={!selectedDecision}
            className="flex-1 btn-brutal-primary h-9 py-3"
          >
            确认决策
          </button>
        </div>
      </div>
    </div>
  );
}
