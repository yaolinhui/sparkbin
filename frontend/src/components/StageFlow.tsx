import { useMemo } from 'react';
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
  onStageClick?: (stage: StageKey) => void;
}

const STAGE_NUMBERS: Record<StageKey, string> = {
  idea: '01',
  validate: '02',
  prototype: '03',
  ship: '04',
  grow: '05',
  monetize: '06',
};

const STAGE_LABELS: Record<StageKey, string> = {
  idea: '想法',
  validate: '验证',
  prototype: '原型',
  ship: '发布',
  grow: '增长',
  monetize: '变现',
};

// Node types - defined outside component to prevent recreation
const nodeTypes = {
  stageNode: StageNode,
};

// Custom node component
function StageNode({ data }: { data: { stage: StageKey; isCurrent: boolean; isCompleted: boolean; isLocked: boolean; onClick?: () => void } }) {
  const stageLabel = useStageLabel(data.stage);

  // 样式优先级：当前 > 已完成 > 锁定
  const getNodeClasses = () => {
    if (data.isCurrent) {
      return 'bg-brutal-accent border-brutal-accent text-brutal-bg';
    }
    if (data.isCompleted) {
      return 'border-brutal-success text-brutal-success bg-brutal-bg';
    }
    if (data.isLocked) {
      return 'border-brutal-border text-brutal-muted bg-brutal-bg';
    }
    return 'border-brutal-border text-brutal-text bg-brutal-bg';
  };

  const getLabelClasses = () => {
    if (data.isCurrent) {
      return 'text-brutal-accent font-bold';
    }
    if (data.isCompleted) {
      return 'text-brutal-success';
    }
    if (data.isLocked) {
      return 'text-brutal-muted';
    }
    return 'text-brutal-text';
  };

  return (
    <div
      className="flex flex-col items-center gap-1 font-mono cursor-pointer hover:opacity-80 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        data.onClick?.();
      }}
    >
      {/* 左侧目标连接点 - 接收来自上一个阶段的边 */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
      <div
        className={`w-10 h-10 flex items-center justify-center text-sm border ${getNodeClasses()}`}
      >
        {STAGE_NUMBERS[data.stage]}
      </div>
      <span className={`text-xs uppercase tracking-wider ${getLabelClasses()}`}>
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

export function StageFlow({ currentStage, completedStages, onStageClick }: StageFlowProps) {
  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = [];
    const edgeList: Edge[] = [];

    STAGE_ORDER.forEach((stage, index) => {
      const isCurrent = stage === currentStage;
      const isCompleted = completedStages.includes(stage);

      nodeList.push({
        id: stage,
        type: 'stageNode',
        data: { stage, isCurrent, isCompleted, isLocked: !isCurrent && !isCompleted, onClick: () => onStageClick?.(stage) },
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
        // 边颜色基于源阶段是否完成
        const isEdgeCompleted = completedStages.includes(stage);
        edgeList.push({
          id: `${stage}-${STAGE_ORDER[index + 1]}`,
          source: stage,
          target: STAGE_ORDER[index + 1],
          type: 'smoothstep',
          style: {
            stroke: isEdgeCompleted ? 'var(--brutal-success)' : 'var(--brutal-border)',
            strokeWidth: 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isEdgeCompleted ? 'var(--brutal-success)' : 'var(--brutal-border)',
          },
        });
      }
    });

    return { nodes: nodeList, edges: edgeList };
  }, [currentStage, completedStages, onStageClick]);

  return (
    <div className="bg-brutal-surface border-b border-brutal-border">
      {/* 简化版进度条 - 始终显示 */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          {/* 阶段进度 */}
          <span className="text-xs font-mono text-brutal-muted">
            阶段 {STAGE_NUMBERS[currentStage]}/{STAGE_NUMBERS[STAGE_ORDER[STAGE_ORDER.length - 1]]}
          </span>

          {/* 当前阶段高亮 - 颜色跟随 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-mono font-bold ${
              completedStages.includes(currentStage) ? 'text-brutal-success' : 'text-brutal-accent'
            }`}>
              {STAGE_LABELS[currentStage]}
            </span>
            <span className={`text-xs px-2 py-0.5 font-mono ${
              completedStages.includes(currentStage)
                ? 'bg-brutal-success text-brutal-bg'
                : 'bg-brutal-accent text-brutal-bg'
            }`}>
              {completedStages.includes(currentStage) ? '已完成' : '进行中'}
            </span>
          </div>

          {/* 进度条 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-24 h-1 bg-brutal-border">
              <div
                className="h-full bg-brutal-accent transition-all"
                style={{ width: `${Math.round((completedStages.length / STAGE_ORDER.length) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono text-brutal-muted">
              {Math.round((completedStages.length / STAGE_ORDER.length) * 100)}%
            </span>
          </div>
        </div>

        {/* 阶段快速跳转 - 带名称提示 */}
        <div className="flex items-center gap-2 flex-wrap">
          {STAGE_ORDER.map((stage) => {
            const stageName = STAGE_LABELS[stage];
            const isCurrent = stage === currentStage;
            const isCompleted = completedStages.includes(stage);

            return (
              <button
                key={stage}
                onClick={() => onStageClick?.(stage)}
                className={`flex flex-col items-center gap-0.5 px-1 py-1 transition-colors
                  ${isCurrent ? 'bg-brutal-accent/10' : ''}
                `}
                title={`${stageName} ${isCompleted ? '(已完成)' : isCurrent ? '(进行中)' : ''}`}
              >
                <span className={`w-6 h-6 text-xs font-mono border flex items-center justify-center
                  ${isCurrent ? 'bg-brutal-accent text-brutal-bg border-brutal-accent' : ''}
                  ${isCompleted && !isCurrent ? 'border-brutal-success text-brutal-success hover:bg-brutal-success/10' : ''}
                  ${!isCompleted && !isCurrent ? 'border-brutal-border text-brutal-muted hover:border-brutal-text' : ''}
                `}>
                  {STAGE_NUMBERS[stage]}
                </span>
                <span className={`text-[10px] font-mono uppercase ${
                  isCurrent ? 'text-brutal-accent font-bold' :
                  isCompleted ? 'text-brutal-success' : 'text-brutal-muted'
                }`}>
                  {stageName.slice(0, 2)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 完整流程图 - 始终显示，砍掉折叠按钮 */}
      <div className="h-28 border-t border-brutal-border">
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
          nodeTypes={nodeTypes}
          attributionPosition="bottom-left"
        >
          <Background gap={40} size={1} color="var(--brutal-border)" />
        </ReactFlow>
      </div>
    </div>
  );
}


export default StageFlow;
