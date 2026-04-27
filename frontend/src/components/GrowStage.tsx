import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Plus,
  X,
  Check,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Edit3,
} from 'lucide-react';
import { useI18n } from '../i18n/hooks';
import { aiService } from '../services/ai';
import { MonthView } from './MonthView';
import type { Project, GrowData, ContentItem, ContentType, ChannelKey, ChannelMetrics } from '../types';

interface GrowStageProps {
  project: Project;
  onUpdateContent: (content: string) => Promise<void>;
  isLocked: boolean;
  onToggleLock?: () => void;
}

// AI 宠物 ASCII 形象
const AI_PET_CAT = `
    /\\_/\\
   ( o.o )
    > ^ <
`;

const CONTENT_TYPES: { type: ContentType; label: string; description: string }[] = [
  { type: 'tutorial', label: '教程', description: '如何使用产品' },
  { type: 'showcase', label: '展示', description: '功能亮点展示' },
  { type: 'story', label: '故事', description: '用户故事/案例' },
  { type: 'tech', label: '技术', description: '技术文章/实现' },
  { type: 'tips', label: '技巧', description: '使用技巧/小贴士' },
];

const CHANNELS: { key: ChannelKey; label: string; icon: string }[] = [
  { key: 'xiaohongshu', label: '小红书', icon: '红' },
  { key: 'twitter', label: 'Twitter', icon: 'T' },
  { key: 'jike', label: '即刻', icon: '即' },
  { key: 'v2ex', label: 'V2EX', icon: 'V' },
  { key: 'blog', label: '博客', icon: '博' },
  { key: 'producthunt', label: 'ProductHunt', icon: 'P' },
];

