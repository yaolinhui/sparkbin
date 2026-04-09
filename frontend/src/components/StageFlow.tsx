import { useMemo } from 'react';
import ReactFlow, {
  Background,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { STAGE_ORDER, type StageKey } from '../types';
import { useStageLabel } from '../i18n';

interface StageFlowProps {
  currentStage: StageKey;
  completedStages: StageKey[];
}

const STAGE_NUMBERS: Record<StageKey, string> = {
  idea: '01',
  validate: '02',
  prototype: '03',
  ship: '04',
  grow: '05',
  monetize: '06',
};

// Custom node component
function StageNode({ data }: { data: { stage: StageKey; isCurrent: boolean; isCompleted: boolean; isLocked: boolean } }) {
  const stageLabel = useStageLabel(data.stage);

  return (
    <div className="flex flex-col items-center gap-1 font-mono">
      <div
        className={`w-10 h-10 flex items-center justify-center text-sm border
          ${data.isCurrent ? 'bg-brutal-accent border-brutal-accent text-brutal-bg' : ''}
          ${data.isCompleted ? 'border-brutal-success text-brutal-success' : ''}
          ${data.isLocked ? 'border-brutal-border text-brutal-muted' : ''}
        `}
      >
        {STAGE_NUMBERS[data.stage]}
      </div>
      <span
        className={`text-xs uppercase tracking-wider
          ${data.isCurrent ? 'text-brutal-accent' : ''}
          ${data.isCompleted ? 'text-brutal-success' : ''}
          ${data.isLocked ? 'text-brutal-muted' : ''}
        `}
      >
        {stageLabel}
      </span>
    </div>
  );
}

export function StageFlow({ currentStage, completedStages }: StageFlowProps) {
  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = [];
    const edgeList: Edge[] = [];

    STAGE_ORDER.forEach((stage, index) => {
      const isCurrent = stage === currentStage;
      const isCompleted = completedStages.includes(stage);

      nodeList.push({
        id: stage,
        type: 'stageNode',
        data: { stage, isCurrent, isCompleted, isLocked: !isCurrent && !isCompleted },
        position: { x: index * 140, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          width: 100,
        },
      });

      if (index < STAGE_ORDER.length - 1) {
        edgeList.push({
          id: `${stage}-${STAGE_ORDER[index + 1]}`,
          source: stage,
          target: STAGE_ORDER[index + 1],
          type: 'smoothstep',
          style: {
            stroke: isCompleted ? 'var(--brutal-success)' : 'var(--brutal-border)',
            strokeWidth: 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCompleted ? 'var(--brutal-success)' : 'var(--brutal-border)',
          },
        });
      }
    });

    return { nodes: nodeList, edges: edgeList };
  }, [currentStage, completedStages]);

  return (
    <div className="h-28 bg-brutal-surface border-b border-brutal-border"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodeTypes={{
          stageNode: StageNode,
        }}
        attributionPosition="bottom-left"
      >
        <Background gap={40} size={1} color="var(--brutal-border)" />
      </ReactFlow>
    </div>
  );
}
