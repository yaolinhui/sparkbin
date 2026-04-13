import { STAGE_ORDER, type StageKey } from '../types';

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

export function StageFlow({ currentStage, completedStages, onStageClick }: StageFlowProps) {
  const progress = Math.round((completedStages.length / STAGE_ORDER.length) * 100);

  return (
    <div className="bg-brutal-surface border-b border-brutal-border">
      {/* 头部信息栏 */}
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
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-brutal-muted">{progress}%</span>
          </div>
        </div>

        {/* 阶段快速跳转 */}
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

      {/* 静态流程图 - 纯 CSS/HTML，无交互 */}
      <div className="border-t border-brutal-border bg-brutal-bg/30">
        <div className="flex items-center justify-center gap-4 py-6 px-4 overflow-x-auto">
          {STAGE_ORDER.map((stage, index) => {
            const isCurrent = stage === currentStage;
            const isCompleted = completedStages.includes(stage);
            const isLocked = !isCurrent && !isCompleted;

            // 节点样式
            const nodeClasses = isCurrent
              ? 'bg-brutal-accent border-brutal-accent text-brutal-bg'
              : isCompleted
              ? 'border-brutal-success text-brutal-success bg-brutal-bg'
              : 'border-brutal-border text-brutal-muted bg-brutal-bg';

            const labelClasses = isCurrent
              ? 'text-brutal-accent font-bold'
              : isCompleted
              ? 'text-brutal-success'
              : 'text-brutal-muted';

            return (
              <div key={stage} className="flex items-center gap-4 flex-shrink-0">
                {/* 阶段节点 */}
                <div
                  onClick={() => onStageClick?.(stage)}
                  className={`flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${
                    isLocked ? 'opacity-60' : ''
                  }`}
                >
                  <div className={`w-10 h-10 flex items-center justify-center text-sm border ${nodeClasses}`}>
                    {STAGE_NUMBERS[stage]}
                  </div>
                  <span className={`text-xs uppercase tracking-wider ${labelClasses}`}>
                    {STAGE_LABELS[stage]}
                  </span>
                </div>

                {/* 连接线（最后一个不显示） */}
                {index < STAGE_ORDER.length - 1 && (
                  <div className="flex items-center">
                    <div
                      className="w-8 h-px"
                      style={{
                        backgroundColor: isCompleted ? 'var(--brutal-success)' : 'var(--brutal-border)',
                      }}
                    />
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      className="-ml-1"
                      style={{
                        color: isCompleted ? 'var(--brutal-success)' : 'var(--brutal-border)',
                      }}
                    >
                      <path
                        d="M0 0 L8 4 L0 8 Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StageFlow;
