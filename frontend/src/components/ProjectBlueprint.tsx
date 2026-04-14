import { useMemo, useState, useEffect } from 'react';
import { X, GitGraph, Clock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n/hooks';
import type { Project, StageKey } from '../types';
import { STAGE_ORDER } from '../types';

interface ProjectBlueprintProps {
  project: Project;
  onClose: () => void;
  onStageClick: (stage: StageKey) => void;
}

interface StageMetric {
  key: StageKey;
  name: string;
  status: 'completed' | 'in_progress' | 'pending' | 'locked';
  color: string;
  summary: string;
  detailLines: { label: string; value: string; highlight?: boolean }[];
  blockReason?: string;
  durationDays: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function countDays(start: string | Date, end: string | Date): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

function getChecklistProgress(obj: Record<string, boolean>): string {
  const total = Object.keys(obj).length;
  const done = Object.values(obj).filter(Boolean).length;
  return `${done}/${total}`;
}

function getStageDuration(project: Project, stageKey: StageKey): number {
  const stageIndex = STAGE_ORDER.indexOf(stageKey);
  const stage = project.stages?.[stageKey];

  let start: Date;
  if (stageIndex === 0) {
    start = new Date(project.createdAt);
  } else {
    const prevKey = STAGE_ORDER[stageIndex - 1];
    const prevStage = project.stages?.[prevKey];
    start = prevStage?.completedAt ? new Date(prevStage.completedAt) : new Date(project.createdAt);
  }

  const end = stage?.completedAt ? new Date(stage.completedAt) : new Date();
  return countDays(start, end);
}

function getBlockReason(project: Project, stageKey: StageKey): string | undefined {
  const stageIndex = STAGE_ORDER.indexOf(stageKey);
  if (stageIndex <= 0) return undefined;

  switch (stageKey) {
    case 'validate': {
      const ideaContent = stripHtml(project.stages?.idea?.content || '');
      if (ideaContent.length < 20) return '想法阶段记录较简略，建议明确痛点和用户画像';
      break;
    }
    case 'prototype': {
      const validateStage = project.stages?.validate;
      if (validateStage?.content) {
        try {
          const data = JSON.parse(validateStage.content);
          const validatedCount = (data.items || []).filter((i: { status: string }) => i.status === 'validated').length;
          if (validatedCount === 0) return '验证阶段缺少通过项，建议补充用户反馈后再设计原型';
        } catch {
          // ignore parse error
        }
      }
      break;
    }
    case 'ship': {
      const prototypeStage = project.stages?.prototype;
      if (prototypeStage?.content) {
        try {
          const data = JSON.parse(prototypeStage.content);
          const features = data.features || [];
          const checklist = data.releaseChecklist || {};
          const checklistDone = Object.values(checklist).filter(Boolean).length;
          if (features.length === 0) return '原型阶段缺少功能规划，建议先定义核心功能';
          if (checklistDone < 3) return '原型发布准备尚不充分，建议完善发布检查清单';
        } catch {
          return '原型阶段数据异常，建议检查内容完整性';
        }
      } else {
        return '原型阶段缺少记录，建议先完成原型设计';
      }
      break;
    }
    case 'grow': {
      const shipStage = project.stages?.ship;
      if (shipStage?.content) {
        try {
          const data = JSON.parse(shipStage.content);
          const checklist = data.checklist || {};
          const checklistDone = Object.values(checklist).filter(Boolean).length;
          if (checklistDone < 3) return '发布准备度不足，建议先完成核心配置再启动增长';
          if (!data.launchUrl) return '缺少上线链接，建议先完成产品发布';
        } catch {
          // ignore parse error
        }
      }
      break;
    }
    case 'monetize': {
      const growStage = project.stages?.grow;
      if (growStage?.content) {
        try {
          const data = JSON.parse(growStage.content);
          const contents = data.contentCalendar || [];
          const channels = (data.channelMetrics || []).filter((c: { totalUsers?: number }) => (c.totalUsers || 0) > 0).length;
          if (contents.length === 0) return '增长阶段缺少内容布局，建议先积累内容和用户';
          if (channels < 2) return '覆盖渠道较少，建议至少建立 2 个增长渠道后再考虑变现';
        } catch {
          // ignore parse error
        }
      }
      break;
    }
  }

  return undefined;
}

function parseStageMetric(project: Project, stageKey: StageKey, t: (k: string) => string): StageMetric {
  const stage = project.stages?.[stageKey];
  const isCompleted = stage?.isLocked ?? false;
  const isCurrent = project.currentStage === stageKey;
  const status = isCompleted ? 'completed' : isCurrent ? 'in_progress' : stage?.content ? 'pending' : 'locked';
  const color = isCompleted ? 'var(--brutal-success)' : isCurrent ? 'var(--brutal-accent)' : 'var(--brutal-muted)';
  const durationDays = getStageDuration(project, stageKey);

  let summary = '待补充';
  const detailLines: { label: string; value: string; highlight?: boolean }[] = [];

  try {
    switch (stageKey) {
      case 'idea': {
        const textLen = stripHtml(stage?.content || '').length;
        summary = textLen < 20 ? '待补充' : textLen < 200 ? '简要' : '充实';
        detailLines.push({ label: '字数', value: `${textLen} 字` });
        break;
      }
      case 'validate': {
        if (stage?.content) {
          const data = JSON.parse(stage.content);
          const items: Array<{ status: string } & Record<string, unknown>> = data.items || [];
          const validated = items.filter((i) => i.status === 'validated').length;
          const failed = items.filter((i) => i.status === 'failed').length;
          summary = `${validated}/${items.length || 0} 已验证`;
          detailLines.push(
            { label: '验证项', value: `${items.length} 项` },
            { label: '已通过', value: `${validated} 项`, highlight: validated > 0 },
            { label: '未通过', value: `${failed} 项` }
          );
          if (data.decision) {
            detailLines.push({
              label: '决策',
              value: data.decision === 'go' ? '继续' : data.decision === 'no_go' ? '暂停' : '观望',
              highlight: data.decision === 'go',
            });
          }
        }
        break;
      }
      case 'prototype': {
        if (stage?.content) {
          const data = JSON.parse(stage.content);
          const features: Array<{ status: string } & Record<string, unknown>> = data.features || [];
          const doneFeatures = features.filter((f) => f.status === 'done').length;
          const checklist = data.releaseChecklist || {};
          summary = `${features.length} 项功能`;
          detailLines.push(
            { label: '功能', value: `${doneFeatures}/${features.length} 完成`, highlight: doneFeatures > 0 },
            { label: '发布清单', value: getChecklistProgress(checklist) }
          );
          if (data.selectedPlatform) {
            detailLines.push({ label: '平台', value: data.selectedPlatform });
          }
        }
        break;
      }
      case 'ship': {
        if (stage?.content) {
          const data = JSON.parse(stage.content);
          const checklist = data.checklist || {};
          const platforms = data.platformBindings?.length || 0;
          summary = `检查清单 ${getChecklistProgress(checklist)}`;
          detailLines.push(
            { label: '检查清单', value: getChecklistProgress(checklist), highlight: Object.values(checklist).filter(Boolean).length >= 3 },
            { label: '绑定平台', value: `${platforms} 个` }
          );
          if (data.launchUrl) {
            detailLines.push({ label: '上线链接', value: data.launchUrl });
          }
          if (data.metrics) {
            const m = data.metrics;
            detailLines.push({ label: '用户反馈', value: `${m.feedbackCount || 0} 条` });
          }
        }
        break;
      }
      case 'grow': {
        if (stage?.content) {
          const data = JSON.parse(stage.content);
          const contents: Array<{ status: string } & Record<string, unknown>> = data.contentCalendar || [];
          const published = contents.filter((c) => c.status === 'published').length;
          const channels = (data.channelMetrics || []).filter((c: { totalUsers?: number }) => (c.totalUsers || 0) > 0).length;
          summary = `${contents.length} 篇内容`;
          detailLines.push(
            { label: '内容', value: `${published}/${contents.length} 发布`, highlight: published > 0 },
            { label: '活跃渠道', value: `${channels} 个` }
          );
        }
        break;
      }
      case 'monetize': {
        if (stage?.content) {
          const data = JSON.parse(stage.content);
          const tiers = data.pricingTiers?.length || 0;
          const mrr = data.mrr || 0;
          const paid = data.paidUsers || 0;
          summary = tiers > 0 ? `${tiers} 个定价档` : '待配置';
          detailLines.push(
            { label: '定价档', value: `${tiers} 个` },
            { label: 'MRR', value: `¥${mrr}`, highlight: mrr > 0 },
            { label: '付费用户', value: `${paid} 人`, highlight: paid > 0 }
          );
          if (data.funnel) {
            const f = data.funnel;
            const conversion = f.visitors > 0 ? ((f.paid / f.visitors) * 100).toFixed(1) : '0.0';
            detailLines.push({ label: '转化率', value: `${conversion}%` });
          }
        }
        break;
      }
    }
  } catch {
    summary = '数据异常';
  }

  const blockReason = getBlockReason(project, stageKey);

  return {
    key: stageKey,
    name: t('stage.' + stageKey),
    status,
    color,
    summary,
    detailLines,
    blockReason,
    durationDays,
  };
}

export function ProjectBlueprint({ project, onClose, onStageClick }: ProjectBlueprintProps) {
  const { t } = useI18n();
  const [selectedStage, setSelectedStage] = useState<StageKey>(project.currentStage);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const metrics = useMemo(() => {
    return STAGE_ORDER.map((key) => parseStageMetric(project, key, t));
  }, [project, t]);

  const selectedMetric = metrics.find((m) => m.key === selectedStage) || metrics[0];
  const maxDuration = Math.max(1, ...metrics.map((m) => m.durationDays));
  const completedCount = metrics.filter((m) => m.status === 'completed').length;
  const progress = Math.round((completedCount / STAGE_ORDER.length) * 100);

  const handleStageClick = (stageKey: StageKey) => {
    setSelectedStage(stageKey);
    onStageClick(stageKey);
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-brutal-border bg-brutal-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <GitGraph className="w-5 h-5 text-brutal-accent" />
          <span className="font-mono text-lg font-bold">项目蓝图</span>
          <span className="text-xs text-brutal-muted font-mono">// {project.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-brutal-muted">整体进度</div>
            <div className="text-sm font-mono font-bold text-brutal-accent">{progress}%</div>
          </div>
          <button onClick={onClose} className="btn-brutal h-9 p-2" title="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Pipeline + Gantt */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6">
          {/* Pipeline */}
          <div className="mb-8">
            <div className="text-xs font-mono text-brutal-muted mb-4">// 创业管线</div>
            <div className="flex items-stretch gap-2">
              {metrics.map((m, index) => (
                <div key={m.key} className="flex items-center flex-1 min-w-0">
                  <button
                    onClick={() => handleStageClick(m.key)}
                    className={`flex-1 text-left border bg-brutal-surface p-3 transition-all hover:border-brutal-text ${
                      selectedStage === m.key ? 'border-brutal-text ring-1 ring-brutal-text' : 'border-brutal-border'
                    }`}
                    style={{ borderLeftWidth: '4px', borderLeftColor: m.color }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-mono font-bold truncate" style={{ color: m.color }}>
                        {m.name}
                      </span>
                      {m.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: m.color }} />}
                    </div>
                    <div className="text-xs font-mono text-brutal-muted truncate">{m.summary}</div>
                    {m.blockReason && (
                      <div className="mt-2 text-[10px] font-mono text-brutal-warning flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="leading-tight">{m.blockReason}</span>
                      </div>
                    )}
                  </button>
                  {index < metrics.length - 1 && (
                    <div className="flex-shrink-0 px-1">
                      <ChevronRight className="w-4 h-4 text-brutal-border" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt */}
          <div className="flex-1 min-h-0">
            <div className="text-xs font-mono text-brutal-muted mb-4">// 阶段时间轴</div>
            <div className="border border-brutal-border bg-brutal-surface p-4">
              <div className="space-y-3">
                {metrics.map((m) => {
                  const widthPct = (m.durationDays / maxDuration) * 100;
                  const isCurrent = m.status === 'in_progress';
                  return (
                    <div key={m.key} className="flex items-center gap-3">
                      <div className="w-16 text-xs font-mono text-brutal-text truncate flex-shrink-0">{m.name}</div>
                      <div className="flex-1 h-6 bg-brutal-bg border border-brutal-border relative">
                        <div
                          className={`h-full ${isCurrent ? 'animate-pulse' : ''}`}
                          style={{ width: `${Math.max(widthPct, 4)}%`, backgroundColor: m.color }}
                        />
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-[10px] font-mono text-brutal-text mix-blend-difference">
                            {m.durationDays} 天
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-brutal-border flex items-center gap-2 text-[10px] font-mono text-brutal-muted">
                <Clock className="w-3 h-3" />
                <span>项目创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="w-80 border-l border-brutal-border bg-brutal-surface flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-brutal-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-mono font-bold text-brutal-text">{selectedMetric.name}</span>
              <span
                className="text-xs px-1.5 py-0.5 font-mono"
                style={{ color: selectedMetric.color, border: `1px solid ${selectedMetric.color}` }}
              >
                {selectedMetric.status === 'completed' ? '已完成' : selectedMetric.status === 'in_progress' ? '进行中' : selectedMetric.status === 'pending' ? '待处理' : '未开始'}
              </span>
            </div>
            <div className="text-xs font-mono text-brutal-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              已停留 {selectedMetric.durationDays} 天
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedMetric.blockReason && (
              <div className="mb-4 border border-brutal-warning bg-brutal-warning/5 p-3">
                <div className="flex items-start gap-2 text-xs font-mono text-brutal-warning">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="leading-snug">{selectedMetric.blockReason}</span>
                </div>
              </div>
            )}

            {selectedMetric.detailLines.length > 0 ? (
              <div className="space-y-2">
                {selectedMetric.detailLines.map((line, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-brutal-border pb-2 last:border-0"
                  >
                    <span className="text-xs font-mono text-brutal-muted">{line.label}</span>
                    <span
                      className={`text-xs font-mono font-bold ${line.highlight ? 'text-brutal-accent' : 'text-brutal-text'}`}
                    >
                      {line.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs font-mono text-brutal-muted text-center py-8">
                暂无详细记录
              </div>
            )}
          </div>

          <div className="p-4 border-t border-brutal-border">
            <button
              onClick={() => onStageClick(selectedMetric.key)}
              className="w-full btn-brutal-primary h-10"
            >
              进入 {selectedMetric.name} 阶段
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectBlueprint;
