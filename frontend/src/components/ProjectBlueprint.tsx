import { useMemo, useState, useEffect } from 'react';
import { X, GitGraph, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../i18n/hooks';
import type { Project, StageKey } from '../types';
import { STAGE_ORDER } from '../types';

interface ProjectBlueprintProps {
  project: Project;
  onClose: () => void;
  onStageClick: (stage: StageKey) => void;
}

interface StageGuide {
  targetDays: number;
  targetMinutes: number;
  objective: string;
  exitCriteria: string[];
  defaultActions: string[];
}

interface StageCriterion {
  label: string;
  passed: boolean;
}

interface StageDetailLine {
  label: string;
  value: string;
  highlight?: boolean;
}

type StageHealth = 'good' | 'warning' | 'risk';
type StageStatus = 'completed' | 'in_progress' | 'pending' | 'locked';

interface StageMetric {
  key: StageKey;
  name: string;
  status: StageStatus;
  health: StageHealth;
  color: string;
  summary: string;
  completionRate: number;
  detailLines: StageDetailLine[];
  blockers: string[];
  durationDays: number;
  targetDays: number;
  targetMinutes: number;
  overdueDays: number;
  updatedAt: string | null;
  objective: string;
  criteriaChecks: StageCriterion[];
  nextActions: string[];
}

const STAGE_GUIDES: Record<StageKey, StageGuide> = {
  idea: {
    targetDays: 3,
    targetMinutes: 15,
    objective: '把问题、目标用户、可验证假设写清楚，确保不是“自嗨想法”。',
    exitCriteria: ['痛点描述清晰', '目标用户明确', '成功指标已定义'],
    defaultActions: ['补齐痛点和用户画像', '补充 1 个可验证成功指标', '输出一句价值主张用于后续验证'],
  },
  validate: {
    targetDays: 5,
    targetMinutes: 25,
    objective: '通过真实反馈验证需求成立，再决定是否继续投入开发。',
    exitCriteria: ['至少 3 个验证项', '至少 1 个验证通过', '形成 go / no-go 决策'],
    defaultActions: ['新增 1-2 个验证项', '优先录入真实用户反馈', '输出结论并更新阶段决策'],
  },
  prototype: {
    targetDays: 7,
    targetMinutes: 30,
    objective: '把核心路径做成可体验版本，并达到最小发布要求。',
    exitCriteria: ['至少 3 项核心功能', '至少 1 项 P0 完成', '发布检查清单 >= 3 项完成'],
    defaultActions: ['先完成一个核心流程闭环', '补齐发布前检查项', '明确技术栈与平台策略'],
  },
  ship: {
    targetDays: 4,
    targetMinutes: 20,
    objective: '完成上线动作与基础监控，让用户可访问且可反馈。',
    exitCriteria: ['发布检查清单 >= 3 项', '存在可访问上线链接', '至少绑定 1 个发布平台'],
    defaultActions: ['补全上线链接与可用性检查', '绑定至少 1 个渠道并发布内容', '开始收集首批反馈数据'],
  },
  grow: {
    targetDays: 10,
    targetMinutes: 30,
    objective: '建立稳定获客节奏，明确有效渠道和内容方向。',
    exitCriteria: ['至少 4 条内容计划', '至少 1 条内容已发布', '至少 2 个有效渠道'],
    defaultActions: ['补齐内容日历并排期', '把发布频率固定下来', '为每个渠道设置可追踪指标'],
  },
  monetize: {
    targetDays: 8,
    targetMinutes: 25,
    objective: '明确定价与付费路径，验证真实付费意愿。',
    exitCriteria: ['至少 1 个定价档位', '出现首批付费/MRR', '漏斗数据开始积累'],
    defaultActions: ['先上线最简付费档位', '补齐付费转化漏斗埋点', '基于反馈迭代定价策略'],
  },
};

const STATUS_LABELS: Record<StageStatus, string> = {
  completed: '已完成',
  in_progress: '进行中',
  pending: '待处理',
  locked: '未开始',
};

const HEALTH_LABELS: Record<StageHealth, string> = {
  good: '健康',
  warning: '需关注',
  risk: '高风险',
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function countDays(start: string | Date, end: string | Date): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function formatDate(value: string | null): string {
  if (!value) return '暂无';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无';
  return date.toLocaleDateString('zh-CN');
}

function getDaysAgo(value: string | null): string {
  if (!value) return '暂无更新';
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return '暂无更新';
  const days = countDays(target, new Date());
  if (days <= 1) return '今天更新';
  return `${days} 天前更新`;
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

function getStageBlockers(project: Project, stageKey: StageKey): string[] {
  const blockers: string[] = [];

  switch (stageKey) {
    case 'validate': {
      const ideaContent = stripHtml(project.stages?.idea?.content || '');
      if (ideaContent.length < 20) blockers.push('想法阶段记录较简略，建议先明确痛点和用户画像');
      break;
    }
    case 'prototype': {
      const validateStage = project.stages?.validate;
      if (validateStage?.content) {
        try {
          const data = JSON.parse(validateStage.content);
          const validatedCount = (data.items || []).filter((i: { status: string }) => i.status === 'validated').length;
          if (validatedCount === 0) blockers.push('验证阶段没有通过项，建议先补充用户反馈');
        } catch {
          blockers.push('验证阶段数据解析失败，建议检查结构');
        }
      } else {
        blockers.push('验证阶段尚无记录，无法开始原型设计');
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
          if (features.length === 0) blockers.push('原型阶段缺少功能规划，建议先定义核心功能');
          if (checklistDone < 3) blockers.push('发布准备不充分，建议先完善发布检查清单');
        } catch {
          blockers.push('原型阶段数据异常，建议先修复数据结构');
        }
      } else {
        blockers.push('原型阶段缺少记录，建议先完成可体验版本');
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
          if (checklistDone < 3) blockers.push('发布准备度不足，建议先完成核心配置');
          if (!data.launchUrl) blockers.push('缺少上线链接，建议先完成产品发布');
        } catch {
          blockers.push('发布阶段数据异常，建议先校验数据');
        }
      } else {
        blockers.push('发布阶段尚无数据，增长动作缺少基础');
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
          if (contents.length === 0) blockers.push('增长阶段缺少内容布局，建议先积累内容');
          if (channels < 2) blockers.push('有效渠道不足，建议至少建立 2 个渠道后再变现');
        } catch {
          blockers.push('增长阶段数据异常，建议先修复数据');
        }
      } else {
        blockers.push('增长阶段尚无数据，无法验证付费前提');
      }
      break;
    }
    default:
      break;
  }

  return Array.from(new Set(blockers));
}

