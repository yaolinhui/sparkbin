import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { CustomNav } from '../../components/CustomNav';
import { BrutalButton } from '../../components/BrutalButton';
import { BrutalCard } from '../../components/BrutalCard';
import { aiApi } from '../../services/api';
import type { AgentRun } from '../../types';
import './index.scss';

const STRATEGIES = [
  { key: 'router', label: 'ROUTER', desc: '智能路由' },
  { key: 'parallel_all', label: 'PARALLEL', desc: '全专家并行' },
  { key: 'sequential', label: 'SEQUENTIAL', desc: '顺序执行' },
];

export default function AgentCockpitPage() {
  const router = useRouter();
  const { project_id } = router.params;

  const [selectedStrategy, setSelectedStrategy] = useState('router');
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const data = await aiApi.listAgentRuns(project_id, 10);
      const mapped: AgentRun[] = data.map((r) => ({
        runId: r.run_id,
        status: r.status,
        strategy: r.strategy,
        summary: r.summary,
        createdAt: r.created_at,
        completedAt: r.completed_at,
        results: {},
        tasks: [],
      }));
      setRuns(mapped);
    } catch {
      // ignore
    }
  };

  const handleRun = async () => {
    if (!project_id) {
      Taro.showToast({ title: '请先选择项目', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      const res = await aiApi.runAgent({
        project_id,
        strategy: selectedStrategy,
      });
      Taro.showToast({ title: 'Agent 已启动', icon: 'success' });
      pollRunStatus(res.run_id);
    } catch {
      Taro.showToast({ title: '启动失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const pollRunStatus = async (runId: string) => {
    setPolling(true);
    let completed = false;
    let attempts = 0;

    const check = async () => {
      if (completed || attempts > 60) {
        setPolling(false);
        return;
      }
      attempts++;

      try {
        const data = await aiApi.getAgentRun(runId);
        const run: AgentRun = {
          runId: data.run_id,
          status: data.status,
          strategy: data.strategy,
          summary: data.summary,
          createdAt: data.created_at,
          completedAt: data.completed_at,
          results: data.results,
          tasks: data.tasks.map((t) => ({
            id: t.id,
            agentType: t.agent_type,
            status: t.status,
            provider: t.provider,
            model: t.model,
            error: t.error,
          })),
        };
        setCurrentRun(run);

        if (data.status === 'completed' || data.status === 'failed') {
          completed = true;
          setPolling(false);
          loadRuns();
        } else {
          setTimeout(check, 2000);
        }
      } catch {
        setTimeout(check, 2000);
      }
    };

    check();
  };

  return (
    <View className="page-container">
      <CustomNav title="AGENT COCKPIT" />
      <ScrollView scrollY style={{ marginTop: '88rpx', padding: '32rpx', height: 'calc(100vh - 88rpx)' }}>
        {/* 策略选择 */}
        <BrutalCard title="STRATEGY">
          <View className="flex gap-2 mt-2">
            {STRATEGIES.map((s) => (
              <View
                key={s.key}
                className={`brutal-badge ${selectedStrategy === s.key ? 'badge-accent' : 'badge-outline'}`}
                onClick={() => setSelectedStrategy(s.key)}
              >
                <Text>{s.label}</Text>
              </View>
            ))}
          </View>
          <Text className="text-sm text-muted mt-2">
            {STRATEGIES.find((s) => s.key === selectedStrategy)?.desc}
          </Text>
        </BrutalCard>

        {/* 运行按钮 */}
        <BrutalButton
          className="mt-4"
          variant="primary"
          block
          onClick={handleRun}
          disabled={loading || polling}
        >
          {loading ? 'STARTING...' : polling ? 'RUNNING...' : 'RUN AGENTS'}
        </BrutalButton>

        {/* 当前运行状态 */}
        {currentRun && (
          <BrutalCard className="mt-4" title="CURRENT RUN">
            <View className="mb-2">
              <Text className="text-sm text-muted">STATUS</Text>
              <Text className="text-base uppercase">{currentRun.status}</Text>
            </View>
            <View className="mb-2">
              <Text className="text-sm text-muted">STRATEGY</Text>
              <Text className="text-base">{currentRun.strategy.toUpperCase()}</Text>
            </View>
            {currentRun.summary && (
              <View>
                <Text className="text-sm text-muted">SUMMARY</Text>
                <Text className="text-base mt-1">{currentRun.summary}</Text>
              </View>
            )}
            {currentRun.tasks.length > 0 && (
              <View className="mt-3">
                <Text className="text-sm text-muted mb-2">TASKS</Text>
                {currentRun.tasks.map((task) => (
                  <View key={task.id} className="flex justify-between items-center py-2 border-b">
                    <Text className="text-base">{task.agentType.toUpperCase()}</Text>
                    <View className={`brutal-badge ${task.status === 'completed' ? 'badge-accent' : 'badge-outline'}`}>
                      <Text className="text-xs">{task.status.toUpperCase()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </BrutalCard>
        )}

        {/* 历史记录 */}
        {runs.length > 0 && (
          <View className="mt-4">
            <Text className="text-sm text-muted uppercase mb-2">HISTORY</Text>
            {runs.map((run) => (
              <View key={run.runId} className="brutal-list-item">
                <View className="flex flex-col flex-1">
                  <Text className="text-base">{run.strategy.toUpperCase()}</Text>
                  <Text className="text-xs text-muted">{run.summary || 'No summary'}</Text>
                </View>
                <View className={`brutal-badge ${run.status === 'completed' ? 'badge-accent' : 'badge-outline'}`}>
                  <Text className="text-xs">{run.status.toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
