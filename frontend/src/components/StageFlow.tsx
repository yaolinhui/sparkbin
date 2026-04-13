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

    </div>
  );
}

export default StageFlow;
