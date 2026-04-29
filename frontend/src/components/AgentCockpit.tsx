import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  GitBranch,
  Layers,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { aiApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import type { Project } from '../types';

interface AgentCockpitProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

type Strategy = 'router' | 'parallel_all' | 'sequential';

interface AgentTask {
  id: string;
  agent_type: string;
  status: string;
  provider: string | null;
  model: string;
  error: string;
}

interface AgentResult {
  success: boolean;
  status: string;
  provider: string | null;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  data: Record<string, unknown>;
  error: string;
}

const STRATEGY_CONFIG: Record<
  Strategy,
  { label: string; description: string; icon: typeof GitBranch; color: string }
> = {
  router: {
    label: '智能路由',
    description: 'Router 分析项目状态，动态选择 Specialist 并行执行（推荐）',
    icon: GitBranch,
    color: 'text-brutal-accent border-brutal-accent',
  },
  parallel_all: {
    label: '全并行',
    description: '同时启动所有 7 个 Specialist（演示模式，Token 消耗较高）',
    icon: Layers,
    color: 'text-brutal-warning border-brutal-warning',
  },
  sequential: {
    label: '串行',
    description: '按顺序逐个执行（最省 Token，适合低并发场景）',
    icon: ListOrdered,
    color: 'text-brutal-muted border-brutal-muted',
  },
};

const AGENT_LABELS: Record<string, string> = {
  router: '调度器',
  idea: '想法顾问',
  validate: '验证顾问',
  prototype: '原型顾问',
  ship: '发布顾问',
  grow: '增长顾问',
  monetize: '变现顾问',
  analyst: '数据分析师',
};

export function AgentCockpit({ project, isOpen, onClose }: AgentCockpitProps) {
  const [strategy, setStrategy] = useState<Strategy>('router');
  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [results, setResults] = useState<Record<string, AgentResult>>({});
  const [summary, setSummary] = useState('');
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<
    { run_id: string; status: string; strategy: string; summary: string; created_at: string }[]
  >([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showToast } = useToast();

  const loadHistory = useCallback(async () => {
    try {
      const runs = await aiApi.listAgentRuns(project.id, 10);
      setHistory(runs);
    } catch {
      // ignore
    }
  }, [project.id]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollStatus = useCallback(
    async (id: string) => {
      try {
        const status = await aiApi.getAgentRun(id);
        setRunStatus(status.status);
        setTasks(status.tasks || []);
        setResults((status.results || {}) as Record<string, AgentResult>);
        setSummary(status.summary || '');

        if (status.status === 'completed' || status.status === 'failed') {
          clearPoll();
          setIsRunning(false);
          showToast(
            status.status === 'completed' ? 'Agent 集群执行完成' : 'Agent 集群执行失败',
            status.status === 'completed' ? 'success' : 'error'
          );
          loadHistory();
        }
      } catch (error) {
        clearPoll();
        setIsRunning(false);
        showToast('查询运行状态失败', 'error');
      }
    },
    [showToast, loadHistory]
  );

  const startRun = async () => {
    setIsRunning(true);
    setRunStatus('running');
    setTasks([]);
    setResults({});
    setSummary('');

    try {
      const response = await aiApi.runAgent({
        project_id: project.id,
        strategy,
      });
      setRunStatus(response.status);
      setResults((response.results || {}) as Record<string, AgentResult>);
      setSummary(response.summary || '');

      // 开始轮询
      clearPoll();
      pollRef.current = setInterval(() => {
        pollStatus(response.run_id);
      }, 2000);
    } catch (error) {
      setIsRunning(false);
      setRunStatus('failed');
      showToast(error instanceof Error ? error.message : '启动失败', 'error');
    }
  };

  useEffect(() => {
    return () => clearPoll();
  }, []);

  const toggleExpand = (agentType: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentType)) {
        next.delete(agentType);
      } else {
        next.add(agentType);
      }
      return next;
    });
  };

  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brutal-bg/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg flex-shrink-0">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-brutal-accent" />
            <div>
              <h2 className="text-sm font-mono font-bold">AI Agent 驾驶舱</h2>
              <p className="text-xs text-brutal-muted font-mono">多 Agent 并行执行 · 智能路由调度</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Strategy Selector */}
          <div className="p-4 border-b border-brutal-border">
            <p className="text-xs text-brutal-muted font-mono mb-3">执行策略</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(STRATEGY_CONFIG) as Strategy[]).map((s) => {
                const config = STRATEGY_CONFIG[s];
                const Icon = config.icon;
                const isActive = strategy === s;
                return (
                  <button
                    key={s}
                    onClick={() => !isRunning && setStrategy(s)}
                    disabled={isRunning}
                    className={`border-2 p-3 text-left transition-all ${
                      isActive
                        ? `${config.color} bg-opacity-10`
                        : 'border-brutal-border hover:border-brutal-text/30'
                    } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isActive ? '' : 'text-brutal-muted'}`} />
                      <span className={`text-xs font-mono font-bold ${isActive ? '' : 'text-brutal-muted'}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-brutal-muted font-mono leading-tight">
                      {config.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 border-b border-brutal-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isRunning && (
                <div className="flex items-center gap-2 text-brutal-accent">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-mono">
                    执行中… {runningCount > 0 && `${runningCount} 个 Agent 运行中`}
                  </span>
                </div>
              )}
              {!isRunning && runStatus === 'completed' && (
                <div className="flex items-center gap-2 text-brutal-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-mono">执行完成</span>
                </div>
              )}
              {!isRunning && runStatus === 'failed' && (
                <div className="flex items-center gap-2 text-brutal-error">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-mono">执行失败</span>
                </div>
              )}
            </div>
            <button
              onClick={startRun}
              disabled={isRunning}
              className={`btn-brutal h-9 flex items-center gap-2 text-xs ${
                isRunning ? 'opacity-50 cursor-not-allowed' : 'bg-brutal-accent text-brutal-bg border-brutal-accent'
              }`}
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isRunning ? '执行中…' : '启动 Agent 集群'}
            </button>
          </div>

          {/* Task Grid */}
          {tasks.length > 0 && (
            <div className="p-4 border-b border-brutal-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-brutal-muted font-mono">任务状态</p>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-brutal-success">{completedCount} 完成</span>
                  {failedCount > 0 && <span className="text-brutal-error">{failedCount} 失败</span>}
                  {runningCount > 0 && <span className="text-brutal-accent">{runningCount} 运行中</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {tasks
                  .filter((t) => t.agent_type !== 'router')
                  .map((task) => (
                    <div
                      key={task.id}
                      className={`border p-2 ${
                        task.status === 'completed'
                          ? 'border-brutal-success/30 bg-brutal-success/5'
                          : task.status === 'failed'
                          ? 'border-brutal-error/30 bg-brutal-error/5'
                          : task.status === 'running'
                          ? 'border-brutal-accent/30 bg-brutal-accent/5'
                          : 'border-brutal-border bg-brutal-bg'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {task.status === 'running' && (
                          <Loader2 className="w-3 h-3 animate-spin text-brutal-accent" />
                        )}
                        {task.status === 'completed' && (
                          <CheckCircle2 className="w-3 h-3 text-brutal-success" />
                        )}
                        {task.status === 'failed' && (
                          <AlertCircle className="w-3 h-3 text-brutal-error" />
                        )}
                        {task.status === 'pending' && (
                          <div className="w-3 h-3 border border-brutal-muted rounded-full" />
                        )}
                        <span className="text-xs font-mono truncate">
                          {AGENT_LABELS[task.agent_type] || task.agent_type}
                        </span>
                      </div>
                      {task.model && (
                        <p className="text-[10px] text-brutal-muted font-mono mt-1 truncate">
                          {task.provider} / {task.model}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="p-4 border-b border-brutal-border bg-brutal-bg/50">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-brutal-accent flex-shrink-0 mt-0.5" />
                <p className="text-xs font-mono text-brutal-text">{summary}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {Object.keys(results).length > 0 && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-brutal-muted font-mono">执行结果</p>
              {Object.entries(results).map(([agentType, result]) => {
                const isExpanded = expandedAgents.has(agentType);
                return (
                  <div
                    key={agentType}
                    className={`border ${
                      result.success ? 'border-brutal-border' : 'border-brutal-error/30'
                    }`}
                  >
                    <button
                      onClick={() => toggleExpand(agentType)}
                      className="w-full flex items-center justify-between p-3 bg-brutal-bg hover:bg-brutal-surface transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-brutal-accent" />
                        <span className="text-xs font-mono font-bold">
                          {AGENT_LABELS[agentType] || agentType}
                        </span>
                        {result.success ? (
                          <CheckCircle2 className="w-3 h-3 text-brutal-success" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-brutal-error" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {result.prompt_tokens > 0 && (
                          <span className="text-[10px] text-brutal-muted font-mono">
                            {result.prompt_tokens + result.completion_tokens} tokens
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3 text-brutal-muted" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-brutal-muted" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="p-3 border-t border-brutal-border">
                        {result.error && (
                          <p className="text-xs text-brutal-error font-mono mb-2">
                            错误: {result.error}
                          </p>
                        )}
                        <pre className="text-[11px] font-mono text-brutal-muted whitespace-pre-wrap overflow-auto max-h-64">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* History */}
          {history.length > 0 && !isRunning && (
            <div className="p-4 border-t border-brutal-border">
              <p className="text-xs text-brutal-muted font-mono mb-3">历史记录</p>
              <div className="space-y-2">
                {history.map((run) => (
                  <div
                    key={run.run_id}
                    className="flex items-center justify-between p-2 border border-brutal-border bg-brutal-bg"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 border ${
                          run.status === 'completed'
                            ? 'border-brutal-success text-brutal-success'
                            : run.status === 'failed'
                            ? 'border-brutal-error text-brutal-error'
                            : 'border-brutal-warning text-brutal-warning'
                        }`}
                      >
                        {run.status}
                      </span>
                      <span className="text-xs font-mono">{STRATEGY_CONFIG[run.strategy as Strategy]?.label || run.strategy}</span>
                    </div>
                    <span className="text-[10px] text-brutal-muted font-mono">
                      {new Date(run.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