function buildActionItems(stageKey: StageKey, blockers: string[], completionRate: number): string[] {
  const actions: string[] = [];
  const guide = STAGE_GUIDES[stageKey];

  for (const blocker of blockers) {
    actions.push(`优先处理：${blocker}`);
  }

  if (completionRate === 0) {
    actions.push('先补齐最小可执行信息：问题、用户、成功指标');
  }

  if (completionRate < 60) {
    actions.push('补齐关键输入并保存一次，形成可追踪基线');
  }

  actions.push(...guide.defaultActions);

  return Array.from(new Set(actions)).slice(0, 3);
}

function parseStageMetric(project: Project, stageKey: StageKey, t: (k: string) => string): StageMetric {
  const stage = project.stages?.[stageKey];
  const guide = STAGE_GUIDES[stageKey];
  const isCompleted = stage?.isLocked ?? false;
  const isCurrent = project.currentStage === stageKey;
  const status: StageStatus = isCompleted ? 'completed' : isCurrent ? 'in_progress' : stage?.content ? 'pending' : 'locked';
  const blockers = getStageBlockers(project, stageKey);
  const durationDays = getStageDuration(project, stageKey);
  const overdueDays = Math.max(0, durationDays - guide.targetDays);
  const updatedAt = stage?.completedAt || (stage?.content ? project.updatedAt : null);

  let completionRate = 0;
  let summary = '待补充';
  const detailLines: StageDetailLine[] = [];
  let criteriaChecks = guide.exitCriteria.map((label) => ({ label, passed: false }));

  try {
    switch (stageKey) {
      case 'idea': {
        const text = stripHtml(stage?.content || '');
        const textLen = text.length;
        const hasAudience = /用户|人群|受众|客户/.test(text);
        const hasMetric = /指标|目标|留存|转化|付费|增长/.test(text);
        completionRate = clampPercent(
          Math.round((Math.min(textLen, 240) / 240) * 60 + (hasAudience ? 20 : 0) + (hasMetric ? 20 : 0))
        );
        summary = textLen < 20 ? '待补充' : textLen < 120 ? '框架已成型' : '定义较完整';
        detailLines.push(
          { label: '字数', value: `${textLen} 字`, highlight: textLen >= 120 },
          { label: '用户描述', value: hasAudience ? '已包含' : '待补充', highlight: hasAudience },
          { label: '成功指标', value: hasMetric ? '已包含' : '待补充', highlight: hasMetric }
        );
        criteriaChecks = [
          { label: guide.exitCriteria[0], passed: textLen >= 80 },
          { label: guide.exitCriteria[1], passed: hasAudience },
          { label: guide.exitCriteria[2], passed: hasMetric },
        ];
        break;
      }
      case 'validate': {
        if (stage?.content) {
          const data = JSON.parse(stage.content);
          const items: Array<{ status: string } & Record<string, unknown>> = data.items || [];
          const validated = items.filter((i) => i.status === 'validated').length;
          const failed = items.filter((i) => i.status === 'failed').length;
          const decision = data.decision as string | undefined;
          const validatedRatio = items.length > 0 ? validated / items.length : 0;
          completionRate = clampPercent(
            Math.round(validatedRatio * 70 + (items.length >= 3 ? 15 : Math.min(items.length * 5, 15)) + (decision ? 15 : 0))
          );
          summary = `${validated}/${items.length || 0} 已验证`;
          detailLines.push(
            { label: '验证项', value: `${items.length} 项`, highlight: items.length >= 3 },
            { label: '已通过', value: `${validated} 项`, highlight: validated > 0 },
            { label: '未通过', value: `${failed} 项` },
            {
              label: '决策',
              value: decision === 'go' ? '继续' : decision === 'no_go' ? '暂停' : decision === 'maybe' ? '观望' : '未决',
              highlight: decision === 'go',
            }
          );
          criteriaChecks = [
            { label: guide.exitCriteria[0], passed: items.length >= 3 },
            { label: guide.exitCriteria[1], passed: validated > 0 },
            { label: guide.exitCriteria[2], passed: Boolean(decision) },
          ];
        }
        break;
      }
      case 'prototype': {
        if (stage?.content) {
          const data = JSON.parse(stage.content);
          const features: Array<{ status: string } & Record<string, unknown>> = data.features || [];
          const doneFeatures = features.filter((f) => f.status === 'done').length;
          const checklist = data.releaseChecklist || {};
          const checklistDone = Object.values(checklist).filter(Boolean).length;
          const checklistTotal = Math.max(1, Object.keys(checklist).length);
          completionRate = clampPercent(
            Math.round((features.length ? (doneFeatures / features.length) * 60 : 0) + (checklistDone / checklistTotal) * 40)
          );
          summary = `${features.length} 项功能 / 清单 ${checklistDone}/${checklistTotal}`;
          detailLines.push(
            { label: '功能完成', value: `${doneFeatures}/${features.length}`, highlight: doneFeatures > 0 },
            { label: '发布清单', value: `${checklistDone}/${checklistTotal}`, highlight: checklistDone >= 3 },
            { label: '平台', value: data.selectedPlatform || '待选择' }
          );
          criteriaChecks = [
            { label: guide.exitCriteria[0], passed: features.length >= 3 },
            { label: guide.exitCriteria[1], passed: doneFeatures >= 1 },
            { label: guide.exitCriteria[2], passed: checklistDone >= 3 },
          ];
        }
        break;
      }
      case 'ship': {
        if (stage?.content) {
          const data = JSON.parse(stage.content);
          const checklist = data.checklist || {};
          const checklistDone = Object.values(checklist).filter(Boolean).length;
          const checklistTotal = Math.max(1, Object.keys(checklist).length);
          const platforms = data.platformBindings?.length || 0;
          const hasLaunchUrl = Boolean(data.launchUrl);
          completionRate = clampPercent(
            Math.round((checklistDone / checklistTotal) * 70 + (hasLaunchUrl ? 20 : 0) + (platforms > 0 ? 10 : 0))
          );
          summary = `发布清单 ${checklistDone}/${checklistTotal}`;
          detailLines.push(
            { label: '发布清单', value: `${checklistDone}/${checklistTotal}`, highlight: checklistDone >= 3 },
            { label: '发布平台', value: `${platforms} 个`, highlight: platforms > 0 },
            { label: '上线链接', value: hasLaunchUrl ? '已配置' : '待配置', highlight: hasLaunchUrl }
          );
          criteriaChecks = [
            { label: guide.exitCriteria[0], passed: checklistDone >= 3 },
            { label: guide.exitCriteria[1], passed: hasLaunchUrl },
            { label: guide.exitCriteria[2], passed: platforms >= 1 },
          ];
        }
        break;
      }
      case 'grow': {
        if (stage?.content) {
          const data = JSON.parse(stage.content);
          const contents: Array<{ status: string } & Record<string, unknown>> = data.contentCalendar || [];
          const published = contents.filter((c) => c.status === 'published').length;
          const channels = (data.channelMetrics || []).filter((c: { totalUsers?: number }) => (c.totalUsers || 0) > 0).length;
          const contentCoverage = Math.min(contents.length / 6, 1);
          const publishRatio = contents.length > 0 ? published / contents.length : 0;
          const channelCoverage = Math.min(channels / 3, 1);
          completionRate = clampPercent(
            Math.round(contentCoverage * 35 + publishRatio * 35 + channelCoverage * 30)
          );
          summary = `${contents.length} 条内容 / ${channels} 个渠道`;
          detailLines.push(
            { label: '内容计划', value: `${contents.length} 条`, highlight: contents.length >= 4 },
            { label: '已发布', value: `${published} 条`, highlight: published > 0 },
            { label: '有效渠道', value: `${channels} 个`, highlight: channels >= 2 }
          );
          criteriaChecks = [
            { label: guide.exitCriteria[0], passed: contents.length >= 4 },
            { label: guide.exitCriteria[1], passed: published >= 1 },
            { label: guide.exitCriteria[2], passed: channels >= 2 },
          ];
        }
        break;
      }
      case 'monetize': {
        if (stage?.content) {
          const data = JSON.parse(stage.content);
          const tiers = data.pricingTiers?.length || 0;
          const mrr = data.mrr || 0;
          const paid = data.paidUsers || 0;
          const visitors = data.funnel?.visitors || 0;
          const revenueSignal = mrr > 0 || paid > 0 ? 1 : 0;
          completionRate = clampPercent(
            Math.round((tiers > 0 ? 40 : 0) + revenueSignal * 30 + Math.min(visitors / 100, 1) * 30)
          );
          summary = tiers > 0 ? `${tiers} 个定价档 / MRR ¥${mrr}` : '待配置定价';
          detailLines.push(
            { label: '定价档', value: `${tiers} 个`, highlight: tiers > 0 },
            { label: 'MRR', value: `¥${mrr}`, highlight: mrr > 0 },
            { label: '付费用户', value: `${paid} 人`, highlight: paid > 0 },
            { label: '漏斗访客', value: `${visitors} 人`, highlight: visitors > 0 }
          );
          criteriaChecks = [
            { label: guide.exitCriteria[0], passed: tiers >= 1 },
            { label: guide.exitCriteria[1], passed: revenueSignal > 0 },
            { label: guide.exitCriteria[2], passed: visitors > 0 },
          ];
        }
        break;
      }
      default:
        break;
    }
  } catch {
    summary = '数据异常';
    completionRate = stage?.content ? 20 : 0;
  }

  if (isCompleted) completionRate = 100;
  if (status === 'locked' && !stage?.content) summary = '未开始';

  let health: StageHealth = 'good';
  if (blockers.length >= 2 || overdueDays >= Math.max(2, Math.floor(guide.targetDays * 0.5))) {
    health = 'risk';
  } else if (blockers.length > 0 || overdueDays > 0 || completionRate < 40) {
    health = 'warning';
  }

  let color = 'var(--brutal-muted)';
  if (status === 'completed') {
    color = 'var(--brutal-success)';
  } else if (status === 'in_progress') {
    color = 'var(--brutal-accent)';
  } else if (health === 'risk') {
    color = 'var(--brutal-warning)';
  }

  return {
    key: stageKey,
    name: t('stage.' + stageKey),
    status,
    health,
    color,
    summary,
    completionRate,
    detailLines,
    blockers,
    durationDays,
    targetDays: guide.targetDays,
    targetMinutes: guide.targetMinutes,
    overdueDays,
    updatedAt,
    objective: guide.objective,
    criteriaChecks,
    nextActions: buildActionItems(stageKey, blockers, completionRate),
  };
}