export function GrowStage({ project, onUpdateContent, isLocked, onToggleLock }: GrowStageProps) {
  const { t } = useI18n();
  const [data, setData] = useState<GrowData>({
    contentCalendar: [],
    channelMetrics: CHANNELS.map(c => ({ channel: c.key, newUsers: 0, totalUsers: 0, conversionRate: 0 })),
  });
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddContent, setShowAddContent] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 表单状态
  const [newContent, setNewContent] = useState<Partial<ContentItem>>({
    title: '',
    type: 'tutorial',
    channel: 'xiaohongshu',
    scheduledDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const growStage = project.stages?.grow;
    if (growStage?.content) {
      try {
        const parsed = JSON.parse(growStage.content);
        if (parsed && typeof parsed === 'object') {
          setData({
            contentCalendar: parsed.contentCalendar || [],
            channelMetrics: parsed.channelMetrics || CHANNELS.map(c => ({ channel: c.key, newUsers: 0, totalUsers: 0, conversionRate: 0 })),
          });
        }
      } catch {
        // 使用默认值
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // 保存数据
  const saveData = async (newData: GrowData) => {
    const content = JSON.stringify(newData);
    await onUpdateContent(content);
  };

  // 添加内容
  const addContent = async () => {
    if (!newContent.title?.trim()) return;

    const content: ContentItem = {
      id: Date.now().toString(),
      title: newContent.title,
      type: newContent.type as ContentType,
      channel: newContent.channel as ChannelKey,
      scheduledDate: newContent.scheduledDate || new Date().toISOString().split('T')[0],
      status: 'draft',
    };

    const newData = { ...data, contentCalendar: [...data.contentCalendar, content] };
    setData(newData);
    await saveData(newData);

    setNewContent({ title: '', type: 'tutorial', channel: 'xiaohongshu', scheduledDate: new Date().toISOString().split('T')[0] });
    setShowAddContent(false);
  };

  // 删除内容
  const deleteContent = async (id: string) => {
    const newData = { ...data, contentCalendar: data.contentCalendar.filter(c => c.id !== id) };
    setData(newData);
    await saveData(newData);
  };


  // 更新渠道数据
  const updateChannelMetrics = async (channel: ChannelKey, updates: Partial<ChannelMetrics>) => {
    const newData = {
      ...data,
      channelMetrics: data.channelMetrics.map(m => m.channel === channel ? { ...m, ...updates } : m),
    };
    setData(newData);
    await saveData(newData);
  };

  // AI 生成内容建议
  const generateContentIdea = async () => {
    setGeneratingContent(true);
    try {
      const idea = await aiService.generateContentIdea(project.title, project.painPoint);
      setNewContent({ ...newContent, title: idea });
    } catch (error) {
      console.error('Failed to generate idea:', error);
    } finally {
      setGeneratingContent(false);
    }
  };

  // AI 分析
  const getAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await aiService.analyzeGrowth(project.title, data.channelMetrics);
      setAiSuggestion(analysis);
    } catch (error) {
      console.error('Failed to get analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 按周获取内容
  const getWeekContents = (weekOffset: number) => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return data.contentCalendar.filter(c => {
      const date = new Date(c.scheduledDate);
      return date >= weekStart && date < weekEnd;
    });
  };

  // 获取本周内容
  const weekContents = getWeekContents(currentWeek);

  // 计算发布统计
  const publishedCount = data.contentCalendar.filter(c => c.status === 'published').length;
  const scheduledCount = data.contentCalendar.filter(c => c.status === 'scheduled').length;
  const draftCount = data.contentCalendar.filter(c => c.status === 'draft').length;

  return (
    <div className="h-full flex flex-col bg-brutal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-brutal-border bg-brutal-surface">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-brutal-accent" />
          <span className="font-mono text-sm">{t('stage.grow')}</span>
          <span className="text-xs text-brutal-muted">
            ({publishedCount} 已发布, {scheduledCount} 计划中)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={getAIAnalysis}
            disabled={isAnalyzing}
            className="btn-brutal h-9 flex items-center gap-2 text-xs"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
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

      {/* AI Suggestion */}
      {aiSuggestion && (
        <div className="p-4 border-b border-brutal-border bg-brutal-surface/50">
          <div className="flex items-start gap-4">
            <pre className="text-xs text-brutal-accent font-mono leading-none flex-shrink-0">
              {AI_PET_CAT}
            </pre>
            <div className="flex-1">
              <p className="text-sm font-mono text-brutal-text whitespace-pre-line">{aiSuggestion}</p>
              <button onClick={() => setAiSuggestion(null)} className="text-xs text-brutal-muted hover:text-brutal-text mt-2">
                [关闭]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Content Calendar */}
        <div className="flex-1 flex flex-col border-r border-brutal-border">
          {/* Calendar Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-brutal-border bg-brutal-surface/50">
            <div className="flex items-center gap-2">
              {viewMode === 'week' && (
                <>
                  <button onClick={() => setCurrentWeek(w => w - 1)} className="p-1 hover:bg-brutal-border">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono">
                    {currentWeek === 0 ? '本周' : currentWeek > 0 ? `+${currentWeek}周` : `${currentWeek}周`}
                  </span>
                  <button onClick={() => setCurrentWeek(w => w + 1)} className="p-1 hover:bg-brutal-border">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-brutal-border">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 text-xs font-mono ${viewMode === 'week' ? 'bg-brutal-accent text-brutal-bg' : 'hover:bg-brutal-surface-hover'}`}
                >
                  周
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 text-xs font-mono ${viewMode === 'month' ? 'bg-brutal-accent text-brutal-bg' : 'hover:bg-brutal-surface-hover'}`}
                >
                  月
                </button>
              </div>
              <button
                onClick={() => setShowAddContent(true)}
                disabled={isLocked}
                className="btn-brutal h-9 flex items-center gap-2 text-xs"
              >
                <Plus className="w-3 h-3" />
                添加内容
              </button>
            </div>
          </div>

          {/* Week View */}
          {viewMode === 'week' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-7 gap-2 min-w-0 md:min-w-[600px]">
                {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, i) => {
                  const dayContents = weekContents.filter(c => {
                    const date = new Date(c.scheduledDate);
                    return date.getDay() === (i + 1) % 7;
                  });

                  return (
                    <div key={day} className="border border-brutal-border bg-brutal-surface min-h-[150px]">
                      <div className="px-2 py-1 border-b border-brutal-border bg-brutal-bg/50">
                        <span className="text-xs font-mono text-brutal-muted">{day}</span>
                      </div>
                      <div className="p-2 space-y-2">
                        {dayContents.map(content => {
                          const channel = CHANNELS.find(c => c.key === content.channel);
                          return (
                            <div
                              key={content.id}
                              className={`p-2 border text-xs font-mono cursor-pointer group ${
                                content.status === 'published'
                                  ? 'border-brutal-success bg-brutal-success/10'
                                  : content.status === 'scheduled'
                                  ? 'border-brutal-warning bg-brutal-warning/10'
                                  : 'border-brutal-border bg-brutal-bg'
                              }`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <span className="w-4 h-4 flex items-center justify-center bg-brutal-surface text-[8px]">
                                  {channel?.icon}
                                </span>
                                <span className="truncate flex-1">{content.title}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] px-1 ${
                                  content.status === 'published'
                                    ? 'text-brutal-success'
                                    : content.status === 'scheduled'
                                    ? 'text-brutal-warning'
                                    : 'text-brutal-muted'
                                }`}>
                                  {content.status === 'published' ? '已发布' : content.status === 'scheduled' ? '计划中' : '草稿'}
                                </span>
                                {!isLocked && (
                                  <button
                                    onClick={() => deleteContent(content.id)}
                                    className="opacity-0 group-hover:opacity-100 text-brutal-muted hover:text-brutal-warning"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month View */}
          {viewMode === 'month' && (
            <div className="flex-1 overflow-hidden p-4">
              <MonthView
                currentDate={currentMonth}
                onDateChange={setCurrentMonth}
                contents={data.contentCalendar}
                onSelectDate={(date) => {
                  setNewContent({ ...newContent, scheduledDate: date.toISOString().split('T')[0] });
                  setShowAddContent(true);
                }}
              />
            </div>
          )}

          {/* Stats */}
          <div className="px-4 py-3 border-t border-brutal-border bg-brutal-surface/50 flex gap-6">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-brutal-success" />
              <span className="text-xs font-mono">已发布: {publishedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brutal-warning" />
              <span className="text-xs font-mono">计划中: {scheduledCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brutal-muted" />
              <span className="text-xs font-mono">草稿: {draftCount}</span>
            </div>
          </div>
        </div>

        {/* Right: Channel Metrics */}
        <div className="w-80 flex flex-col bg-brutal-surface">
          <div className="px-4 py-3 border-b border-brutal-border">
            <span className="font-mono text-sm">渠道效果</span>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {data.channelMetrics.map(metric => {
              const channel = CHANNELS.find(c => c.key === metric.channel);
              return (
                <div key={metric.channel} className="p-3 border border-brutal-border bg-brutal-bg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-brutal-surface text-xs font-bold">
                      {channel?.icon}
                    </span>
                    <span className="text-xs font-mono font-bold">{channel?.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-brutal-muted">新增</p>
                      <input
                        type="number"
                        value={metric.newUsers}
                        onChange={(e) => updateChannelMetrics(metric.channel, { newUsers: parseInt(e.target.value) || 0 })}
                        disabled={isLocked}
                        className="w-full text-center text-sm font-mono bg-transparent border-none focus:ring-0"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-brutal-muted">累计</p>
                      <input
                        type="number"
                        value={metric.totalUsers}
                        onChange={(e) => updateChannelMetrics(metric.channel, { totalUsers: parseInt(e.target.value) || 0 })}
                        disabled={isLocked}
                        className="w-full text-center text-sm font-mono bg-transparent border-none focus:ring-0"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-brutal-muted">转化</p>
                      <input
                        type="number"
                        value={metric.conversionRate}
                        onChange={(e) => updateChannelMetrics(metric.channel, { conversionRate: parseFloat(e.target.value) || 0 })}
                        disabled={isLocked}
                        className="w-full text-center text-sm font-mono bg-transparent border-none focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Content Modal */}
      {showAddContent && (
        <div className="fixed inset-0 bg-brutal-bg/90 flex items-center justify-center z-50 p-4">
          <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
              <span className="text-sm font-mono font-bold">添加内容</span>
              <button onClick={() => setShowAddContent(false)} className="w-8 h-8 border border-brutal-border flex items-center justify-center">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">标题</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newContent.title}
                    onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                    className="flex-1 p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
                    placeholder="内容标题..."
                  />
                  <button
                    onClick={generateContentIdea}
                    disabled={generatingContent}
                    className="btn-brutal h-9 px-3"
                  >
                    {generatingContent ? <RefreshCw className="w-4 h-4 animate-spin" /> : '✨'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">内容类型</label>
                <div className="grid grid-cols-5 gap-2">
                  {CONTENT_TYPES.map(type => (
                    <button
                      key={type.type}
                      onClick={() => setNewContent({ ...newContent, type: type.type })}
                      className={`p-2 text-xs font-mono border ${
                        newContent.type === type.type
                          ? 'border-brutal-accent bg-brutal-accent/10'
                          : 'border-brutal-border'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">发布渠道</label>
                <div className="grid grid-cols-6 gap-2">
                  {CHANNELS.map(channel => (
                    <button
                      key={channel.key}
                      onClick={() => setNewContent({ ...newContent, channel: channel.key })}
                      className={`p-2 text-xs font-mono border ${
                        newContent.channel === channel.key
                          ? 'border-brutal-accent bg-brutal-accent/10'
                          : 'border-brutal-border'
                      }`}
                    >
                      {channel.icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">计划日期</label>
                <input
                  type="date"
                  value={newContent.scheduledDate}
                  onChange={(e) => setNewContent({ ...newContent, scheduledDate: e.target.value })}
                  className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddContent(false)} className="flex-1 btn-brutal h-9 py-2">取消</button>
                <button
                  onClick={addContent}
                  disabled={!newContent.title?.trim()}
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
