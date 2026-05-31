import { useState, useEffect } from 'react';
import { X, ArrowRight, Check, Edit2, ChevronDown, ChevronUp, Github } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useAIStore } from '../stores/aiStore';
import { useI18n } from '../i18n/hooks';
import { PROJECT_TYPE_LABELS, type ProjectType } from '../types';
import { aiService } from '../services/ai';
import { SnakeLoader } from './SnakeLoader';

interface UnderstandingDimension {
  id: number;
  title: string;
  content: string;
  isCorrect: boolean;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFromGitHub?: () => void;
}

// AI 宠物 ASCII 形象
const AI_PET_CAT = `
    /\\_/\\
   ( o.o )
    > ^ <
   /|   |\\
  (_|   |_)
`;

export function CreateProjectModal({ isOpen, onClose, onImportFromGitHub }: CreateProjectModalProps) {
  const { t } = useI18n();
  const [painPoint, setPainPoint] = useState('');
  const [originalIdea, setOriginalIdea] = useState('');
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('other');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);

  // AI 理解确认相关状态
  const [dimensions, setDimensions] = useState<UnderstandingDimension[]>([]);
  const [editingDimension, setEditingDimension] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  // 流式输出实时文本（用于底部状态栏打字机效果）
  const [streamOutput, setStreamOutput] = useState('');
  // AI 预生成的标题和痛点（Step 1 流式调用时一并生成）
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedPainPoint, setGeneratedPainPoint] = useState('');
  // 原始描述折叠状态
  const [isOriginalExpanded, setIsOriginalExpanded] = useState(false);

  // ESC 关闭模态框
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

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
    setOriginalIdea(painPoint); // 保存用户原始输入
    setStreamOutput('');

    try {
      let fullText = '';
      for await (const chunk of aiService.streamAnalyzeProject(painPoint)) {
        fullText += chunk;
        // 实时显示最后 180 字符，制造打字机效果
        setStreamOutput(fullText.slice(-180));
      }

      const parsed = aiService.parseProjectAnalysis(fullText);

      // 设置维度
      const parsedDimensions = parsed.dimensions.map((d, i) => ({
        id: i + 1,
        title: d.title,
        content: d.content,
        isCorrect: true,
      }));
      setDimensions(parsedDimensions);

      // 预生成标题和痛点（Step 2→3 直接从内存读取，无需二次 AI 调用）
      setGeneratedTitle(parsed.title || painPoint.slice(0, 30));
      setGeneratedPainPoint(parsed.painPoint || painPoint);

      setStep(2);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('error.optimize_failed');
      setError(errorMessage);
    } finally {
      setIsOptimizing(false);
      setStreamOutput('');
    }
  };

  // Step 2: 确认理解正确，直接从预生成状态读取（0ms 等待）
  const handleConfirmUnderstanding = () => {
    const confirmedDimensions = dimensions.filter(d => d.isCorrect);
    if (confirmedDimensions.length === 0) return;

    setTitle(generatedTitle || painPoint.slice(0, 30));
    setPainPoint(generatedPainPoint || painPoint);
    setStep(3);
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

    const project = await createProject(title, painPoint, originalIdea, projectType);
    if (project) {
      setPainPoint('');
      setOriginalIdea('');
      setTitle('');
      setProjectType('other');
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
    setOriginalIdea('');
    setTitle('');
    setProjectType('other');
    setDimensions([]);
    setStep(1);
    setError(null);
    setStreamOutput('');
    setGeneratedTitle('');
    setGeneratedPainPoint('');
    setIsOriginalExpanded(false);
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
    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="border border-brutal-border bg-brutal-surface w-full max-w-2xl relative max-h-[90vh] flex flex-col">
        {/* 边框贪吃蛇动效 */}
        <SnakeLoader isLoading={isOptimizing} />
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

        {/* Content - 限制高度，内部滚动 */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
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

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleOptimize}
                  disabled={!painPoint.trim() || isOptimizing}
                  className="btn-brutal-primary h-9 flex items-center justify-center gap-2 w-full py-3"
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

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-brutal-border" />
                  <span className="text-xs font-mono text-brutal-muted">或</span>
                  <div className="flex-1 h-px bg-brutal-border" />
                </div>

                <button
                  onClick={() => {
                    // 跳过 AI，直接进入第 3 步手动输入
                    setStep(3);
                  }}
                  className="btn-brutal h-9 w-full py-3 text-brutal-muted hover:text-brutal-text"
                >
                  跳过 — 手动输入
                </button>

                {onImportFromGitHub && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-brutal-border" />
                      <span className="text-xs font-mono text-brutal-muted">或</span>
                      <div className="flex-1 h-px bg-brutal-border" />
                    </div>

                    <button
                      onClick={() => {
                        onImportFromGitHub();
                        onClose();
                      }}
                      className="btn-brutal h-9 w-full py-3 flex items-center justify-center gap-2 text-brutal-muted hover:text-brutal-text hover:border-brutal-accent"
                    >
                      <Github className="w-4 h-4" />
                      <span className="text-xs font-mono">{t('github.import_from_github') || '从 GitHub 导入'}</span>
                    </button>
                  </>
                )}
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

              {/* 用户原始描述 - 限制高度，支持折叠 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-brutal-muted">
                    你描述的是：
                  </label>
                  {originalIdea.length > 200 && (
                    <button
                      onClick={() => setIsOriginalExpanded(!isOriginalExpanded)}
                      className="text-[10px] font-mono text-brutal-accent hover:text-brutal-text flex items-center gap-1"
                    >
                      {isOriginalExpanded ? (
                        <><ChevronUp className="w-3 h-3" /> 收起</>
                      ) : (
                        <><ChevronDown className="w-3 h-3" /> 展开</>
                      )}
                    </button>
                  )}
                </div>
                <div
                  className={`p-3 border border-brutal-border bg-brutal-bg font-mono text-sm text-brutal-text whitespace-pre-wrap break-words overflow-y-auto ${
                    isOriginalExpanded ? 'max-h-60' : 'max-h-40'
                  }`}
                >
                  {originalIdea || painPoint}
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
                  className="btn-brutal h-9 flex-1"
                >
                  &lt; 返回修改描述
                </button>
                <button
                  onClick={handleConfirmUnderstanding}
                  disabled={isOptimizing || dimensions.every(d => !d.isCorrect)}
                  className="btn-brutal-primary h-9 flex-1"
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
                  项目类型
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as ProjectType)}
                  className="w-full p-3 border border-brutal-border bg-brutal-bg
                             focus:border-brutal-accent transition-colors font-mono text-sm
                             appearance-none cursor-pointer"
                >
                  {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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

              {/* 原始想法已保存提示 */}
              {originalIdea && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-brutal-success border border-brutal-success/30 px-2 py-1">
                  <Check className="w-3 h-3" />
                  原始想法已保存到数据库
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="btn-brutal h-9 flex-1"
                >
                  &lt; {t('nav.back')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!title.trim()}
                  className="btn-brutal-primary h-9 flex-1"
                >
                  {t('action.execute')}
                  <ArrowRight className="w-4 h-4 inline ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg flex-shrink-0">
          {isOptimizing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-brutal-accent border-t-transparent animate-spin flex-shrink-0" />
              <div className="text-xs font-mono text-brutal-accent truncate flex-1">
                {'>'} {streamOutput || 'AI 正在分析...'}
                <span className="animate-blink">_</span>
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-brutal-muted">
              {step === 1 && `> ${t('project.awaiting_input')}`}
              {step === 2 && '> 确认 AI 理解是否正确...'}
              {step === 3 && `> ${t('project.ready_to_commit')}`}
              <span className="animate-blink">_</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