export function ProjectBlueprint({ project, onClose, onStageClick }: ProjectBlueprintProps) {
  const { t } = useI18n();
  const [selectedStage, setSelectedStage] = useState<StageKey>(project.currentStage);

  useEffect(() => {
    setSelectedStage(project.currentStage);
  }, [project.currentStage]);

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
  const currentMetric = metrics.find((m) => m.key === project.currentStage) || metrics[0];
  const completedCount = metrics.filter((m) => m.status === 'completed').length;
  const progress = Math.round((completedCount / STAGE_ORDER.length) * 100);
  const blockedCount = metrics.reduce((sum, metric) => sum + metric.blockers.length, 0);
  const maxDuration = Math.max(1, ...metrics.map((m) => Math.max(m.durationDays, m.targetDays)));

  return (
    <div className="fixed inset-0 bg-brutal-bg/90 backdrop-blur-lg z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-brutal-border bg-brutal-surface flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <GitGraph className="w-5 h-5 text-brutal-accent flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-mono text-lg font-bold truncate">项目蓝图</div>
            <div className="text-xs text-brutal-muted font-mono truncate">// {project.title}</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-5 mr-4">
          <div className="text-right">
            <div className="text-[10px] font-mono text-brutal-muted">总进度</div>
            <div className="text-sm font-mono font-bold text-brutal-accent">{progress}%</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-brutal-muted">当前阶段完成度</div>
            <div className="text-sm font-mono font-bold text-brutal-text">{currentMetric.completionRate}%</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-brutal-muted">阻塞项</div>
            <div className={`text-sm font-mono font-bold ${blockedCount > 0 ? 'text-brutal-warning' : 'text-brutal-success'}`}>
              {blockedCount}
            </div>
          </div>
        </div>

        <button onClick={onClose} className="btn-brutal h-9 p-2" title="关闭">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
          <div className="mb-6">
            <div className="text-xs font-mono text-brutal-muted mb-3">// 创业管线（点击卡片查看执行细节）</div>
            <div className="overflow-x-auto pb-2 relative scroll-smooth">
              {/* 左侧滚动指示 */}
              <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-brutal-bg to-transparent pointer-events-none z-10" />
              {/* 右侧滚动指示 */}
              <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-brutal-bg to-transparent pointer-events-none z-10" />
              <div className="flex gap-3 min-w-max px-1">
                {metrics.map((metric, index) => (
                  <button
                    key={metric.key}
                    onClick={() => setSelectedStage(metric.key)}
                    className={`w-[230px] border bg-brutal-surface p-3 text-left transition-all ${
                      selectedStage === metric.key ? 'border-brutal-accent ring-1 ring-brutal-accent' : 'border-brutal-border hover:border-brutal-text'
                    }`}
                    style={{ borderLeftWidth: '4px', borderLeftColor: metric.color }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono text-brutal-muted">0{index + 1}</span>
                        <span className="text-sm font-mono font-bold truncate" style={{ color: metric.color }}>
                          {metric.name}
                        </span>
                      </div>
                      {metric.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-brutal-success flex-shrink-0" />}
                    </div>

                    <div className="text-[11px] font-mono text-brutal-muted mb-2 truncate">{metric.summary}</div>

                    <div className="h-1.5 bg-brutal-bg border border-brutal-border mb-2">
                      <div className="h-full" style={{ width: `${metric.completionRate}%`, backgroundColor: metric.color }} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="text-brutal-muted">完成度</span>
                      <span className="text-brutal-text">{metric.completionRate}%</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className={`${metric.blockers.length > 0 ? 'text-brutal-warning' : 'text-brutal-muted'}`}>
                        阻塞 {metric.blockers.length}
                      </span>
                      <span className="text-brutal-muted">{getDaysAgo(metric.updatedAt)}</span>
                    </div>

                    {metric.blockers[0] && (
                      <div className="mt-2 text-[10px] leading-snug font-mono text-brutal-warning line-clamp-2">
                        ⚠ {metric.blockers[0]}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-mono text-brutal-muted mb-3">// 阶段时间轴（目标 vs 实际）</div>
            <div className="border border-brutal-border bg-brutal-surface p-4">
              <div className="flex items-center gap-4 text-[10px] font-mono text-brutal-muted mb-4">
                <span className="flex items-center gap-1">
                  <span className="w-4 h-[2px] bg-brutal-border inline-block" />
                  目标时长
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-[6px] bg-brutal-accent inline-block" />
                  实际时长
                </span>
              </div>

              <div className="space-y-3">
                {metrics.map((metric) => {
                  const targetPct = (metric.targetDays / maxDuration) * 100;
                  const actualPct = (metric.durationDays / maxDuration) * 100;
                  return (
                    <div key={metric.key} className="flex items-start gap-3">
                      <div className="w-16 text-xs font-mono text-brutal-text pt-1 flex-shrink-0">{metric.name}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span className="text-brutal-muted">目标 {metric.targetDays} 天</span>
                          <span className={metric.overdueDays > 0 ? 'text-brutal-warning' : 'text-brutal-muted'}>
                            实际 {metric.durationDays} 天{metric.overdueDays > 0 ? ` / 超期 ${metric.overdueDays} 天` : ''}
                          </span>
                        </div>
                        <div className="relative h-6 border border-brutal-border bg-brutal-bg overflow-hidden">
                          <div
                            className="absolute top-1/2 -translate-y-1/2 left-0 h-[2px] bg-brutal-border"
                            style={{ width: `${Math.max(targetPct, 4)}%` }}
                          />
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 left-0 h-3 ${metric.status === 'in_progress' ? 'animate-pulse' : ''}`}
                            style={{ width: `${Math.max(actualPct, 3)}%`, backgroundColor: metric.color }}
                          />
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

        <div className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-brutal-border bg-brutal-surface flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-brutal-border">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-lg font-mono font-bold text-brutal-text">{selectedMetric.name}</span>
              <span className="text-xs px-1.5 py-0.5 font-mono border border-brutal-border text-brutal-text">
                {STATUS_LABELS[selectedMetric.status]}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className={selectedMetric.health === 'risk' ? 'text-brutal-warning' : selectedMetric.health === 'warning' ? 'text-brutal-text' : 'text-brutal-success'}>
                {HEALTH_LABELS[selectedMetric.health]}
              </span>
              <span className="text-brutal-muted">{selectedMetric.completionRate}% 完成</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-brutal-border p-2 bg-brutal-bg">
                <div className="text-[10px] font-mono text-brutal-muted">预计时长</div>
                <div className="text-sm font-mono font-bold">{selectedMetric.targetDays} 天</div>
              </div>
              <div className="border border-brutal-border p-2 bg-brutal-bg">
                <div className="text-[10px] font-mono text-brutal-muted">已停留</div>
                <div className={`text-sm font-mono font-bold ${selectedMetric.overdueDays > 0 ? 'text-brutal-warning' : 'text-brutal-text'}`}>
                  {selectedMetric.durationDays} 天
                </div>
              </div>
              <div className="border border-brutal-border p-2 bg-brutal-bg">
                <div className="text-[10px] font-mono text-brutal-muted">阻塞数</div>
                <div className={`text-sm font-mono font-bold ${selectedMetric.blockers.length > 0 ? 'text-brutal-warning' : 'text-brutal-success'}`}>
                  {selectedMetric.blockers.length}
                </div>
              </div>
              <div className="border border-brutal-border p-2 bg-brutal-bg">
                <div className="text-[10px] font-mono text-brutal-muted">最后更新</div>
                <div className="text-xs font-mono font-bold">{formatDate(selectedMetric.updatedAt)}</div>
              </div>
            </div>

            <div className="border border-brutal-border p-3 bg-brutal-bg">
              <div className="text-xs font-mono text-brutal-muted mb-2">// 阶段目标</div>
              <div className="text-xs font-mono leading-relaxed text-brutal-text">{selectedMetric.objective}</div>
            </div>

            <div className="border border-brutal-border p-3 bg-brutal-bg">
              <div className="text-xs font-mono text-brutal-muted mb-2">// 退出标准</div>
              <div className="space-y-2">
                {selectedMetric.criteriaChecks.map((criterion) => (
                  <div key={criterion.label} className="flex items-start gap-2 text-xs font-mono">
                    {criterion.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brutal-success mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-brutal-warning mt-0.5 flex-shrink-0" />
                    )}
                    <span className={criterion.passed ? 'text-brutal-text' : 'text-brutal-muted'}>{criterion.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedMetric.blockers.length > 0 && (
              <div className="border border-brutal-warning bg-brutal-warning/5 p-3">
                <div className="text-xs font-mono text-brutal-warning mb-2">// 当前阻塞</div>
                <div className="space-y-2">
                  {selectedMetric.blockers.map((blocker) => (
                    <div key={blocker} className="text-xs font-mono text-brutal-warning leading-relaxed">
                      • {blocker}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-brutal-border p-3 bg-brutal-bg">
              <div className="text-xs font-mono text-brutal-muted mb-2">// 下一步动作（按优先级）</div>
              <div className="space-y-2">
                {selectedMetric.nextActions.map((action, index) => (
                  <div key={action} className="flex items-start gap-2 text-xs font-mono text-brutal-text">
                    <span className="w-5 h-5 border border-brutal-border inline-flex items-center justify-center text-[10px] flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedMetric.detailLines.length > 0 && (
              <div className="border border-brutal-border p-3 bg-brutal-bg">
                <div className="text-xs font-mono text-brutal-muted mb-2">// 数据快照</div>
                <div className="space-y-2">
                  {selectedMetric.detailLines.map((line) => (
                    <div key={`${line.label}-${line.value}`} className="flex items-center justify-between text-xs font-mono border-b border-brutal-border pb-2 last:border-0">
                      <span className="text-brutal-muted">{line.label}</span>
                      <span className={line.highlight ? 'text-brutal-accent font-bold' : 'text-brutal-text font-bold'}>
                        {line.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-brutal-border space-y-2">
            <button
              onClick={() => onStageClick(selectedMetric.key)}
              className="w-full btn-brutal-primary h-10"
            >
              {selectedMetric.status === 'in_progress'
                ? `继续推进 ${selectedMetric.name}（约 ${selectedMetric.targetMinutes} 分钟）`
                : `开始补全 ${selectedMetric.name}（约 ${selectedMetric.targetMinutes} 分钟）`}
            </button>
            <div className="text-[10px] font-mono text-brutal-muted text-center">
              点击上方按钮进入编辑区，执行本阶段动作
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
