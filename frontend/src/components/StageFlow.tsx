import { Check, ChevronRight } from 'lucide-react';
import { useI18n, useStageLabel } from '../i18n/hooks';
import { STAGE_ORDER, type StageKey } from '../types';

interface StageFlowProps {
  currentStage: StageKey;
  viewingStage?: StageKey;
  completedStages: StageKey[];
  onStageClick?: (stage: StageKey) => void;
  onCompleteStage?: () => void;
  isCompleting?: boolean;
  canComplete?: boolean;
}

const STAGE_NUMBERS: Record<StageKey, string> = {
  idea: '01',
  validate: '02',
  prototype: '03',
  ship: '04',
  grow: '05',
  monetize: '06',
};

export function StageFlow({
  currentStage,
  viewingStage,
  completedStages,
  onStageClick,
  onCompleteStage,
  isCompleting,
  canComplete
}: StageFlowProps) {
  const { t } = useI18n();
  const stageLabel = useStageLabel;
  const progress = Math.round((completedStages.length / STAGE_ORDER.length) * 100);

  return (
    <div className="bg-brutal-surface border-b border-brutal-border px-6 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* 左侧：阶段跳转按钮 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {STAGE_ORDER.map((stage) => {
            const isCurrent = stage === currentStage && viewingStage === currentStage;
            const isViewing = stage === viewingStage;
            const isCompleted = completedStages.includes(stage);

            return (
              <button
                key={stage}
                onClick={() => onStageClick?.(stage)}
                className={`flex flex-col items-center px-2 py-1 transition-colors min-w-[40px]
                  ${isCurrent || isViewing ? 'bg-cyan-500/10' :
                    'hover:bg-brutal-bg/50'}
                `}
                title={`${stageLabel(stage)} ${isCompleted ? '(' + t('status.completed') + ')' : isCurrent ? '(' + t('status.active') + ')' : isViewing ? '(' + t('status.viewing') + ')' : ''}`}
              >
                <span className={`text-xs font-mono ${
                  isCurrent ? 'text-cyan-400 font-bold' :
                  isViewing ? 'text-cyan-400' :
                  isCompleted ? 'text-brutal-success' : 'text-brutal-muted'
                }`}>
                  {STAGE_NUMBERS[stage]}
                </span>
                <span className={`text-[10px] font-mono ${
                  isCurrent ? 'text-cyan-400' :
                  isViewing ? 'text-cyan-400' :
                  isCompleted ? 'text-brutal-success' : 'text-brutal-muted'
                }`}>
                  {stageLabel(stage)}
                </span>
              </button>
            );
          })}
        </div>

        {/* 中间：当前阶段信息和进度 */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <span className={`text-sm font-mono font-bold ${
            completedStages.includes(currentStage) ? 'text-brutal-success' : 'text-brutal-accent'
          }`}>
            {stageLabel(currentStage)}
          </span>
          <span className={`text-xs px-2 py-0.5 font-mono ${
            completedStages.includes(currentStage)
              ? 'bg-brutal-success text-brutal-bg'
              : 'bg-brutal-accent text-brutal-bg'
          }`}>
            {completedStages.includes(currentStage) ? t('status.completed') : t('status.active')}
          </span>

          {/* 进度条 */}
          <div className="flex items-center gap-2 w-24">
            <div className="flex-1 h-1.5 bg-brutal-border">
              <div
                className="h-full bg-brutal-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-brutal-muted w-8">{progress}%</span>
          </div>
        </div>

        {/* 右侧：提交阶段按钮 */}
        {canComplete && (
          <button
            onClick={onCompleteStage}
            disabled={isCompleting}
            className="btn-brutal-primary h-9 flex items-center gap-2 flex-shrink-0"
          >
            {isCompleting ? (
              <div className="w-4 h-4 border border-brutal-bg border-t-transparent animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span className="text-sm">{t('action.commit_stage')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {completedStages.includes(currentStage) && (
          <span className="text-xs font-mono text-brutal-success flex items-center gap-1 flex-shrink-0">
            <Check className="w-4 h-4" />
            {t('status.completed')}
          </span>
        )}
      </div>
    </div>
  );
}

export default StageFlow;
