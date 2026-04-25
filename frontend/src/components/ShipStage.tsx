import { useState, useEffect } from 'react';
import {
  Rocket,
  Check,
  Globe,
  Lock,
  CreditCard,
  BarChart3,
  MessageSquare,
  Share2,
  Plus,
  Copy,
  Star,
  Bug,
  TrendingUp,
  Users,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import { useI18n } from '../i18n/hooks';
import { aiService } from '../services/ai';
import { useProjectStore } from '../stores/projectStore';
import type { Project, ShipData, PlatformContent, UserFeedback, PrototypeData, Feature } from '../types';

interface ShipStageProps {
  project: Project;
  onUpdateContent: (content: string) => Promise<void>;
  isLocked: boolean;
  onToggleLock?: () => void;
}

const CHECKLIST_ITEMS = [
  { key: 'domain', label: '域名配置', icon: Globe },
  { key: 'ssl', label: 'SSL 证书', icon: Lock },
  { key: 'payment', label: '支付测试', icon: CreditCard },
  { key: 'analytics', label: '分析工具', icon: BarChart3 },
  { key: 'socialMedia', label: '社交媒体账号', icon: Share2 },
] as const;

const PLATFORMS = [
  { key: 'xiaohongshu', label: '小红书', color: '#fe2c55', icon: '红' },
  { key: 'twitter', label: 'Twitter/X', color: '#1da1f2', icon: 'T' },
  { key: 'producthunt', label: 'ProductHunt', color: '#da552f', icon: 'P' },
  { key: 'jike', label: '即刻', color: '#ffe411', icon: '即' },
  { key: 'v2ex', label: 'V2EX', color: '#1c1c1c', icon: 'V' },
  { key: 'wechat', label: '微信公众号', color: '#07c160', icon: '微' },
] as const;

export function ShipStage({ project, onUpdateContent, isLocked, onToggleLock }: ShipStageProps) {
  const { t } = useI18n();
  const [data, setData] = useState<ShipData>({
    checklist: { domain: false, ssl: false, payment: false, analytics: false, socialMedia: false },
    platformBindings: [],
    contents: [],
    metrics: { newUsers: 0, activeUsers: 0, feedbackCount: 0, bugReports: 0 },
    feedbacks: [],
  });
  const [generatingContent, setGeneratingContent] = useState<string | null>(null);
  const [showAddFeedback, setShowAddFeedback] = useState(false);
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [conversionMessage, setConversionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 表单状态
  const [newFeedback, setNewFeedback] = useState({ content: '', rating: 5, source: '' });
  const [metricsForm, setMetricsForm] = useState(data.metrics);

  useEffect(() => {
    const shipStage = project.stages?.ship;
    if (shipStage?.content) {
      try {
        const parsed = JSON.parse(shipStage.content);
        if (parsed && typeof parsed === 'object') {
          setData({
            checklist: parsed.checklist || { domain: false, ssl: false, payment: false, analytics: false, socialMedia: false },
            platformBindings: parsed.platformBindings || [],
            contents: parsed.contents || [],
            launchUrl: parsed.launchUrl,
            metrics: parsed.metrics || { newUsers: 0, activeUsers: 0, feedbackCount: 0, bugReports: 0 },
            feedbacks: parsed.feedbacks || [],
          });
          setMetricsForm(parsed.metrics || { newUsers: 0, activeUsers: 0, feedbackCount: 0, bugReports: 0 });
        }
      } catch {
        // 使用默认值
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // 保存数据
  const saveData = async (newData: ShipData) => {
    const content = JSON.stringify(newData);
    await onUpdateContent(content);
  };

  // 更新检查清单
  const updateChecklist = async (key: keyof ShipData['checklist'], value: boolean) => {
    const newChecklist = { ...data.checklist, [key]: value };
    const newData = { ...data, checklist: newChecklist };
    setData(newData);
    await saveData(newData);
  };

  // 计算检查清单进度
  const checklistProgress = Object.values(data.checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(data.checklist).length;

  // 生成平台文案
  const generatePlatformContent = async (platform: PlatformContent['platform']) => {
    setGeneratingContent(platform);
    try {
      const content = await aiService.generatePlatformContent(
        project.title,
        project.painPoint,
        platform
      );

      const newContent: PlatformContent = {
        platform,
        title: content.title,
        content: content.content,
        tags: content.tags,
      };

      const newData = {
        ...data,
        contents: [...data.contents.filter(c => c.platform !== platform), newContent],
      };
      setData(newData);
      await saveData(newData);
    } catch (error) {
      console.error('Failed to generate content:', error);
    } finally {
      setGeneratingContent(null);
    }
  };

  // 添加用户反馈
  const addFeedback = async () => {
    if (!newFeedback.content.trim()) return;

    const feedback: UserFeedback = {
      id: Date.now().toString(),
      content: newFeedback.content,
      rating: newFeedback.rating,
      source: newFeedback.source,
      createdAt: new Date().toISOString(),
    };

    const newMetrics = {
      ...data.metrics,
      feedbackCount: data.metrics.feedbackCount + 1,
    };

    const newData = {
      ...data,
      feedbacks: [feedback, ...data.feedbacks],
      metrics: newMetrics,
    };
    setData(newData);
    await saveData(newData);

    setNewFeedback({ content: '', rating: 5, source: '' });
    setShowAddFeedback(false);
  };

  // 保存指标
  const saveMetrics = async () => {
    const newData = { ...data, metrics: metricsForm };
    setData(newData);
    await saveData(newData);
    setEditingMetrics(false);
  };

  // 获取平台文案
  const getPlatformContent = (platform: string) => {
    return data.contents.find(c => c.platform === platform);
  };

  // 闭环反馈：将用户反馈转为原型阶段的功能项
  const [convertingFeedbackId, setConvertingFeedbackId] = useState<string | null>(null);

  const convertFeedbackToFeature = async (feedback: UserFeedback) => {
    setConvertingFeedbackId(feedback.id);
    setConversionMessage(null);
    try {
      const prototypeStage = project.stages?.prototype;
      let prototypeData: PrototypeData = {
        features: [],
        releaseChecklist: { domain: false, ssl: false, payment: false, analytics: false, feedback: false },
      };

      if (prototypeStage?.content) {
        try {
          const parsed = JSON.parse(prototypeStage.content);
          if (parsed && typeof parsed === 'object') {
            prototypeData = {
              features: parsed.features || [],
              selectedPlatform: parsed.selectedPlatform,
              selectedTemplate: parsed.selectedTemplate,
              techStack: parsed.techStack,
              designPrompt: parsed.designPrompt,
              releaseChecklist: parsed.releaseChecklist || { domain: false, ssl: false, payment: false, analytics: false, feedback: false },
            };
          }
        } catch {
          // 解析失败使用默认值
        }
      }

      const newFeature: Feature = {
        id: Date.now().toString(),
        name: feedback.content.slice(0, 40) || '用户反馈需求',
        priority: feedback.rating <= 2 ? 'P0' : 'P1',
        status: 'todo',
        notes: `来自用户反馈 (${feedback.source || '未知来源'}) - 评分: ${feedback.rating}/5`,
        order: prototypeData.features.length,
      };

      const updatedPrototypeData: PrototypeData = {
        ...prototypeData,
        features: [...prototypeData.features, newFeature],
      };

      await useProjectStore.getState().updateStageContent(project.id, 'prototype', JSON.stringify(updatedPrototypeData));
      setConversionMessage({ type: 'success', text: `已将该反馈转为原型阶段的功能项：${newFeature.name}` });
      setTimeout(() => setConversionMessage(null), 3000);
    } catch (error) {
      console.error('Failed to convert feedback:', error);
      setConversionMessage({ type: 'error', text: '流转失败，请重试' });
      setTimeout(() => setConversionMessage(null), 3000);
    } finally {
      setConvertingFeedbackId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-brutal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-brutal-border bg-brutal-surface">
        <div className="flex items-center gap-3">
          <Rocket className="w-4 h-4 text-brutal-accent" />
          <span className="font-mono text-sm">{t('stage.ship')}</span>
          <span className="text-xs text-brutal-muted">
            ({checklistProgress}/{checklistTotal} 检查项)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-brutal-accent">
            准备度: {Math.round((checklistProgress / checklistTotal) * 100)}%
          </span>
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full overflow-y-auto p-6 space-y-6">
          {/* Progress Bar */}
        <div className="border border-brutal-border bg-brutal-surface p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-brutal-muted">发布准备度</span>
            <span className="text-xs font-mono text-brutal-accent">{checklistProgress}/{checklistTotal}</span>
          </div>
          <div className="w-full h-2 bg-brutal-border">
            <div
              className="h-full bg-brutal-accent transition-all"
              style={{ width: `${(checklistProgress / checklistTotal) * 100}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="border border-brutal-border bg-brutal-surface">
          <div className="px-4 py-3 border-b border-brutal-border flex items-center gap-2">
            <Check className="w-4 h-4 text-brutal-accent" />
            <span className="font-mono text-sm">发布检查清单</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {CHECKLIST_ITEMS.map(({ key, label, icon: Icon }) => (
              <label
                key={key}
                className={`flex flex-col items-center gap-2 p-4 border cursor-pointer transition-colors ${
                  data.checklist[key as keyof typeof data.checklist]
                    ? 'border-brutal-success bg-brutal-success/10'
                    : 'border-brutal-border hover:border-brutal-accent'
                } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={data.checklist[key as keyof typeof data.checklist]}
                  onChange={(e) => updateChecklist(key as keyof typeof data.checklist, e.target.checked)}
                  disabled={isLocked}
                  className="sr-only"
                />
                <Icon className={`w-6 h-6 ${
                  data.checklist[key as keyof typeof data.checklist] ? 'text-brutal-success' : 'text-brutal-muted'
                }`} />
                <span className="text-xs font-mono text-center">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Platform Content Grid */}
        <div className="border border-brutal-border bg-brutal-surface">
          <div className="px-4 py-3 border-b border-brutal-border flex items-center gap-2">
            <Share2 className="w-4 h-4 text-brutal-accent" />
            <span className="font-mono text-sm">多平台文案</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => {
              const content = getPlatformContent(platform.key);
              const isGenerating = generatingContent === platform.key;

              return (
                <div
                  key={platform.key}
                  className="border border-brutal-border bg-brutal-bg"
                >
                  <div
                    className="px-3 py-2 flex items-center justify-between"
                    style={{ backgroundColor: platform.color + '20', borderBottom: `2px solid ${platform.color}` }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: platform.color, color: '#fff' }}
                      >
                        {platform.icon}
                      </span>
                      <span className="text-sm font-mono font-bold">{platform.label}</span>
                    </div>
                    <button
                      onClick={() => generatePlatformContent(platform.key as PlatformContent['platform'])}
                      disabled={isGenerating || isLocked}
                      className="text-xs btn-brutal h-9 px-2 py-1"
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : content ? (
                        '重新生成'
                      ) : (
                        '✨ 生成'
                      )}
                    </button>
                  </div>
                  <div className="p-3">
                    {content ? (
                      <>
                        <p className="text-xs font-mono font-bold mb-2">{content.title}</p>
                        <p className="text-xs font-mono text-brutal-muted whitespace-pre-wrap line-clamp-6 mb-3">
                          {content.content}
                        </p>
                        {content.tags && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {content.tags.map((tag, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-brutal-surface border border-brutal-border">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => navigator.clipboard.writeText(content.content)}
                          className="text-xs text-brutal-accent hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          复制文案
                        </button>
                      </>
                    ) : (
                      <p className="text-xs font-mono text-brutal-muted text-center py-8">
                        点击"生成"创建{platform.label}文案
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metrics & Feedback */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metrics */}
          <div className="border border-brutal-border bg-brutal-surface">
            <div className="px-4 py-3 border-b border-brutal-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brutal-accent" />
                <span className="font-mono text-sm">发布后数据</span>
              </div>
              {!isLocked && (
                <button
                  onClick={() => setEditingMetrics(!editingMetrics)}
                  className="text-xs btn-brutal h-9 px-2 py-1"
                >
                  {editingMetrics ? '取消' : '编辑'}
                </button>
              )}
            </div>
            <div className="p-4">
              {editingMetrics ? (
                <div className="space-y-3">
                  {Object.entries(metricsForm).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="text-xs font-mono text-brutal-muted w-24">
                        {key === 'newUsers' && '新增用户'}
                        {key === 'activeUsers' && '活跃用户'}
                        {key === 'feedbackCount' && '反馈数量'}
                        {key === 'bugReports' && 'Bug报告'}
                      </label>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setMetricsForm({ ...metricsForm, [key]: parseInt(e.target.value) || 0 })}
                        className="flex-1 p-2 border border-brutal-border bg-brutal-bg font-mono text-sm"
                      />
                    </div>
                  ))}
                  <button
                    onClick={saveMetrics}
                    className="w-full btn-brutal-primary h-9 py-2 text-xs"
                  >
                    保存
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard
                    icon={Users}
                    label="新增用户"
                    value={data.metrics.newUsers}
                  />
                  <MetricCard
                    icon={TrendingUp}
                    label="活跃用户"
                    value={data.metrics.activeUsers}
                  />
                  <MetricCard
                    icon={MessageSquare}
                    label="反馈数量"
                    value={data.metrics.feedbackCount}
                  />
                  <MetricCard
                    icon={Bug}
                    label="Bug报告"
                    value={data.metrics.bugReports}
                  />
                </div>
              )}
            </div>
          </div>

          {/* User Feedback */}
          <div className="border border-brutal-border bg-brutal-surface">
            <div className="px-4 py-3 border-b border-brutal-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brutal-accent" />
                <span className="font-mono text-sm">用户反馈</span>
              </div>
              {!isLocked && (
                <button
                  onClick={() => setShowAddFeedback(true)}
                  className="text-xs btn-brutal h-9 px-2 py-1"
                >
                  <Plus className="w-3 h-3" />
                  添加
                </button>
              )}
            </div>
            {conversionMessage && (
              <div className={`px-4 py-2 border-b text-xs font-mono ${
                conversionMessage.type === 'success'
                  ? 'border-brutal-success bg-brutal-success/10 text-brutal-success'
                  : 'border-brutal-error bg-brutal-error/10 text-brutal-error'
              }`}>
                {conversionMessage.text}
              </div>
            )}
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {data.feedbacks.length === 0 ? (
                <p className="text-xs font-mono text-brutal-muted text-center py-4">
                  暂无反馈，发布后收集用户意见
                </p>
              ) : (
                data.feedbacks.map((feedback) => (
                  <div key={feedback.id} className="p-3 border border-brutal-border bg-brutal-bg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < feedback.rating ? 'text-brutal-warning fill-brutal-warning' : 'text-brutal-border'}`}
                          />
                        ))}
                      </div>
                      {feedback.source && (
                        <span className="text-xs text-brutal-muted">来自 {feedback.source}</span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-brutal-text">{feedback.content}</p>
                    {!isLocked && (
                      <button
                        onClick={() => convertFeedbackToFeature(feedback)}
                        disabled={convertingFeedbackId === feedback.id}
                        className="mt-2 text-xs text-brutal-accent hover:underline flex items-center gap-1"
                      >
                        {convertingFeedbackId === feedback.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            流转中...
                          </>
                        ) : (
                          <>
                            <Rocket className="w-3 h-3" />
                            转为原型需求
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Add Feedback Modal */}
      {showAddFeedback && (
        <div className="fixed inset-0 bg-brutal-bg/90 flex items-center justify-center z-50 p-4">
          <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
              <span className="text-sm font-mono font-bold">添加用户反馈</span>
              <button onClick={() => setShowAddFeedback(false)} className="w-8 h-8 border border-brutal-border flex items-center justify-center">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">评分</label>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setNewFeedback({ ...newFeedback, rating: i + 1 })}
                      className="p-1"
                    >
                      <Star
                        className={`w-5 h-5 ${i < newFeedback.rating ? 'text-brutal-warning fill-brutal-warning' : 'text-brutal-border'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">来源</label>
                <input
                  type="text"
                  value={newFeedback.source}
                  onChange={(e) => setNewFeedback({ ...newFeedback, source: e.target.value })}
                  className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
                  placeholder="例如：ProductHunt、邮件..."
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">反馈内容</label>
                <textarea
                  value={newFeedback.content}
                  onChange={(e) => setNewFeedback({ ...newFeedback, content: e.target.value })}
                  className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm h-24 resize-none"
                  placeholder="用户说了什么..."
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddFeedback(false)} className="flex-1 btn-brutal h-9 py-2">取消</button>
                <button
                  onClick={addFeedback}
                  disabled={!newFeedback.content.trim()}
                  className="flex-1 btn-brutal-primary h-9 py-2"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="p-3 border border-brutal-border bg-brutal-bg flex items-center gap-3">
      <Icon className="w-5 h-5 text-brutal-accent" />
      <div>
        <p className="text-xs font-mono text-brutal-muted">{label}</p>
        <p className="text-lg font-mono font-bold text-brutal-text">{value}</p>
      </div>
    </div>
  );
}
