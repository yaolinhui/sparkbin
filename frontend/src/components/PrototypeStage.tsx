import { useState, useEffect } from 'react';
import {
  Layers,
  Layout,
  Smartphone,
  Globe,
  Monitor,
  Plus,
  Check,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  ChevronRight,
  Rocket,
  Palette,
  GripVertical,
  Edit3,
  Trash2,
  Save,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '../i18n/hooks';
import { aiService } from '../services/ai';
import { ImageUpload } from './ImageUpload';
import type { Project, PrototypeData, PlatformType, Feature, DesignTemplate } from '../types';

interface PrototypeStageProps {
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

interface PlatformConfig {
  type: PlatformType;
  label: string;
  icon: typeof Globe;
  description: string;
  details: string;
  pros: string[];
  cons: string[];
  recommended?: boolean;
  recommendReason?: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    type: 'web',
    label: 'Web 网站',
    icon: Globe,
    description: '适合大多数用户，易于分享',
    details: '无需安装，打开浏览器即可使用。跨平台兼容（手机、电脑、平板），更新即时生效，适合快速验证和迭代。',
    pros: ['开发周期短', '无需审核', '跨平台', '易于分享传播'],
    cons: ['需要联网', '功能受浏览器限制'],
    recommended: true,
    recommendReason: '默认首选 — 开发成本最低，用户触达最快',
  },
  {
    type: 'miniapp',
    label: '小程序',
    icon: Smartphone,
    description: '微信/支付宝生态，即用即走',
    details: '依托超级 App（微信/支付宝/抖音）的流量入口，用户无需下载安装，扫码或搜索即可使用。适合服务类、工具类、电商类产品。',
    pros: ['庞大流量池', '即用即走', '社交传播强', '开发成本较低'],
    cons: ['平台规则限制', '功能受限', '依赖微信生态'],
    recommendReason: '适合需要利用社交裂变或微信生态的项目',
  },
  {
    type: 'ios',
    label: 'iOS App',
    icon: Smartphone,
    description: 'App Store 发布，体验原生',
    details: '面向 iPhone 和 iPad 用户，原生性能体验最佳。适合需要调用相机、GPS、推送通知等原生能力的重度应用。',
    pros: ['用户体验最佳', '付费意愿高', '生态成熟', '安全性强'],
    cons: ['审核周期长', '需要 Mac 设备', '30% 苹果税'],
    recommendReason: '适合面向高端用户、需要原生体验的复杂应用',
  },
  {
    type: 'android',
    label: 'Android App',
    icon: Smartphone,
    description: 'Google Play 或国内渠道',
    details: '覆盖最广泛的手机用户群体，支持多种应用商店分发。系统开放性强，可实现更深度的系统集成。',
    pros: ['用户基数最大', '系统开放', '分发渠道多', '开发门槛较低'],
    cons: ['设备碎片化', '审核相对宽松但渠道复杂', '付费率较低'],
    recommendReason: '适合需要覆盖最大用户量、快速获取市场的项目',
  },
  {
    type: 'desktop',
    label: '桌面应用',
    icon: Monitor,
    description: 'Windows/Mac 客户端',
    details: '为专业用户和重度工作者打造，适合需要大量数据处理、复杂交互或长时间使用的生产力工具。',
    pros: ['性能最强', '功能无限制', '适合专业场景', '可离线使用'],
    cons: ['开发成本高', '需要分别适配 Win/Mac', '分发难度大'],
    recommendReason: '适合面向专业用户、需要高性能和复杂交互的工具类项目',
  },
];

// 根据项目信息智能推荐平台
function getPlatformRecommendation(project: Project): { platform: PlatformType; reason: string } {
  const pain = project.painPoint.toLowerCase();
  const title = project.title.toLowerCase();
  const text = pain + ' ' + title;

  if (/微信|小程序|社交|群|朋友圈|扫码|附近/.test(text)) {
    return { platform: 'miniapp', reason: '项目关键词匹配小程序生态（微信/社交/扫码）' };
  }
  if (/相机|拍照|定位|导航|地图|传感器|原生|推送/.test(text)) {
    return { platform: 'ios', reason: '项目需要调用手机原生能力（相机/定位/推送）' };
  }
  if (/工具|效率|办公|设计|剪辑|数据处理|桌面/.test(text)) {
    return { platform: 'desktop', reason: '项目面向专业工作者，适合桌面端重度使用场景' };
  }
  if (/安卓|android|小米|华为|oppo|vivo|三星/.test(text)) {
    return { platform: 'android', reason: '目标用户明确为 Android 用户群体' };
  }

  return { platform: 'web', reason: 'Web 是最快验证想法的选择，无需审核、跨平台、易于传播' };
}

const PRIORITY_CONFIG = {
  P0: { label: 'P0 核心', color: 'bg-red-500 text-white', desc: 'MVP必须' },
  P1: { label: 'P1 重要', color: 'bg-brutal-warning text-brutal-bg', desc: '有则更好' },
  P2: { label: 'P2 可选', color: 'bg-brutal-muted text-brutal-bg', desc: '后续迭代' },
};

const DEFAULT_TEMPLATES: DesignTemplate[] = [
  {
    id: 'dashboard',
    name: '简洁仪表板',
    description: '数据展示为主，侧边导航栏',
    prompt: '创建一个简洁的仪表板界面，左侧深色导航栏，右侧主内容区。使用卡片布局展示数据，整体风格现代简约。',
  },
  {
    id: 'cards',
    name: '卡片列表',
    description: '信息流展示，适合内容型产品',
    prompt: '设计一个卡片式列表界面，每个卡片包含标题、描述和标签。支持网格和列表两种视图切换，适合展示大量内容条目。',
  },
  {
    id: 'timeline',
    name: '时间轴',
    description: '按时间线展示，适合日志/历史',
    prompt: '创建一个垂直时间轴界面，每个节点显示时间和事件。左侧时间线，右侧内容卡片，支持展开查看详情。',
  },
  {
    id: 'landing',
    name: '落地页',
    description: '营销导向，突出卖点',
    prompt: '设计一个产品落地页，包含 Hero 区域、功能特性、定价、用户评价和 CTA。强调转化，使用渐变背景。',
  },
];

export function PrototypeStage({ project, onUpdateContent, isLocked, onToggleLock, onDirtyChange }: PrototypeStageProps) {
  const { t } = useI18n();
  const [data, setData] = useState<PrototypeData>({
    features: [],
    releaseChecklist: { domain: false, ssl: false, payment: false, analytics: false, feedback: false },
  });
  const [currentStep, setCurrentStep] = useState<'platform' | 'template' | 'features'>('platform');
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [showAddFeature, setShowAddFeature] = useState(false);

  useEffect(() => {
    onDirtyChange?.(showAddFeature);
  }, [showAddFeature, onDirtyChange]);

  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

  // 表单状态
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeaturePriority, setNewFeaturePriority] = useState<'P0' | 'P1' | 'P2'>('P1');

  useEffect(() => {
    const prototypeStage = project.stages?.prototype;
    if (prototypeStage?.content) {
      try {
        const parsed = JSON.parse(prototypeStage.content);
        if (parsed && typeof parsed === 'object') {
          setData({
            selectedPlatform: parsed.selectedPlatform,
            selectedTemplate: parsed.selectedTemplate,
            features: parsed.features || [],
            techStack: parsed.techStack,
            designPrompt: parsed.designPrompt,
            releaseChecklist: parsed.releaseChecklist || {
              domain: false, ssl: false, payment: false, analytics: false, feedback: false,
            },
          });
          // 根据已有数据设置当前步骤
          if (parsed.selectedPlatform && parsed.selectedTemplate && parsed.features?.length > 0) {
            setCurrentStep('features');
          } else if (parsed.selectedPlatform) {
            setCurrentStep('template');
          }
          return;
        }
      } catch {
        // 解析失败
      }
    }
    // content 为空时不自动创建默认值
    setData({
      features: [],
      releaseChecklist: { domain: false, ssl: false, payment: false, analytics: false, feedback: false },
    });
    setCurrentStep('platform');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.stages?.prototype?.content]);

  // 保存数据
  const saveData = async (newData: PrototypeData) => {
    const content = JSON.stringify(newData);
    await onUpdateContent(content);
  };

  // 选择平台
  const selectPlatform = async (platform: PlatformType) => {
    const newData = { ...data, selectedPlatform: platform };
    setData(newData);
    await saveData(newData);
    setCurrentStep('template');
  };

  // 选择模板
  const selectTemplate = async (templateId: string) => {
    const template = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    const newData = {
      ...data,
      selectedTemplate: templateId,
      designPrompt: template?.prompt,
    };
    setData(newData);
    await saveData(newData);
    setCurrentStep('features');
  };

  // 生成设计提示词
  const generateDesignPrompt = async () => {
    if (!data.selectedPlatform || !data.selectedTemplate) return;

    setGeneratingPrompt(true);
    try {
      const platform = PLATFORMS.find(p => p.type === data.selectedPlatform);
      const template = DEFAULT_TEMPLATES.find(t => t.id === data.selectedTemplate);

      const prompt = await aiService.generateDesignPrompt(
        project.title,
        project.painPoint,
        platform?.label || 'Web',
        template?.name || '简洁界面'
      );

      const newData = { ...data, designPrompt: prompt };
      setData(newData);
      await saveData(newData);
    } catch (error) {
      console.error('Failed to generate prompt:', error);
    } finally {
      setGeneratingPrompt(false);
    }
  };

  // 添加功能
  const addFeature = async () => {
    if (!newFeatureName.trim()) return;

    const newFeature: Feature = {
      id: Date.now().toString(),
      name: newFeatureName,
      priority: newFeaturePriority,
      status: 'todo',
      notes: '',
      order: data.features.length,
    };

    const newData = { ...data, features: [...data.features, newFeature] };
    setData(newData);
    await saveData(newData);

    setNewFeatureName('');
    setNewFeaturePriority('P1');
    setShowAddFeature(false);
  };

  // 删除功能
  const deleteFeature = async (id: string) => {
    const newFeatures = data.features.filter(f => f.id !== id).map((f, idx) => ({ ...f, order: idx }));
    const newData = { ...data, features: newFeatures };
    setData(newData);
    await saveData(newData);
  };

  // 更新功能
  const updateFeature = async (id: string, updates: Partial<Feature>) => {
    const newFeatures = data.features.map(f => f.id === id ? { ...f, ...updates } : f);
    const newData = { ...data, features: newFeatures };
    setData(newData);
    await saveData(newData);
  };

  // 移动功能顺序
  const moveFeature = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === data.features.length - 1) return;

    const newFeatures = [...data.features];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFeatures[index], newFeatures[targetIndex]] = [newFeatures[targetIndex], newFeatures[index]];

    // 更新 order
    newFeatures.forEach((f, i) => { f.order = i; });

    const newData = { ...data, features: newFeatures };
    setData(newData);
    await saveData(newData);
  };

  // 获取 AI 建议
  const getAiSuggestion = async () => {
    setIsGeneratingSuggestion(true);
    try {
      const suggestion = await aiService.analyzeFeatures(
        project.title,
        data.features
      );
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to get suggestion:', error);
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  // 更新检查清单
  const updateChecklist = async (key: keyof PrototypeData['releaseChecklist'], value: boolean) => {
    const newChecklist = { ...data.releaseChecklist, [key]: value };
    const newData = { ...data, releaseChecklist: newChecklist };
    setData(newData);
    await saveData(newData);
  };

  // 获取完成进度
  const p0Total = data.features.filter(f => f.priority === 'P0').length;
  const p0Done = data.features.filter(f => f.priority === 'P0' && f.status === 'done').length;
  const checklistDone = Object.values(data.releaseChecklist).filter(Boolean).length;
  const checklistTotal = Object.keys(data.releaseChecklist).length;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-brutal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-brutal-border bg-brutal-surface">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-brutal-accent" />
          <span className="font-mono text-sm">{t('stage.prototype')}</span>
          <span className="text-xs text-brutal-muted">
            ({p0Done}/{p0Total} P0完成)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isLocked && (
            <button
              onClick={getAiSuggestion}
              disabled={isGeneratingSuggestion || data.features.length === 0}
              className="btn-brutal h-9 flex items-center gap-2 text-xs"
            >
              {isGeneratingSuggestion ? (
                <div className="w-3 h-3 border border-brutal-text border-t-transparent animate-spin" />
              ) : (
                <span className="text-brutal-accent">✨</span>
              )}
              AI 建议
            </button>
          )}
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

      {/* Progress Steps */}
      <div className="flex items-center px-6 py-2 border-b border-brutal-border bg-brutal-surface/50">
        <StepIndicator
          step="platform"
          label="选择平台"
          current={currentStep}
          completed={!!data.selectedPlatform}
          onClick={() => setCurrentStep('platform')}
        />
        <ChevronRight className="w-4 h-4 text-brutal-muted mx-2" />
        <StepIndicator
          step="template"
          label="挑选设计"
          current={currentStep}
          completed={!!data.selectedTemplate}
          onClick={() => data.selectedPlatform && setCurrentStep('template')}
          disabled={!data.selectedPlatform}
        />
        <ChevronRight className="w-4 h-4 text-brutal-muted mx-2" />
        <StepIndicator
          step="features"
          label="功能开发"
          current={currentStep}
          completed={p0Done >= p0Total && p0Total > 0}
          onClick={() => data.selectedTemplate && setCurrentStep('features')}
          disabled={!data.selectedTemplate}
        />
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <div className="p-4 border-b border-brutal-border bg-brutal-surface/50">
          <div className="flex items-start gap-4">
            <pre className="text-xs text-brutal-accent font-mono leading-none flex-shrink-0">
              {AI_PET_ROBOT}
            </pre>
            <div className="flex-1">
              <p className="text-sm font-mono text-brutal-text whitespace-pre-line">
                {aiSuggestion}
              </p>
              <button
                onClick={() => setAiSuggestion(null)}
                className="text-xs text-brutal-muted hover:text-brutal-text mt-2"
              >
                [关闭]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {currentStep === 'platform' && (
          <PlatformSelector
            project={project}
            selected={data.selectedPlatform}
            onSelect={selectPlatform}
            disabled={isLocked}
          />
        )}

        {currentStep === 'template' && (
          <TemplateSelector
            selected={data.selectedTemplate}
            onSelect={selectTemplate}
            onBack={() => setCurrentStep('platform')}
            disabled={isLocked}
          />
        )}

        {currentStep === 'features' && (
          <div className="space-y-6">
            {/* Design Prompt Section */}
            <div className="border border-brutal-border bg-brutal-surface p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-brutal-accent" />
                  <span className="font-mono text-sm">设计提示词</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={generateDesignPrompt}
                    disabled={generatingPrompt}
                    className="btn-brutal h-9 flex items-center gap-2 text-xs"
                  >
                    {generatingPrompt ? (
                      <div className="w-3 h-3 border border-brutal-text border-t-transparent animate-spin" />
                    ) : (
                      <span className="text-brutal-accent">✨</span>
                    )}
                    AI 生成
                  </button>
                  {data.designPrompt && (
                    <button
                      onClick={() => navigator.clipboard.writeText(data.designPrompt || '')}
                      className="btn-brutal h-9 flex items-center gap-2 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      复制
                    </button>
                  )}
                </div>
              </div>
              {data.designPrompt ? (
                <div className="p-3 bg-brutal-bg border border-brutal-border font-mono text-xs text-brutal-muted whitespace-pre-wrap">
                  {data.designPrompt}
                </div>
              ) : (
                <div className="p-3 bg-brutal-bg border border-brutal-border font-mono text-xs text-brutal-muted">
                  点击 AI 生成按钮，根据选择的平台和模板生成设计提示词
                </div>
              )}
              {data.designPrompt && (
                <p className="mt-2 text-xs text-brutal-muted">
                  💡 提示：可复制到 Claude Code、Cursor 等工具生成代码
                </p>
              )}
            </div>

            {/* Feature List */}
            <div className="border border-brutal-border bg-brutal-surface">
              <div className="flex items-center justify-between px-4 py-3 border-b border-brutal-border">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-brutal-accent" />
                  <span className="font-mono text-sm">功能清单</span>
                </div>
                {!isLocked && (
                  <button
                    onClick={() => setShowAddFeature(true)}
                    className="btn-brutal h-9 flex items-center gap-2 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    添加功能
                  </button>
                )}
              </div>

              <div className="divide-y divide-brutal-border">
                {data.features.map((feature, index) => (
                  <FeatureRow
                    key={feature.id}
                    feature={feature}
                    index={index}
                    isLocked={isLocked}
                    onUpdate={(updates) => updateFeature(feature.id, updates)}
                    onDelete={() => deleteFeature(feature.id)}
                    onMove={(dir) => moveFeature(index, dir)}
                    totalFeatures={data.features.length}
                  />
                ))}
                {data.features.length === 0 && (
                  <div className="p-8 text-center text-brutal-muted font-mono text-sm flex flex-col items-center gap-4">
                    <span>还没有功能，点击"添加功能"开始规划</span>
                    {!isLocked && (
                      <button
                        onClick={() => {
                          try {
                            const ideaContent = project.stages?.idea?.content || '';
                            const ideaData = JSON.parse(ideaContent);
                            const solutionNote = ideaData?.find?.((n: { title: string }) =>
                              n.title?.includes('解决方案') || n.title?.includes('方案')
                            );
                            const defaultFeatures: Feature[] = [
                              { id: '1', name: '用户登录/注册', priority: 'P0', status: 'todo', notes: '基础账户系统', order: 0 },
                              { id: '2', name: solutionNote?.content?.slice(0, 30) || '核心功能', priority: 'P0', status: 'todo', notes: '继承自想法阶段的解决方案', order: 1 },
                              { id: '3', name: '基础设置', priority: 'P1', status: 'todo', notes: '用户偏好设置', order: 2 },
                            ];
                            const newData = { ...data, features: defaultFeatures };
                            setData(newData);
                            saveData(newData);
                          } catch {
                            const defaultFeatures: Feature[] = [
                              { id: '1', name: '用户登录/注册', priority: 'P0', status: 'todo', notes: '基础账户系统', order: 0 },
                              { id: '2', name: '核心功能模块', priority: 'P0', status: 'todo', notes: '主要业务逻辑', order: 1 },
                              { id: '3', name: '基础设置', priority: 'P1', status: 'todo', notes: '用户偏好设置', order: 2 },
                            ];
                            const newData = { ...data, features: defaultFeatures };
                            setData(newData);
                            saveData(newData);
                          }
                        }}
                        className="text-xs font-mono border border-brutal-accent text-brutal-accent px-3 py-1.5 hover:bg-brutal-accent/10 transition-colors"
                      >
                        从想法阶段导入功能
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Release Checklist */}
            <div className="border border-brutal-border bg-brutal-surface">
              <div className="flex items-center justify-between px-4 py-3 border-b border-brutal-border">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-brutal-accent" />
                  <span className="font-mono text-sm">发布检查清单</span>
                </div>
                <span className="text-xs font-mono text-brutal-muted">
                  {checklistDone}/{checklistTotal}
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(data.releaseChecklist).map(([key, checked]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
                      checked
                        ? 'border-brutal-success bg-brutal-success/10'
                        : 'border-brutal-border hover:border-brutal-accent'
                    } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => updateChecklist(key as keyof typeof data.releaseChecklist, e.target.checked)}
                      disabled={isLocked}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 border flex items-center justify-center text-brutal-bg ${
                      checked ? 'bg-brutal-success border-brutal-success' : 'border-brutal-muted'
                    }`}>
                      {checked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 5L4 8L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-mono">
                      {key === 'domain' && '域名配置'}
                      {key === 'ssl' && 'SSL 证书'}
                      {key === 'payment' && '支付测试'}
                      {key === 'analytics' && '分析工具'}
                      {key === 'feedback' && '反馈渠道'}
                    </span>
                  </label>
                ))}
              </div>
              {p0Done < p0Total && (
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 text-xs text-brutal-warning font-mono">
                    <AlertCircle className="w-4 h-4" />
                    <span>还有 {p0Total - p0Done} 个 P0 功能未完成，完成后才能发布</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Add Feature Modal */}
      {showAddFeature && (
        <Modal title="添加功能" onClose={() => setShowAddFeature(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2">
                功能名称
              </label>
              <input
                type="text"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
                placeholder="例如：用户登录、支付集成..."
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2">
                优先级
              </label>
              <div className="flex gap-2">
                {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewFeaturePriority(p)}
                    className={`flex-1 py-2 text-xs font-mono border ${
                      newFeaturePriority === p
                        ? PRIORITY_CONFIG[p].color
                        : 'border-brutal-border'
                    }`}
                  >
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddFeature(false)}
                className="flex-1 btn-brutal h-9 py-2"
              >
                取消
              </button>
              <button
                onClick={addFeature}
                disabled={!newFeatureName.trim()}
                className="flex-1 btn-brutal-primary h-9 py-2"
              >
                添加
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// 子组件：步骤指示器
function StepIndicator({
  step,
  label,
  current,
  completed,
  onClick,
  disabled,
}: {
  step: string;
  label: string;
  current: string;
  completed: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const isActive = current === step;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 text-xs font-mono ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${
        isActive
          ? 'text-brutal-accent font-bold'
          : completed
          ? 'text-brutal-success'
          : 'text-brutal-muted'
      }`}
    >
      <span className={`w-5 h-5 flex items-center justify-center border ${
        isActive
          ? 'border-brutal-accent bg-brutal-accent text-brutal-bg'
          : completed
          ? 'border-brutal-success bg-brutal-success text-brutal-bg'
          : 'border-brutal-border'
      }`}>
        {completed ? <Check className="w-3 h-3" /> : step[0].toUpperCase()}
      </span>
      {label}
    </button>
  );
}

// 子组件：平台选择器
function PlatformSelector({
  project,
  selected,
  onSelect,
  disabled,
}: {
  project: Project;
  selected?: PlatformType;
  onSelect: (p: PlatformType) => void;
  disabled: boolean;
}) {
  const recommendation = getPlatformRecommendation(project);

  return (
    <div className="max-w-5xl mx-auto">
      {/* 顶部引导 */}
      <div className="mb-6">
        <h3 className="text-sm font-mono font-bold text-brutal-text mb-2">
          选择目标平台
        </h3>
        <p className="text-xs font-mono text-brutal-muted">
          平台决定技术方案、用户体验和分发策略。根据你的项目特点，系统给出了推荐建议。
        </p>
      </div>

      {/* 智能推荐提示 */}
      <div className="mb-6 p-3 border border-brutal-accent bg-brutal-accent/5 flex items-start gap-3">
        <span className="text-brutal-accent text-lg">💡</span>
        <div>
          <span className="text-xs font-mono text-brutal-accent font-bold">
            推荐方案：{PLATFORMS.find(p => p.type === recommendation.platform)?.label}
          </span>
          <p className="text-xs font-mono text-brutal-muted mt-1">
            {recommendation.reason}
          </p>
        </div>
      </div>

      {/* 平台卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const isSelected = selected === platform.type;
          const isRecommended = recommendation.platform === platform.type;

          return (
            <button
              key={platform.type}
              onClick={() => !disabled && onSelect(platform.type)}
              disabled={disabled}
              className={`group p-5 border-2 text-left transition-all ${
                isSelected
                  ? 'border-brutal-accent bg-brutal-accent/10'
                  : isRecommended
                  ? 'border-brutal-accent/40 hover:border-brutal-accent'
                  : 'border-brutal-border hover:border-brutal-accent/50'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {/* 头部：图标 + 标签 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Icon className={`w-7 h-7 ${isSelected ? 'text-brutal-accent' : 'text-brutal-muted group-hover:text-brutal-text'}`} />
                  <h4 className="font-mono font-bold text-sm text-brutal-text">{platform.label}</h4>
                </div>
                {isRecommended && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-brutal-accent text-brutal-bg font-mono">
                    推荐
                  </span>
                )}
              </div>

              {/* 一句话描述 */}
              <p className="text-xs font-mono text-brutal-muted mb-3">
                {platform.description}
              </p>

              {/* 详细说明 */}
              <p className="text-[11px] font-mono text-brutal-muted/70 mb-3 leading-relaxed">
                {platform.details}
              </p>

              {/* 推荐理由（仅推荐项显示） */}
              {isRecommended && platform.recommendReason && (
                <div className="mb-3 text-[11px] font-mono text-brutal-accent bg-brutal-accent/5 p-2 border border-brutal-accent/20">
                  {platform.recommendReason}
                </div>
              )}

              {/* 优劣势标签 */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {platform.pros.map(pro => (
                    <span key={pro} className="text-[10px] px-1.5 py-0.5 bg-brutal-success/10 text-brutal-success font-mono">
                      + {pro}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {platform.cons.map(con => (
                    <span key={con} className="text-[10px] px-1.5 py-0.5 bg-brutal-warning/10 text-brutal-warning font-mono">
                      - {con}
                    </span>
                  ))}
                </div>
              </div>

              {/* 选中指示器 */}
              {isSelected && (
                <div className="mt-3 flex items-center gap-2 text-xs font-mono text-brutal-accent">
                  <Check className="w-3 h-3" />
                  已选择
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 子组件：模板选择器
function TemplateSelector({
  selected,
  onSelect,
  onBack,
  disabled,
}: {
  selected?: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  disabled: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-mono text-brutal-text">
          选择设计模板（可选，用于生成提示词）
        </h3>
        <button onClick={onBack} className="btn-brutal h-9 text-xs">
          ← 返回
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {DEFAULT_TEMPLATES.map((template) => {
          const isSelected = selected === template.id;

          return (
            <button
              key={template.id}
              onClick={() => !disabled && onSelect(template.id)}
              disabled={disabled}
              className={`p-4 border-2 text-left transition-all ${
                isSelected
                  ? 'border-brutal-accent bg-brutal-accent/10'
                  : 'border-brutal-border hover:border-brutal-accent/50'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <div className="w-full h-20 bg-brutal-bg border border-brutal-border mb-3 flex items-center justify-center">
                <Layout className="w-8 h-8 text-brutal-muted" />
              </div>
              <h4 className="font-mono font-bold text-sm mb-1">{template.name}</h4>
              <p className="text-xs font-mono text-brutal-muted">{template.description}</p>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-brutal-muted font-mono">
        💡 选择模板后，可以使用 AI 生成详细的设计提示词
      </p>
    </div>
  );
}

// 子组件：功能行
function FeatureRow({
  feature,
  index,
  isLocked,
  onUpdate,
  onDelete,
  onMove,
  totalFeatures,
}: {
  feature: Feature;
  index: number;
  isLocked: boolean;
  onUpdate: (updates: Partial<Feature>) => void;
  onDelete: () => void;
  onMove: (dir: 'up' | 'down') => void;
  totalFeatures: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState(feature.notes);

  const priorityConfig = PRIORITY_CONFIG[feature.priority];

  const saveNotes = () => {
    onUpdate({ notes: editNotes });
    setIsEditing(false);
  };

  return (
    <div className="p-4 flex items-start gap-4 group">
      {/* Drag Handle */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <button
          onClick={() => onMove('up')}
          disabled={index === 0 || isLocked}
          className="text-brutal-muted hover:text-brutal-text disabled:opacity-30"
        >
          <ArrowUp className="w-3 h-3" />
        </button>
        <GripVertical className="w-4 h-4 text-brutal-muted cursor-grab" />
        <button
          onClick={() => onMove('down')}
          disabled={index === totalFeatures - 1 || isLocked}
          className="text-brutal-muted hover:text-brutal-text disabled:opacity-30"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-xs px-2 py-0.5 font-mono ${priorityConfig.color}`}>
            {priorityConfig.label}
          </span>
          <span className="font-mono text-sm text-brutal-text">{feature.name}</span>

          {!isLocked && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-1 text-brutal-muted hover:text-brutal-text"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-brutal-muted hover:text-brutal-warning"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Screenshot & Status & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <ImageUpload
            value={feature.screenshot}
            onChange={(base64) => onUpdate({ screenshot: base64 })}
            disabled={isLocked}
          />

          <select
            value={feature.status}
            onChange={(e) => onUpdate({ status: e.target.value as Feature['status'] })}
            disabled={isLocked}
            className="text-xs font-mono border border-brutal-border bg-brutal-bg px-2 py-1"
          >
            <option value="todo">待做</option>
            <option value="doing">进行中</option>
            <option value="done">已完成</option>
          </select>

          {feature.status === 'done' && (
            <span className="flex items-center gap-1 text-xs text-brutal-success">
              <Check className="w-3 h-3" />
              完成
            </span>
          )}

          {feature.referenceUrl && (
            <a
              href={feature.referenceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brutal-accent hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              参考
            </a>
          )}

          {feature.notes && !isEditing && (
            <span className="text-xs text-brutal-muted truncate">{feature.notes}</span>
          )}
        </div>

        {/* Edit Notes & Reference URL */}
        {isEditing && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="添加备注..."
              className="w-full p-2 border border-brutal-border bg-brutal-bg font-mono text-xs"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={feature.referenceUrl || ''}
                onChange={(e) => onUpdate({ referenceUrl: e.target.value })}
                placeholder="参考链接 URL..."
                className="flex-1 p-2 border border-brutal-border bg-brutal-bg font-mono text-xs"
              />
              <button
                onClick={saveNotes}
                className="btn-brutal-primary h-9 px-3 py-1 text-xs"
              >
                <Save className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
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
      <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-md">
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
