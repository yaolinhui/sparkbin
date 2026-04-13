import { useMemo, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, GitGraph } from 'lucide-react';
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
}

interface BlueprintLink {
  source: string;
  target: string;
  color: string;
  dashed?: boolean;
}

const STAGE_COLORS: Record<string, string> = {
  idea: '#10b981',
  validate: '#f59e0b',
  prototype: '#3b82f6',
  ship: '#8b5cf6',
  grow: '#ec4899',
  monetize: '#10b981',
};

export function ProjectBlueprint({ project, onClose, onStageClick }: ProjectBlueprintProps) {
  const { t } = useI18n();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const { nodes, links } = useMemo(() => {
    const nodes: BlueprintNode[] = [];
    const links: BlueprintLink[] = [];

    nodes.push({
      id: 'project',
      name: project.title,
      val: 30,
      color: '#374151',
      group: 'center',
      x: 0,
      y: 0,
    });

    const stageRadius = 150;
    const angleStep = (2 * Math.PI) / STAGE_ORDER.length;

    STAGE_ORDER.forEach((stageKey, index) => {
      const stage = project.stages?.[stageKey];
      const isCompleted = stage?.isLocked;
      const isCurrent = project.currentStage === stageKey;

      const angle = angleStep * index - Math.PI / 2;
      const x = Math.cos(angle) * stageRadius;
      const y = Math.sin(angle) * stageRadius;

      nodes.push({
        id: stageKey,
        name: t('stage.' + stageKey),
        val: isCompleted ? 20 : isCurrent ? 18 : 15,
        color: isCompleted ? '#10b981' : isCurrent ? '#3b82f6' : '#9ca3af',
        x,
        y,
        group: 'stage',
        stageKey,
        status: isCompleted ? 'completed' : isCurrent ? 'in_progress' : stage?.content ? 'pending' : 'locked',
      });

      links.push({
        source: 'project',
        target: stageKey,
        color: isCompleted ? '#10b981' : isCurrent ? '#3b82f6' : '#d1d5db',
        dashed: !isCompleted && !isCurrent,
      });

      if (index < STAGE_ORDER.length - 1) {
        links.push({
          source: stageKey,
          target: STAGE_ORDER[index + 1],
          color: isCompleted ? '#10b981' : '#d1d5db',
          dashed: !isCompleted,
        });
      }
    });

    return { nodes, links };
  }, [project, t]);

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.3));
  const handleReset = () => setZoom(1);

  return (
    <div className="fixed inset-0 bg-brutal-bg/95 z-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-brutal-border bg-brutal-surface">
        <div className="flex items-center gap-3">
          <GitGraph className="w-5 h-5 text-brutal-accent" />
          <span className="font-mono text-lg font-bold">项目蓝图</span>
          <span className="text-xs text-brutal-muted font-mono">// {project.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className="btn-brutal p-2" title="缩小">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="btn-brutal p-2" title="放大">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="btn-brutal p-2" title="重置">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="btn-brutal p-2 ml-4" title="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <svg
          className="w-full h-full"
          viewBox={[-400 * zoom, -300 * zoom, 800 * zoom, 600 * zoom].join(' ')}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
            </marker>
          </defs>

          {links.map((link, index) => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
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
              />
            );
          })}

          {nodes.map((node) => (
            <g
              key={node.id}
              transform={'translate(' + (node.x || 0) + ', ' + (node.y || 0) + ')'}
              onClick={() => node.stageKey && onStageClick(node.stageKey)}
              style={{ cursor: node.stageKey ? 'pointer' : 'default' }}
            >
              <circle
                r={node.val}
                fill={node.color}
                stroke={selectedNode === node.id ? '#3b82f6' : '#374151'}
                strokeWidth={selectedNode === node.id ? 3 : 1}
              />
              <text textAnchor="middle" dy={node.val + 15} className="text-xs font-mono" fill="#374151">
                {node.name}
              </text>
              {node.status && (
                <text textAnchor="middle" dy={node.val + 28} className="text-xs" fill={
                  node.status === 'completed' ? '#10b981' : node.status === 'in_progress' ? '#3b82f6' : '#9ca3af'
                }>
                  {node.status === 'completed' && '完成'}
                  {node.status === 'in_progress' && '进行中'}
                  {node.status === 'pending' && '待处理'}
                  {node.status === 'locked' && '未开始'}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default ProjectBlueprint;
