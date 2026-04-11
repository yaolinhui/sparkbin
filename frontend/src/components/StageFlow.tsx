import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ReactFlow, {
  Background,
  type Node,
  type Edge,
  Position,
  MarkerType,
  Handle,
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
      {/* 左侧目标连接点 - 接收来自上一个阶段的边 */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
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
          ${data.isCurrent ? 'text-brutal-accent font-bold' : ''}
          ${data.isCompleted ? 'text-brutal-success' : ''}
          ${data.isLocked ? 'text-brutal-muted' : ''}
        `}
      >
        {stageLabel}
      </span>
      {/* 右侧源连接点 - 发出连接到下一个阶段 */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
    </div>
  );
}

// 极简折叠视图组件
function CompactStageView({
  currentStage,
  completedStages,
  onExpand,
}: {
  currentStage: StageKey;
  completedStages: StageKey[];
  onExpand: () => void;
}) {
  const stageLabel = useStageLabel(currentStage);
  const totalStages = STAGE_ORDER.length;
  const progress = Math.round((completedStages.length / totalStages) * 100);

  return (
    <div className="flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-4">
        {/* 阶段进度 */}
        <span className="text-xs font-mono text-brutal-muted">
          阶段 {STAGE_NUMBERS[currentStage]}/{STAGE_NUMBERS[STAGE_ORDER[totalStages - 1]]}
        </span>

        {/* 当前阶段高亮 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-brutal-text">
            {stageLabel}
          </span>
          <span className="text-xs px-2 py-0.5 bg-brutal-accent text-brutal-bg font-mono">
            当前
          </span>
        </div>

        {/* 进度条 */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-1 bg-brutal-border">
            <div
              className="h-full bg-brutal-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-mono text-brutal-muted">{progress}%</span>
        </div>
      </div>

      {/* 展开按钮 */}
      <button
        onClick={onExpand}
        className="flex items-center gap-1 text-xs text-brutal-muted hover:text-brutal-text font-mono"
      >
        展开流程
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}

export function StageFlow({ currentStage, completedStages }: StageFlowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  if (!isExpanded) {
    return (
      <div className="bg-brutal-surface border-b border-brutal-border">
        <CompactStageView
          currentStage={currentStage}
          completedStages={completedStages}
          onExpand={() => setIsExpanded(true)}
        />
      </div>
    );
  }

  return (
    <div className="bg-brutal-surface border-b border-brutal-border">
      {/* 折叠按钮 */}
      <div className="flex items-center justify-end px-4 pt-2">
        <button
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-1 text-xs text-brutal-muted hover:text-brutal-text font-mono"
        >
          折叠流程
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* 完整流程图 */}
      <div className="h-28">
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
    </div>
  );
}
