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
  Sparkles,
  Eye,
  BookOpen,
  Lightbulb,
  Code2,
  Wand2,
  ArrowLeft,
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

// ============ 风格分类与参考项目数据 ============

interface StyleCategory {
  id: string;
  name: string;
  description: string;
  visualTraits: string[];
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

interface DesignReference {
  id: string;
  name: string;
  url: string;
  description: string;
  categoryId: string;
  keyFeatures: string[];
  tags: string[];
}

interface GeneratedSample {
  categoryId: string;
  name: string;
  description: string;
  prompt: string;
  generatedAt: number;
}

const STYLE_CATEGORIES: StyleCategory[] = [
  {
    id: 'minimal',
    name: '极简风',
    description: '极致简洁，留白为主，信息密度低但精准',
    visualTraits: ['大量留白', '单色或双色配色', '无装饰元素', '精确排版', '内容即设计'],
    colorClass: 'text-brutal-text',
    borderClass: 'border-brutal-border',
    bgClass: 'bg-brutal-bg',
  },
  {
    id: 'tech',
    name: '科技风',
    description: '深色主题，霓虹点缀，开发者友好',
    visualTraits: ['深色背景', '霓虹/荧光点缀色', '等宽字体', '代码块样式', '数据可视化'],
    colorClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
    bgClass: 'bg-cyan-950/20',
  },
  {
    id: 'cozy',
    name: '温馨风',
    description: '柔和暖色调，圆润元素，人文气息浓厚',
    visualTraits: ['暖色调（橙/粉/米）', '圆角设计', '手写体或柔和字体', '插画元素', '情感化文案'],
    colorClass: 'text-amber-600',
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-amber-50/10',
  },
  {
    id: 'industrial',
    name: '工业风',
    description: '粗粝质感，金属色调，结构感强',
    visualTraits: ['金属/混凝土纹理', '粗边框', '等宽字体', '高对比度', '网格系统'],
    colorClass: 'text-stone-500',
    borderClass: 'border-stone-500/30',
    bgClass: 'bg-stone-900/20',
  },
  {
    id: 'retro',
    name: '复古风',
    description: '怀旧像素，经典排版，旧时代美学',
    visualTraits: ['像素/点阵字体', '低保真色彩', '复古图标', '经典布局', '怀旧滤镜'],
    colorClass: 'text-purple-500',
    borderClass: 'border-purple-500/30',
    bgClass: 'bg-purple-950/20',
  },
  {
    id: 'nature',
    name: '自然风',
    description: '绿色系为主，有机形态，生态气息',
    visualTraits: ['绿色/大地色系', '有机曲线', '自然纹理', '手写字体', '植物元素'],
    colorClass: 'text-emerald-500',
    borderClass: 'border-emerald-500/30',
    bgClass: 'bg-emerald-950/20',
  },
];

const DESIGN_REFERENCES: DesignReference[] = [
  // === 极简风 ===
  {
    id: 'ref-linear',
    name: 'Linear',
    url: 'https://linear.app',
    description: 'Issue tracking 工具，深色极简设计的典范。信息层级清晰，交互细腻，是 SaaS 产品极简设计的标杆。',
    categoryId: 'minimal',
    keyFeatures: ['深色主题但保持通透感', '精确到像素的间距控制', '无多余装饰的组件设计', '流畅的微动效', '键盘优先的交互设计'],
    tags: ['SaaS', '深色', '生产力工具'],
  },
  {
    id: 'ref-notion',
    name: 'Notion',
    url: 'https://notion.so',
    description: '全能工作空间，白色极简设计的代表。内容即界面，通过排版和层级而非装饰来组织信息。',
    categoryId: 'minimal',
    keyFeatures: ['内容即设计的理念', '大量留白创造呼吸感', '简单的线框和分割线', '一致的排版层级', '轻量级图标系统'],
    tags: ['文档', '白色', '工作空间'],
  },
  {
    id: 'ref-figma',
    name: 'Figma',
    url: 'https://figma.com',
    description: '设计协作工具，现代工具类产品的极简典范。界面完全为内容服务，没有视觉噪音。',
    categoryId: 'minimal',
    keyFeatures: ['工具栏极简隐藏', '画布为中心的布局', '最小化 UI chrome', '中性灰调色板', '精准的 8px 网格系统'],
    tags: ['设计工具', '协作', '专业'],
  },
  // === 科技风 ===
  {
    id: 'ref-github',
    name: 'GitHub',
    url: 'https://github.com',
    description: '全球最大的开发者平台，深色科技风的经典代表。代码和数据驱动的界面设计。',
    categoryId: 'tech',
    keyFeatures: ['深色主题配高对比文字', '等宽字体展示代码', '绿色成功态和红色错误态', '数据密度高的信息架构', '标签页式代码浏览'],
    tags: ['开发者', '代码', '深色'],
  },
  {
    id: 'ref-vercel',
    name: 'Vercel',
    url: 'https://vercel.com',
    description: '前端部署平台，现代科技 SaaS 的设计标杆。深色背景配霓虹渐变，极具未来感。',
    categoryId: 'tech',
    keyFeatures: ['深色背景配霓虹渐变', '大面积留白与聚焦区域', '玻璃拟态效果', '部署状态可视化', '命令行风格的交互元素'],
    tags: ['SaaS', '部署', '现代'],
  },
  {
    id: 'ref-supabase',
    name: 'Supabase',
    url: 'https://supabase.com',
    description: '开源 Firebase 替代品，深色科技风与明亮品牌色（绿色）的完美结合。',
    categoryId: 'tech',
    keyFeatures: ['深色主题配品牌绿点缀', '代码片段展示', '终端/命令行视觉元素', '数据表格展示', '开发者文档风格'],
    tags: ['开源', '数据库', 'BaaS'],
  },
  // === 温馨风 ===
  {
    id: 'ref-spotify',
    name: 'Spotify',
    url: 'https://spotify.com',
    description: '音乐流媒体平台，深色背景上的温馨渐变封面，情感化音乐体验设计。',
    categoryId: 'cozy',
    keyFeatures: ['渐变封面色彩系统', '圆角卡片和按钮', '情感化播放界面', '柔和的阴影', '个性化推荐表达'],
    tags: ['音乐', '娱乐', '情感化'],
  },
  {
    id: 'ref-patreon',
    name: 'Patreon',
    url: 'https://patreon.com',
    description: '创作者支持平台，温暖的品牌色调（珊瑚色），强调社区和连接感。',
    categoryId: 'cozy',
    keyFeatures: ['温暖的珊瑚/橙色系', '创作者个人故事展示', '社区感排版', '亲切的手写体点缀', '圆润的 UI 元素'],
    tags: ['创作者', '社区', '支持'],
  },
  {
    id: 'ref-substack',
    name: 'Substack',
    url: 'https://substack.com',
    description: ' newsletter 平台，以阅读体验为核心，温馨舒适的排版设计。',
    categoryId: 'cozy',
    keyFeatures: ['阅读优先的排版', '温和的字体选择', '简单的配色（黑/白/橙）', '内容聚焦的布局', '人性化的推荐语'],
    tags: ['写作', '阅读', 'newsletter'],
  },
  // === 工业风 ===
  {
    id: 'ref-archdaily',
    name: 'ArchDaily',
    url: 'https://archdaily.com',
    description: '建筑资讯网站，结构化、网格化的信息呈现，强烈的编辑设计感。',
    categoryId: 'industrial',
    keyFeatures: ['严格的网格系统', '大标题 + 图片瀑布流', '黑白灰为主的色调', '建筑摄影展示', '理性的信息层级'],
    tags: ['建筑', '杂志', '摄影'],
  },
  {
    id: 'ref-awwwards',
    name: 'Awwwards',
    url: 'https://awwwards.com',
    description: '网页设计奖项平台，展示先锋设计作品，工业感与现代感并存。',
    categoryId: 'industrial',
    keyFeatures: ['大胆的排版比例', '黑白对比为主', '结构性网格布局', '作品展示导向', '评分和数据展示'],
    tags: ['设计', '奖项', '展示'],
  },
  // === 复古风 ===
  {
    id: 'ref-neocities',
    name: 'Neocities',
    url: 'https://neocities.org',
    description: '免费网页托管平台，鼓励个性化主页，保留了早期互联网的 DIY 精神。',
    categoryId: 'retro',
    keyFeatures: ['像素风格元素', '鲜艳的高对比色彩', '复古字体（如 MS Gothic）', '简单的表格布局', 'GIF 和像素画装饰'],
    tags: ['托管', '个人主页', 'DIY'],
  },
  {
    id: 'ref-cameronsworld',
    name: 'Camerons World',
    url: 'https://cameronsworld.net',
    description: '复古网页设计致敬网站，展示了 90 年代和 00 年代初的网页美学。',
    categoryId: 'retro',
    keyFeatures: ['星幕背景图案', '复古图标和按钮', 'marquee 滚动文字', '访客计数器', '拼贴式布局'],
    tags: ['艺术', '怀旧', '展示'],
  },
  // === 自然风 ===
  {
    id: 'ref-patagonia',
    name: 'Patagonia',
    url: 'https://patagonia.com',
    description: '户外品牌官网，大量使用自然摄影，绿色和大地色系，环保理念贯穿设计。',
    categoryId: 'nature',
    keyFeatures: ['全幅自然摄影', '大地色/绿色调色板', '环保理念文案', '粗犷的字体选择', '户外场景沉浸感'],
    tags: ['户外', '品牌', '环保'],
  },
  {
    id: 'ref-allbirds',
    name: 'Allbirds',
    url: 'https://allbirds.com',
    description: '可持续鞋履品牌，米色/灰色自然色调，简洁但温暖的产品展示。',
    categoryId: 'nature',
    keyFeatures: ['米白/浅灰自然色调', '产品材质特写', '可持续发展故事', '简洁的产品卡片', '柔和的光影'],
    tags: ['电商', '可持续', '品牌'],
  },
];

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
          if (parsed.selectedPlatform && parsed.selectedTemplate) {
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

  // 选择模板/风格（由 TemplateSelector 调用，传入已生成的提示词）
  const selectTemplate = async (templateId: string, prompt: string) => {
    const newData = {
      ...data,
      selectedTemplate: templateId,
      designPrompt: prompt,
    };
    setData(newData);
    await saveData(newData);
    setCurrentStep('features');
  };

  // 生成设计提示词（旧版兼容）
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
            project={project}
            selectedPlatform={data.selectedPlatform}
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

// 子组件：模板选择器（三栏布局：风格分类 | 参考列表 | 预览面板）
function TemplateSelector({
  project,
  selectedPlatform,
  onSelect,
  onBack,
  disabled,
}: {
  project: Project;
  selectedPlatform?: PlatformType;
  onSelect: (templateId: string, designPrompt: string) => void;
  onBack: () => void;
  disabled: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<string>(STYLE_CATEGORIES[0].id);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [generatedSamples, setGeneratedSamples] = useState<Record<string, GeneratedSample>>({});
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState<string>('');

  const activeCategoryData = STYLE_CATEGORIES.find(c => c.id === activeCategory)!;
  const categoryReferences = DESIGN_REFERENCES.filter(r => r.categoryId === activeCategory);
  const categorySample = generatedSamples[activeCategory];

  // 选中某个项目（参考或样板）
  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setPreviewPrompt('');
  };

  // AI 生成此风格样板
  const handleGenerateSample = async () => {
    if (!selectedPlatform) return;
    setIsGeneratingSample(true);
    try {
      const platform = PLATFORMS.find(p => p.type === selectedPlatform);
      const sample = await aiService.generateStyleSample(
        activeCategoryData.name,
        activeCategoryData.visualTraits,
        project.title,
        project.painPoint,
        platform?.label || 'Web'
      );
      const newSample: GeneratedSample = {
        categoryId: activeCategory,
        ...sample,
        generatedAt: Date.now(),
      };
      setGeneratedSamples(prev => ({ ...prev, [activeCategory]: newSample }));
      setSelectedItemId(`sample:${activeCategory}`);
      setPreviewPrompt(sample.prompt);
    } catch (error) {
      console.error('Failed to generate style sample:', error);
      alert('生成失败，请检查 AI 配置后重试');
    } finally {
      setIsGeneratingSample(false);
    }
  };

  // 基于参考项目生成提示词
  const handleGenerateFromReference = async (ref: DesignReference) => {
    if (!selectedPlatform) return;
    setIsGeneratingPrompt(true);
    try {
      const platform = PLATFORMS.find(p => p.type === selectedPlatform);
      const prompt = await aiService.generatePromptFromReference(
        ref.name,
        ref.keyFeatures,
        ref.url,
        project.title,
        project.painPoint,
        platform?.label || 'Web'
      );
      setPreviewPrompt(prompt);
    } catch (error) {
      console.error('Failed to generate prompt from reference:', error);
      alert('生成失败，请检查 AI 配置后重试');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // 使用当前选中的风格
  const handleUseStyle = () => {
    if (!selectedItemId) return;
    const sampleCategoryId = selectedItemId.startsWith('sample:') ? selectedItemId.slice(7) : null;
    let prompt = previewPrompt || (sampleCategoryId
      ? generatedSamples[sampleCategoryId]?.prompt || ''
      : '');
    // 如果选择了参考项目但没有生成提示词，使用参考项目特征自动构建一个基础提示词
    if (!prompt && selectedRef) {
      prompt = `参考 ${selectedRef.name}（${selectedRef.url}）的设计风格，为产品「${project.title}」创建界面设计。\n\n核心设计特征：\n${selectedRef.keyFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\n平台：${PLATFORMS.find(p => p.type === selectedPlatform)?.label || 'Web'}\n\n请确保设计围绕核心痛点「${project.painPoint}」展开，在借鉴参考项目风格的同时保持功能导向。`;
    }
    if (!prompt) {
      alert('提示词尚未生成，请先生成提示词');
      return;
    }
    onSelect(selectedItemId, prompt);
  };

  // 判断当前选中的项目
  const selectedRef = categoryReferences.find(r => r.id === selectedItemId);
  const selectedSample = selectedItemId?.startsWith('sample:')
    ? generatedSamples[selectedItemId.slice(7)]
    : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-brutal-border bg-brutal-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <Palette className="w-4 h-4 text-brutal-accent" />
          <h3 className="text-sm font-mono font-bold text-brutal-text">
            设计风格选择
          </h3>
          <span className="text-xs font-mono text-brutal-muted">
            选择风格 → 浏览参考 → 生成提示词
          </span>
        </div>
        <button onClick={onBack} className="btn-brutal h-9 flex items-center gap-2 text-xs">
          <ArrowLeft className="w-3 h-3" />
          返回
        </button>
      </div>

      {/* 三栏主体 */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 左栏：风格分类 */}
        <div className="w-56 border-r border-brutal-border bg-brutal-surface/50 flex-shrink-0 overflow-y-auto">
          <div className="p-3">
            <p className="text-[10px] font-mono text-brutal-muted mb-3 uppercase tracking-wider">
              风格分类
            </p>
            <div className="space-y-1">
              {STYLE_CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSelectedItemId(null);
                      setPreviewPrompt('');
                    }}
                    className={`w-full text-left p-3 border transition-all ${
                      isActive
                        ? `${cat.borderClass} ${cat.bgClass}`
                        : 'border-transparent hover:border-brutal-border/50'
                    }`}
                  >
                    <div className={`text-sm font-mono font-bold ${isActive ? cat.colorClass : 'text-brutal-text'}`}>
                      {cat.name}
                    </div>
                    <p className="text-[10px] font-mono text-brutal-muted mt-1 leading-relaxed">
                      {cat.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cat.visualTraits.slice(0, 2).map(trait => (
                        <span key={trait} className="text-[9px] px-1 py-0.5 bg-brutal-bg border border-brutal-border font-mono text-brutal-muted">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 中栏：参考项目 + AI样板 */}
        <div className="w-80 border-r border-brutal-border bg-brutal-bg flex-shrink-0 overflow-y-auto">
          <div className="p-4">
            {/* AI 生成样板区域 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-3 h-3 text-brutal-accent" />
                <span className="text-xs font-mono font-bold text-brutal-text">AI 风格样板</span>
              </div>

              {categorySample ? (
                <button
                  onClick={() => handleSelectItem(`sample:${activeCategory}`)}
                  className={`w-full p-4 border-2 text-left transition-all ${
                    selectedItemId === `sample:${activeCategory}`
                      ? 'border-brutal-accent bg-brutal-accent/10'
                      : 'border-brutal-border hover:border-brutal-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3 h-3 text-brutal-accent" />
                    <span className="text-sm font-mono font-bold text-brutal-text">
                      {categorySample.name}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-brutal-muted leading-relaxed line-clamp-3">
                    {categorySample.description}
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-brutal-accent">
                    点击预览完整提示词 →
                  </div>
                </button>
              ) : (
                <button
                  onClick={handleGenerateSample}
                  disabled={isGeneratingSample || disabled}
                  className="w-full p-4 border-2 border-dashed border-brutal-border hover:border-brutal-accent/50 transition-all text-center disabled:opacity-50"
                >
                  {isGeneratingSample ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-4 h-4 border border-brutal-text border-t-transparent animate-spin" />
                      <span className="text-xs font-mono text-brutal-muted">AI 正在生成样板...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Wand2 className="w-5 h-5 text-brutal-muted" />
                      <span className="text-xs font-mono text-brutal-accent">
                        生成 {activeCategoryData.name} 样板
                      </span>
                      <span className="text-[10px] font-mono text-brutal-muted">
                        基于你的项目信息定制
                      </span>
                    </div>
                  )}
                </button>
              )}
            </div>

            {/* 公开参考项目 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-3 h-3 text-brutal-accent" />
                <span className="text-xs font-mono font-bold text-brutal-text">公开参考项目</span>
              </div>
              <div className="space-y-2">
                {categoryReferences.map(ref => (
                  <button
                    key={ref.id}
                    data-testid="design-reference-item"
                    onClick={() => handleSelectItem(ref.id)}
                    className={`w-full p-3 border text-left transition-all ${
                      selectedItemId === ref.id
                        ? 'border-brutal-accent bg-brutal-accent/10'
                        : 'border-brutal-border hover:border-brutal-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-mono font-bold text-brutal-text">
                        {ref.name}
                      </span>
                      <ExternalLink className="w-3 h-3 text-brutal-muted" />
                    </div>
                    <p className="text-[11px] font-mono text-brutal-muted leading-relaxed line-clamp-2">
                      {ref.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ref.tags.map(tag => (
                        <span key={tag} className="text-[9px] px-1 py-0.5 bg-brutal-surface border border-brutal-border font-mono text-brutal-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右栏：预览面板 */}
        <div className="flex-1 bg-brutal-surface/30 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedItemId && (
              <div className="h-full">
                {activeCategory ? (
                  <div className="space-y-6 py-2">
                    {/* 风格概览 */}
                    <div className="border border-brutal-border bg-brutal-surface p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-3 h-3 ${activeCategoryData.bgClass} border ${activeCategoryData.borderClass}`} />
                        <h4 className={`text-base font-mono font-bold ${activeCategoryData.colorClass}`}>
                          {activeCategoryData.name}
                        </h4>
                      </div>
                      <p className="text-xs font-mono text-brutal-muted mb-4 leading-relaxed">
                        {activeCategoryData.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeCategoryData.visualTraits.map(trait => (
                          <span key={trait} className="text-[10px] px-2 py-1 border border-brutal-border bg-brutal-bg font-mono text-brutal-muted">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 视觉特征示意 */}
                    <div className="border border-brutal-border bg-brutal-surface p-4">
                      <p className="text-[10px] font-mono text-brutal-muted uppercase tracking-wider mb-3">
                        视觉特征示意
                      </p>
                      <div className="border border-brutal-border/50 bg-brutal-bg p-4" style={{ minHeight: '120px' }}>
                        {activeCategory === 'minimal' && (
                          <div className="space-y-4">
                            <div className="h-px bg-brutal-border/30 w-full" />
                            <div className="space-y-2">
                              <div className="h-1.5 bg-brutal-text/10 w-3/4" />
                              <div className="h-1.5 bg-brutal-text/5 w-1/2" />
                              <div className="h-1.5 bg-brutal-text/5 w-2/3" />
                            </div>
                            <div className="pt-3">
                              <div className="h-5 border border-brutal-border/30 w-16" />
                            </div>
                          </div>
                        )}
                        {activeCategory === 'tech' && (
                          <div className="space-y-2 bg-black/40 p-3 border border-cyan-500/20">
                            <div className="flex gap-1">
                              <div className="h-1 bg-cyan-400/40 w-6" />
                              <div className="h-1 bg-cyan-400/20 w-10" />
                              <div className="h-1 bg-cyan-400/30 w-4" />
                            </div>
                            <div className="font-mono text-[10px] text-cyan-400/50">{'>'} system.init()</div>
                            <div className="grid grid-cols-3 gap-1 mt-2">
                              <div className="h-4 bg-cyan-400/10" />
                              <div className="h-4 bg-cyan-400/20" />
                              <div className="h-4 bg-cyan-400/10" />
                            </div>
                          </div>
                        )}
                        {activeCategory === 'cozy' && (
                          <div className="space-y-3 bg-amber-950/10 p-3 border border-amber-500/20">
                            <div className="h-1.5 bg-amber-600/20 w-2/3" />
                            <div className="h-1.5 bg-amber-600/10 w-1/2" />
                            <div className="flex gap-2 pt-1">
                              <div className="h-6 border border-amber-500/20 w-10" />
                              <div className="h-6 border border-amber-500/20 w-10" />
                            </div>
                          </div>
                        )}
                        {activeCategory === 'industrial' && (
                          <div className="space-y-2 bg-stone-900/20 p-3 border-2 border-stone-500/30">
                            <div className="h-2 bg-stone-500/20 w-full" />
                            <div className="grid grid-cols-4 gap-1">
                              <div className="h-3 bg-stone-500/10" />
                              <div className="h-3 bg-stone-500/10" />
                              <div className="h-3 bg-stone-500/10" />
                              <div className="h-3 bg-stone-500/10" />
                            </div>
                            <div className="h-px bg-stone-500/30 w-full" />
                            <div className="h-1.5 bg-stone-500/15 w-3/4" />
                          </div>
                        )}
                        {activeCategory === 'retro' && (
                          <div className="space-y-2 bg-purple-950/20 p-3 border border-purple-500/30">
                            <div className="font-mono text-[10px] text-purple-400/60">{'>>'} LOAD "DESIGN"</div>
                            <div className="h-1 bg-purple-400/20 w-1/2" />
                            <div className="h-1 bg-purple-400/10 w-3/4" />
                            <div className="grid grid-cols-4 gap-1 mt-1">
                              {[...Array(8)].map((_, i) => (
                                <div key={i} className="h-2 bg-purple-400/15" />
                              ))}
                            </div>
                          </div>
                        )}
                        {activeCategory === 'nature' && (
                          <div className="space-y-3 bg-emerald-950/10 p-3 border border-emerald-500/20">
                            <div className="flex items-end gap-2">
                              <div className="w-1 h-4 bg-emerald-500/30" />
                              <div className="w-1 h-6 bg-emerald-500/40" />
                              <div className="w-1 h-3 bg-emerald-500/20" />
                              <div className="w-1 h-5 bg-emerald-500/35" />
                            </div>
                            <div className="h-px bg-emerald-500/20 w-full" />
                            <div className="h-1.5 bg-emerald-600/10 w-2/3" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 引导提示 */}
                    <div className="border border-brutal-accent/30 bg-brutal-accent/5 p-4">
                      <p className="text-xs font-mono text-brutal-accent leading-relaxed">
                        → 在中间栏选择一个参考项目，或点击「生成 AI 样板」来创建定制化设计方向，然后在此处预览详情并生成提示词
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-20">
                    <Eye className="w-10 h-10 text-brutal-muted/30" />
                    <div>
                      <p className="text-sm font-mono text-brutal-muted mb-1">
                        在左侧选择一个风格分类
                      </p>
                      <p className="text-xs font-mono text-brutal-muted/60">
                        浏览设计方向并生成定制提示词
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedItemId && (
              <div className="space-y-4">
                {/* 预览头部 */}
                <div className="border border-brutal-border bg-brutal-surface p-4">
                  {selectedSample && (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-brutal-accent" />
                        <h4 className="text-sm font-mono font-bold text-brutal-text">
                          {selectedSample.name}
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.5 bg-brutal-accent text-brutal-bg font-mono">
                          AI 生成
                        </span>
                      </div>
                      <p className="text-xs font-mono text-brutal-muted mb-3">
                        {selectedSample.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {activeCategoryData.visualTraits.map(trait => (
                          <span key={trait} className="text-[10px] px-2 py-0.5 border border-brutal-border bg-brutal-bg font-mono text-brutal-muted">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedRef && (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-brutal-accent" />
                          <h4 className="text-sm font-mono font-bold text-brutal-text">
                            {selectedRef.name}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.5 bg-brutal-success/20 text-brutal-success border border-brutal-success/30 font-mono">
                            公开项目
                          </span>
                        </div>
                        <a
                          href={selectedRef.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-brutal-accent hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          访问网站
                        </a>
                      </div>
                      <p className="text-xs font-mono text-brutal-muted mb-3">
                        {selectedRef.description}
                      </p>
                      <div className="space-y-2 mb-3">
                        <p className="text-[10px] font-mono text-brutal-muted uppercase tracking-wider">
                          关键设计特征
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedRef.keyFeatures.map(feature => (
                            <span key={feature} className="text-[10px] px-2 py-0.5 border border-brutal-border bg-brutal-bg font-mono text-brutal-muted">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedRef.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-brutal-surface border border-brutal-border font-mono text-brutal-muted">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* 提示词生成区域 */}
                <div className="border border-brutal-border bg-brutal-surface">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-brutal-border">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-brutal-accent" />
                      <span className="text-sm font-mono font-bold text-brutal-text">
                        设计提示词
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {previewPrompt && (
                        <button
                          onClick={() => navigator.clipboard.writeText(previewPrompt)}
                          className="btn-brutal h-8 flex items-center gap-1.5 text-[10px]"
                        >
                          <Copy className="w-3 h-3" />
                          复制
                        </button>
                      )}
                      {selectedRef && !previewPrompt && (
                        <button
                          onClick={() => handleGenerateFromReference(selectedRef)}
                          disabled={isGeneratingPrompt}
                          className="btn-brutal h-8 flex items-center gap-1.5 text-[10px]"
                        >
                          {isGeneratingPrompt ? (
                            <div className="w-3 h-3 border border-brutal-text border-t-transparent animate-spin" />
                          ) : (
                            <Wand2 className="w-3 h-3 text-brutal-accent" />
                          )}
                          生成提示词
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    {previewPrompt ? (
                      <div className="p-3 bg-brutal-bg border border-brutal-border font-mono text-xs text-brutal-muted whitespace-pre-wrap max-h-80 overflow-y-auto">
                        {previewPrompt}
                      </div>
                    ) : selectedSample ? (
                      <div className="p-3 bg-brutal-bg border border-brutal-border font-mono text-xs text-brutal-muted whitespace-pre-wrap max-h-80 overflow-y-auto">
                        {selectedSample.prompt}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <Lightbulb className="w-6 h-6 text-brutal-muted/30 mx-auto mb-2" />
                        <p className="text-xs font-mono text-brutal-muted">
                          点击"生成提示词"按钮，AI 将基于此参考项目为你的产品定制设计提示词
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部固定操作区 */}
          {selectedItemId && (
            <div className="p-4 border-t border-brutal-border bg-brutal-surface flex-shrink-0 space-y-2">
              {selectedRef && !previewPrompt && !selectedSample && (
                <p className="text-[10px] font-mono text-brutal-muted">
                  提示：可直接使用此风格（将基于参考特征自动生成基础提示词），或点击上方「生成提示词」获取更定制化的方案
                </p>
              )}
              <div className="flex justify-end">
                <button
                  data-testid="use-style-button"
                  onClick={handleUseStyle}
                  disabled={disabled || (!previewPrompt && !selectedSample && !selectedRef)}
                  className="btn-brutal-primary h-10 px-6 flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  使用此风格
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
