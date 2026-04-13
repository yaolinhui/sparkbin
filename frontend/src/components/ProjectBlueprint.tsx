import { useMemo, useState, useEffect, useRef } from 'react';
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
  directed?: boolean;
}

export function ProjectBlueprint({ project, onClose, onStageClick }: ProjectBlueprintProps) {
  const { t } = useI18n();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
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

  const { nodes, links } = useMemo(() => {
    const nodes: BlueprintNode[] = [];
    const links: BlueprintLink[] = [];

    nodes.push({
      id: 'project',
      name: project.title,
      val: 30,
      color: 'var(--brutal-text)',
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
        color: isCompleted ? 'var(--brutal-success)' : isCurrent ? 'var(--brutal-accent)' : 'var(--brutal-muted)',
        x,
        y,
        group: 'stage',
        stageKey,
        status: isCompleted ? 'completed' : isCurrent ? 'in_progress' : stage?.content ? 'pending' : 'locked',
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

    return { nodes, links };
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
    setSelectedNode(node.id);
    if (node.stageKey) onStageClick(node.stageKey);
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/95 z-50 flex flex-col">
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
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
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

            {nodes.map((node) => {
              const isSelected = selectedNode === node.id;
              const isHovered = hoveredNode === node.id;
              const radius = node.val + (isHovered ? 3 : 0);
              return (
                <g
                  key={node.id}
                  transform={'translate(' + (node.x || 0) + ', ' + (node.y || 0) + ')'}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: node.stageKey ? 'pointer' : 'default' }}
                >
                  <circle
                    r={radius}
                    fill={node.color}
                    stroke={isSelected ? 'var(--brutal-accent)' : 'var(--brutal-bg)'}
                    strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                  />
                  <text
                    textAnchor="middle"
                    dy={radius + 15}
                    className="text-xs font-mono"
                    style={{ fill: 'var(--brutal-text)', pointerEvents: 'none' }}
                  >
                    {node.name}
                  </text>
                  {node.status && (
                    <text
                      textAnchor="middle"
                      dy={radius + 28}
                      className="text-xs"
                      style={{
                        fill:
                          node.status === 'completed'
                            ? 'var(--brutal-success)'
                            : node.status === 'in_progress'
                              ? 'var(--brutal-accent)'
                              : 'var(--brutal-muted)',
                        pointerEvents: 'none',
                      }}
                    >
                      {node.status === 'completed' && '完成'}
                      {node.status === 'in_progress' && '进行中'}
                      {node.status === 'pending' && '待处理'}
                      {node.status === 'locked' && '未开始'}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default ProjectBlueprint;
