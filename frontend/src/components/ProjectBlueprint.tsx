import { useMemo, useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, GitGraph, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Project, StageKey } from '../types';
import { STAGE_ORDER } from '../types';

interface ProjectBlueprintProps {
  project: Project;
  onClose: () => void;
  onStageClick: (stage: StageKey) => void;
}

interface BlueprintNode {
  id: string;
  name: string;
  val: number;
  color: string;
  x?: number;
  y?: number;
  group: 'center' | 'stage' | 'content';
  stageKey?: StageKey;
  status?: 'completed' | 'in_progress' | 'pending' | 'locked';
  content?: string;
}

interface BlueprintLink {
  source: string;
  target: string;
  color: string;
  dashed?: boolean;
  directed?: boolean;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function getContentDensityLabel(content: string): string {
  const text = stripHtml(content);
  if (!text || text.length < 20) return '待补充';
  if (text.length < 200) return '简要';
  return '充实';
}

function getContentDensityPercent(content: string): number {
  const text = stripHtml(content);
  if (!text) return 0;
  return Math.min((text.length / 500) * 100, 100);
}

export function ProjectBlueprint({ project, onClose, onStageClick }: ProjectBlueprintProps) {
  const { t } = useI18n();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { nodes, links, diagnostics } = useMemo(() => {
    const nodes: BlueprintNode[] = [];
    const links: BlueprintLink[] = [];

    const completedCount = STAGE_ORDER.filter((k) => project.stages?.[k]?.isLocked).length;
    const progress = Math.round((completedCount / STAGE_ORDER.length) * 100);

    nodes.push({
      id: 'project',
      name: project.title,
      val: 30,
      color: 'var(--brutal-text)',
      group: 'center',
      x: 0,
      y: 0,
    });

    const stageRadius = 160;
    const angleStep = (2 * Math.PI) / STAGE_ORDER.length;

    STAGE_ORDER.forEach((stageKey, index) => {
      const stage = project.stages?.[stageKey];
      const isCompleted = stage?.isLocked ?? false;
      const isCurrent = project.currentStage === stageKey;

      const angle = angleStep * index - Math.PI / 2;
      const x = Math.cos(angle) * stageRadius;
      const y = Math.sin(angle) * stageRadius;

      nodes.push({
        id: stageKey,
        name: t('stage.' + stageKey),
        val: isCompleted ? 20 : isCurrent ? 18 : 15,
        color: isCompleted ? 'var(--brutal-success)' : isCurrent ? 'var(--brutal-accent)' : 'var(--brutal-muted)',
        x,
        y,
        group: 'stage',
        stageKey,
        status: isCompleted ? 'completed' : isCurrent ? 'in_progress' : stage?.content ? 'pending' : 'locked',
        content: stage?.content || '',
      });

      links.push({
        source: 'project',
        target: stageKey,
        color: isCompleted ? 'var(--brutal-success)' : isCurrent ? 'var(--brutal-accent)' : 'var(--brutal-border)',
        dashed: !isCompleted && !isCurrent,
        directed: false,
      });

      if (index < STAGE_ORDER.length - 1) {
        links.push({
          source: stageKey,
          target: STAGE_ORDER[index + 1],
          color: isCompleted ? 'var(--brutal-success)' : 'var(--brutal-border)',
          dashed: !isCompleted,
          directed: true,
        });
      }
    });

    // 诊断计算
    const warnings: string[] = [];
    let healthScore = 0;

    STAGE_ORDER.forEach((k) => {
      const s = project.stages?.[k];
      const textLen = stripHtml(s?.content || '').length;
      if (s?.isLocked) {
        healthScore += 10;
        if (textLen < 20) warnings.push(`${t('stage.' + k)}阶段已完成，但缺少详细记录`);
      }
      if (textLen >= 20) healthScore += 6.67;
    });

    healthScore = Math.min(Math.round(healthScore), 100);

    const currentStage = project.stages?.[project.currentStage];
    const currentTextLen = stripHtml(currentStage?.content || '').length;
    if (currentTextLen < 20) {
      warnings.unshift('当前阶段内容为空，建议尽快补充');
    } else if (currentTextLen < 100) {
      warnings.unshift('当前阶段记录较简略，可进一步丰富');
    }

    let suggestion = '项目推进顺利，建议继续深入当前阶段';
    if (warnings.length > 0) {
      const nextLocked = STAGE_ORDER.find((k, i) => {
        const prev = i > 0 ? STAGE_ORDER[i - 1] : null;
        if (!prev) return false;
        const prevStage = project.stages?.[prev];
        const currStage = project.stages?.[k];
        return prevStage?.isLocked && !currStage?.isLocked && stripHtml(currStage?.content || '').length < 20;
      });
      if (nextLocked) {
        suggestion = `建议优先完善${t('stage.' + nextLocked)}阶段的内容，为后续推进打好基础`;
      } else {
        suggestion = '建议先处理上方标记的薄弱环节';
      }
    }

    let statusLabel: string;
    let statusColor: string;
    let StatusIcon: typeof CheckCircle2;
    if (healthScore >= 80) {
      statusLabel = '健康';
      statusColor = 'var(--brutal-success)';
      StatusIcon = CheckCircle2;
    } else if (healthScore >= 50) {
      statusLabel = '需关注';
      statusColor = 'var(--brutal-warning)';
      StatusIcon = AlertTriangle;
    } else {
      statusLabel = '有风险';
      statusColor = 'var(--brutal-error)';
      StatusIcon = AlertTriangle;
    }

    return {
      nodes,
      links,
      diagnostics: {
        healthScore,
        progress,
        statusLabel,
        statusColor,
        StatusIcon,
        warnings: warnings.slice(0, 3),
        suggestion,
      },
    };
  }, [project, t]);

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasDragged(false);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setHasDragged(true);
    }
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNodeClick = (node: BlueprintNode) => {
    if (hasDragged) return;
    if (node.stageKey) onStageClick(node.stageKey);
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg z-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-brutal-border bg-brutal-surface">
        <div className="flex items-center gap-3">
          <GitGraph className="w-5 h-5 text-brutal-accent" />
          <span className="font-mono text-lg font-bold">项目蓝图</span>
          <span className="text-xs text-brutal-muted font-mono">// {project.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className="btn-brutal h-9 p-2" title="缩小">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="btn-brutal h-9 p-2" title="放大">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="btn-brutal h-9 p-2" title="重置">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="btn-brutal h-9 p-2 ml-4" title="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <svg
          className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          viewBox={[-400 / zoom, -300 / zoom, 800 / zoom, 600 / zoom].join(' ')}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" style={{ fill: 'var(--brutal-muted)' }} />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y})`}>
            {links.map((link, index) => {
              const sourceNode = nodes.find((n) => n.id === link.source);
              const targetNode = nodes.find((n) => n.id === link.target);
              if (!sourceNode || !targetNode) return null;
              return (
                <line
                  key={index}
                  x1={sourceNode.x || 0}
                  y1={sourceNode.y || 0}
                  x2={targetNode.x || 0}
                  y2={targetNode.y || 0}
                  stroke={link.color}
                  strokeWidth={link.dashed ? 1 : 2}
                  strokeDasharray={link.dashed ? '5,5' : 'none'}
                  markerEnd={link.directed ? 'url(#arrowhead)' : undefined}
                />
              );
            })}

            {/* Center node card */}
            <foreignObject x={-90} y={-45} width="180" height="100">
              <div
                className="w-full h-full border-2 border-brutal-border bg-brutal-surface p-3 flex flex-col justify-center items-center shadow-sm"
                style={{ pointerEvents: 'none' }}
              >
                <div className="text-sm font-mono font-bold text-brutal-text text-center leading-tight">{project.title}</div>
                <div className="text-xs font-mono text-brutal-muted mt-2">整体进度 {diagnostics.progress}%</div>
                <div className="w-full h-1.5 bg-brutal-bg border border-brutal-border mt-2">
                  <div
                    className="h-full bg-brutal-accent"
                    style={{ width: `${diagnostics.progress}%` }}
                  />
                </div>
              </div>
            </foreignObject>

            {/* Stage node cards */}
            {nodes.filter((n) => n.group === 'stage').map((node) => {
              const isHovered = hoveredNode === node.id;
              const density = getContentDensityPercent(node.content || '');
              const densityLabel = getContentDensityLabel(node.content || '');
              const summary = stripHtml(node.content || '').slice(0, 18) || '// 暂无记录';
              return (
                <foreignObject
                  key={node.id}
                  x={(node.x || 0) - 58}
                  y={(node.y || 0) - 38}
                  width="116"
                  height="82"
                >
                  <div
                    className={`w-full h-full border bg-brutal-surface p-2 flex flex-col justify-between transition-all ${
                      isHovered ? 'border-brutal-text scale-105 shadow-sm' : 'border-brutal-border'
                    }`}
                    style={{ pointerEvents: 'auto', cursor: 'pointer', borderLeftWidth: '3px', borderLeftColor: node.color }}
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    title={isHovered ? summary : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold truncate" style={{ color: node.color }}>
                        {node.name}
                      </span>
                      <span className="text-[9px] font-mono text-brutal-muted">{densityLabel}</span>
                    </div>
                    <div className="text-[10px] font-mono text-brutal-muted truncate leading-tight">
                      {summary}
                    </div>
                    <div className="h-1 bg-brutal-bg border border-brutal-border mt-1">
                      <div className="h-full" style={{ width: `${density}%`, backgroundColor: node.color }} />
                    </div>
                  </div>
                </foreignObject>
              );
            })}
          </g>
        </svg>

        {/* Diagnostic Panel */}
        <div className="absolute bottom-4 left-4 border border-brutal-border bg-brutal-surface p-4 max-w-sm shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <diagnostics.StatusIcon className="w-5 h-5" style={{ color: diagnostics.statusColor }} />
            <div>
              <div className="text-sm font-mono font-bold text-brutal-text">
                项目健康度: {diagnostics.healthScore}%
              </div>
              <div className="text-xs font-mono" style={{ color: diagnostics.statusColor }}>
                状态: {diagnostics.statusLabel}
              </div>
            </div>
          </div>

          {diagnostics.warnings.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {diagnostics.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-mono text-brutal-warning">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 text-xs font-mono text-brutal-muted border-t border-brutal-border pt-2">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-brutal-accent" />
            <span className="leading-snug">{diagnostics.suggestion}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectBlueprint;
