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
} from 'lucide-react';
import { useI18n } from '../i18n/hooks';
import { aiService } from '../services/ai';
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

  // 表单状态
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
        // 解析失败，使用默认生成
      }
    }

    // 预生成默认验证项
    const defaultItems: ValidationItem[] = [
      {
        id: '1',
        title: '痛点真实性验证',
        description: '目标用户是否真的有这个痛点？频率和严重程度如何？',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: '付费意愿验证',
        description: '用户是否愿意为此付费？可接受的价格区间是多少？',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        title: '场景真实性验证',
        description: '描述的使用场景是否真实存在？',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: '4',
        title: '竞品弱点分析',
        description: '现有竞品的不足之处是什么？我们的差异化机会？',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ];
    const defaultData: ValidationData = { items: defaultItems, tools: [] };
    setData(defaultData);
    saveData(defaultData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 生成验证工具
  const generateTool = async (type: keyof typeof TOOL_TYPES) => {
    setGeneratingTool(type);
    try {
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
    setResultForm({
      sampleSize: item.result?.sampleSize || 0,
      keyFindings: item.result?.keyFindings?.length
        ? item.result.keyFindings
        : [''],
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
            {data.tools.length === 0 ? (
              <p className="text-xs text-brutal-muted font-mono text-center py-8">
                点击上方按钮生成验证工具
              </p>
            ) : (
              data.tools.map((tool) => {
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
              })
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
      {showResultModal && (
        <Modal title="录入验证结果" onClose={() => setShowResultModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2">
                样本数量
              </label>
              <input
                type="number"
                value={resultForm.sampleSize}
                onChange={(e) =>
                  setResultForm({
                    ...resultForm,
                    sampleSize: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
                placeholder="例如：5"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2">
                关键发现
              </label>
              {resultForm.keyFindings.map((finding, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={finding}
                    onChange={(e) => {
                      const newFindings = [...resultForm.keyFindings];
                      newFindings[index] = e.target.value;
                      setResultForm({ ...resultForm, keyFindings: newFindings });
                    }}
                    className="flex-1 p-2 border border-brutal-border bg-brutal-bg font-mono text-xs"
                    placeholder={`发现 ${index + 1}`}
                  />
                  <button
                    onClick={() => {
                      const newFindings = resultForm.keyFindings.filter(
                        (_, i) => i !== index
                      );
                      setResultForm({ ...resultForm, keyFindings: newFindings });
                    }}
                    className="text-brutal-muted hover:text-brutal-warning"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setResultForm({
                    ...resultForm,
                    keyFindings: [...resultForm.keyFindings, ''],
                  })
                }
                className="text-xs text-brutal-accent hover:underline"
              >
                + 添加发现
              </button>
            </div>
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2">
                验证结论
              </label>
              <div className="flex gap-2">
                {(['passed', 'failed', 'needs_more'] as const).map((conclusion) => (
                  <button
                    key={conclusion}
                    onClick={() => setResultForm({ ...resultForm, conclusion })}
                    className={`flex-1 py-2 text-xs font-mono border ${
                      resultForm.conclusion === conclusion
                        ? conclusion === 'passed'
                          ? 'bg-brutal-success text-brutal-bg border-brutal-success'
                          : conclusion === 'failed'
                          ? 'bg-brutal-error text-brutal-bg border-brutal-error'
                          : 'bg-brutal-warning text-brutal-bg border-brutal-warning'
                        : 'border-brutal-border'
                    }`}
                  >
                    {conclusion === 'passed' && '验证通过'}
                    {conclusion === 'failed' && '验证失败'}
                    {conclusion === 'needs_more' && '需更多数据'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2">
                备注
              </label>
              <textarea
                value={resultForm.notes}
                onChange={(e) =>
                  setResultForm({ ...resultForm, notes: e.target.value })
                }
                className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm h-20 resize-none"
                placeholder="补充说明..."
              />
            </div>
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
      )}

      {/* Decision Modal */}
      {showDecisionModal && (
        <DecisionModal
          onClose={() => setShowDecisionModal(false)}
          onDecide={makeDecision}
          items={data.items}
        />
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
}: {
  onClose: () => void;
  onDecide: (decision: 'go' | 'no_go' | 'maybe', reason: string) => void;
  items: ValidationItem[];
}) {
  const [selectedDecision, setSelectedDecision] = useState<'go' | 'no_go' | 'maybe' | null>(null);
  const [reason, setReason] = useState('');

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

        {/* AI Pet */}
        <div className="p-6 border-b border-brutal-border">
          <div className="flex items-start gap-4">
            <pre className="text-xs text-brutal-accent font-mono leading-none flex-shrink-0">
              {AI_PET_CAT}
            </pre>
            <div>
              <p className="text-sm font-mono text-brutal-text">
                我帮你分析了验证数据，这是建议：
              </p>
              <div className="mt-3 p-3 bg-brutal-bg border border-brutal-border">
                <p className="text-xs font-mono text-brutal-muted">
                  📊 验证统计: {validatedCount} 通过 / {failedCount} 失败 / {totalCompleted} 完成
                </p>
                <p className="text-xs font-mono text-brutal-accent mt-2">
                  {validatedCount > failedCount
                    ? '建议：GO（数据支持继续）'
                    : failedCount > validatedCount
                    ? '建议：NO-GO（需重新考虑）'
                    : '建议：MAYBE（需要更多信息）'}
                </p>
              </div>
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
