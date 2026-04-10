import { useState, useEffect } from 'react';
import { X, ArrowRight, Check, Edit2 } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useAIStore } from '../stores/aiStore';
import { useI18n } from '../i18n';
import { aiService } from '../services/ai';

interface UnderstandingDimension {
  id: number;
  title: string;
  content: string;
  isCorrect: boolean;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// AI 宠物 ASCII 形象
const AI_PET_CAT = `
    /\\_/\\
   ( o.o )
    > ^ <
   /|   |\\
  (_|   |_)
`;

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const { t } = useI18n();
  const [painPoint, setPainPoint] = useState('');
  const [title, setTitle] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);

  // AI 理解确认相关状态
  const [dimensions, setDimensions] = useState<UnderstandingDimension[]>([]);
  const [editingDimension, setEditingDimension] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const createProject = useProjectStore((state) => state.createProject);
  const isAIConfigured = useAIStore((state) => state.isConfigured);
  const checkConfiguration = useAIStore((state) => state.checkConfiguration);

  // 模态框打开时检查 AI 配置
  useEffect(() => {
    if (isOpen) {
      checkConfiguration();
    }
  }, [isOpen, checkConfiguration]);

  if (!isOpen) return null;

  // Step 1: 点击 AI 优化，生成理解维度
  const handleOptimize = async () => {
    if (!painPoint.trim()) return;

    if (!isAIConfigured) {
      setError('Please configure AI API first (Settings → AI Config)');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      // 调用 AI 分析用户输入，生成理解维度
      const result = await aiService.analyzeIdea(painPoint);

      // 解析 AI 返回的维度（2-5个）
      const parsedDimensions = parseDimensions(result);
      setDimensions(parsedDimensions);

      setStep(2);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('error.optimize_failed');
      setError(errorMessage);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 解析 AI 返回的理解维度
  const parseDimensions = (result: string): UnderstandingDimension[] => {
    const dimensions: UnderstandingDimension[] = [];

    // 尝试匹配 "① 标题: 内容" 或 "1. 标题: 内容" 格式
    const regex = /[①②③④⑤]|\d+[.．]\s*([^:：]+)[：:]\s*([^\n]+)/g;
    let match;
    let id = 1;

    while ((match = regex.exec(result)) !== null && id <= 5) {
      dimensions.push({
        id,
        title: match[1].trim(),
        content: match[2].trim(),
        isCorrect: true,
      });
      id++;
    }

    // 如果没解析到，使用默认维度
    if (dimensions.length === 0) {
      return [
        { id: 1, title: '核心痛点', content: '用户遇到的主要问题', isCorrect: true },
        { id: 2, title: '目标用户', content: '主要服务对象', isCorrect: true },
        { id: 3, title: '使用场景', content: '什么时候会使用', isCorrect: true },
      ];
    }

    return dimensions;
  };

  // Step 2: 确认理解正确，生成最终标题和描述
  const handleConfirmUnderstanding = async () => {
    setIsOptimizing(true);
    setError(null);

    try {
      // 将确认后的维度传给 AI，生成优化后的标题和描述
      const confirmedDimensions = dimensions.filter(d => d.isCorrect);
      const result = await aiService.generateFromDimensions(painPoint, confirmedDimensions);

      const titleMatch = result.match(/标题[:：]\s*(.+)/);
      const painPointMatch = result.match(/痛点[:：]\s*(.+)/s);

      if (titleMatch) {
        setTitle(titleMatch[1].trim());
      } else {
        setTitle(painPoint.slice(0, 30));
      }

      if (painPointMatch) {
        setPainPoint(painPointMatch[1].trim());
      }

      setStep(3);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('error.optimize_failed');
      setError(errorMessage);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 开始编辑某个维度
  const startEditDimension = (id: number) => {
    const dim = dimensions.find(d => d.id === id);
    if (dim) {
      setEditingDimension(id);
      setEditContent(dim.content);
    }
  };

  // 保存编辑的维度
  const saveEditDimension = () => {
    if (editingDimension !== null) {
      setDimensions(prev => prev.map(d =>
        d.id === editingDimension
          ? { ...d, content: editContent }
          : d
      ));
      setEditingDimension(null);
      setEditContent('');
    }
  };

  // 标记维度为正确
  const markDimensionCorrect = (id: number) => {
    setDimensions(prev => prev.map(d =>
      d.id === id ? { ...d, isCorrect: true } : d
    ));
  };

  const handleCreate = async () => {
    if (!title.trim()) return;

    const project = await createProject(title, painPoint);
    if (project) {
      setPainPoint('');
      setTitle('');
      setDimensions([]);
      setStep(1);
      setError(null);
      onClose();
    } else {
      setError('Failed to create project');
    }
  };

  const handleClose = () => {
    setPainPoint('');
    setTitle('');
    setDimensions([]);
    setStep(1);
    setError(null);
    onClose();
  };

  // 获取步骤标题
  const getStepTitle = () => {
    switch (step) {
      case 1: return t('modal.init_project');
      case 2: return '// AI 导师理解确认';
      case 3: return t('modal.confirm_params');
    }
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/95 flex items-center justify-center z-50 p-4">
      <div className="border border-brutal-border bg-brutal-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border">
          <div>
            <span className="text-xs text-brutal-muted font-mono">// </span>
            <span className="text-sm font-mono font-bold">{getStepTitle()}</span>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center
                       hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 border border-brutal-warning text-brutal-warning text-sm font-mono">
              <span className="text-brutal-warning">[{t('ai.error_prefix')}]</span> {error}
            </div>
          )}

          {/* Step 1: 输入描述 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                  {t('modal.input_description')}
                </label>
                <textarea
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value)}
                  placeholder={`>>> ${t('placeholder.describe_pain_point')}`}
                  className="w-full h-32 p-3 border border-brutal-border bg-brutal-bg resize-none
                             focus:border-brutal-accent transition-colors font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleOptimize}
                  disabled={!painPoint.trim() || isOptimizing}
                  className="btn-brutal-primary flex items-center gap-2 flex-1"
                >
                  {isOptimizing ? (
                    <>
                      <div className="w-4 h-4 border border-brutal-bg border-t-transparent animate-spin" />
                      {t('ai.processing')}
                    </>
                  ) : (
                    <>
                      <span className="text-brutal-bg">&gt;</span>
                      {t('action.generate_with_ai')}
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setTitle(painPoint?.slice(0, 30) || '');
                    setStep(3);
                  }}
                  disabled={!painPoint.trim()}
                  className="btn-brutal"
                >
                  {t('action.skip')}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: AI 理解确认 */}
          {step === 2 && (
            <div className="space-y-4">
              {/* AI 宠物 */}
              <div className="flex items-start gap-4 p-4 border border-brutal-border bg-brutal-bg">
                <pre className="text-xs text-brutal-accent font-mono leading-none">
                  {AI_PET_CAT}
                </pre>
                <div>
                  <p className="text-sm font-mono text-brutal-text">
                    "让我理解一下你的想法..."
                  </p>
                  <p className="text-xs text-brutal-muted mt-1">
                    我分析了你的描述，生成了 {dimensions.length} 个理解维度
                  </p>
                </div>
              </div>

              {/* 用户原始描述 */}
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">
                  你描述的是：
                </label>
                <div className="p-3 border border-brutal-border bg-brutal-bg font-mono text-sm text-brutal-text">
                  {painPoint}
                </div>
              </div>

              {/* 理解维度 */}
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">
                  我理解的核心问题（{dimensions.length} 个维度）：
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {dimensions.map((dim) => (
                    <div
                      key={dim.id}
                      className={`p-3 border ${dim.isCorrect ? 'border-brutal-border' : 'border-brutal-warning'} bg-brutal-bg`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-brutal-accent">
                          ① {dim.title}
                        </span>
                        <div className="flex gap-1">
                          {dim.isCorrect ? (
                            <button
                              onClick={() => startEditDimension(dim.id)}
                              className="p-1 text-brutal-muted hover:text-brutal-text"
                              title="编辑"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => markDimensionCorrect(dim.id)}
                              className="p-1 text-brutal-success"
                              title="标记正确"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {editingDimension === dim.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-2 border border-brutal-accent bg-brutal-bg text-sm font-mono"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveEditDimension}
                              className="text-xs px-2 py-1 bg-brutal-accent text-brutal-bg font-mono"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingDimension(null)}
                              className="text-xs px-2 py-1 border border-brutal-border font-mono"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-sm font-mono ${dim.isCorrect ? 'text-brutal-text' : 'text-brutal-muted line-through'}`}>
                          {dim.content}
                        </p>
                      )}

                      {!dim.isCorrect && !editingDimension && (
                        <p className="text-xs text-brutal-warning mt-2">
                          点击 ✓ 标记为正确，或点击 ✎ 编辑
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="btn-brutal flex-1"
                >
                  &lt; 返回修改描述
                </button>
                <button
                  onClick={handleConfirmUnderstanding}
                  disabled={isOptimizing || dimensions.every(d => !d.isCorrect)}
                  className="btn-brutal-primary flex-1"
                >
                  {isOptimizing ? (
                    <>
                      <div className="w-4 h-4 border border-brutal-bg border-t-transparent animate-spin inline mr-2" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 inline mr-2" />
                      理解正确，生成标题
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: 确认参数 */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                  {t('modal.project_title')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border border-brutal-border bg-brutal-bg
                             focus:border-brutal-accent transition-colors font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                  {t('project.description')}
                </label>
                <textarea
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value)}
                  className="w-full h-24 p-3 border border-brutal-border bg-brutal-bg resize-none
                             focus:border-brutal-accent transition-colors font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="btn-brutal flex-1"
                >
                  &lt; {t('nav.back')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!title.trim()}
                  className="btn-brutal-primary flex-1"
                >
                  {t('action.execute')}
                  <ArrowRight className="w-4 h-4 inline ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg">
          <div className="text-xs font-mono text-brutal-muted">
            {step === 1 && `> ${t('project.awaiting_input')}`}
            {step === 2 && '> 确认 AI 理解是否正确...'}
            {step === 3 && `> ${t('project.ready_to_commit')}`}
            <span className="animate-blink">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}
