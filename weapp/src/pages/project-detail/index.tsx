import { useEffect, useState } from 'react';
import { View, Text, Textarea, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { CustomNav } from '../../components/CustomNav';
import { BrutalButton } from '../../components/BrutalButton';
import { BrutalInput } from '../../components/BrutalInput';
import { BrutalCard } from '../../components/BrutalCard';
import { projectsApi } from '../../services/api';
import { STAGE_ORDER, STAGE_LABELS, type StageKey, type ApiProject } from '../../types';
import './index.scss';

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id, mode } = router.params;
  const isCreateMode = mode === 'create';

  const [project, setProject] = useState<ApiProject | null>(null);
  const [title, setTitle] = useState('');
  const [painPoint, setPainPoint] = useState('');
  const [originalIdea, setOriginalIdea] = useState('');
  const [editingStage, setEditingStage] = useState<StageKey | null>(null);
  const [stageContent, setStageContent] = useState('');
  const [expandedStages, setExpandedStages] = useState<Set<StageKey>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isCreateMode && id) {
      loadProject(id);
    }
  }, [id, isCreateMode]);

  const loadProject = async (projectId: string) => {
    setLoading(true);
    try {
      const data = await projectsApi.get(projectId);
      setProject(data);
      // 默认展开当前阶段和已完成的阶段
      const expanded = new Set<StageKey>();
      data.stages.forEach((s) => {
        if (s.completed_at || s.stage_key === data.current_stage) {
          expanded.add(s.stage_key);
        }
      });
      setExpandedStages(expanded);
    } catch {
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = (stage: StageKey) => {
    const next = new Set(expandedStages);
    if (next.has(stage)) {
      next.delete(stage);
    } else {
      next.add(stage);
    }
    setExpandedStages(next);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入项目名称', icon: 'none' });
      return;
    }
    try {
      const data = await projectsApi.create({
        title,
        pain_point: painPoint,
        original_idea: originalIdea,
      });
      Taro.redirectTo({ url: `/pages/project-detail/index?id=${data.id}` });
    } catch {
      Taro.showToast({ title: '创建失败', icon: 'none' });
    }
  };

  const handleSaveStage = async (stage: StageKey) => {
    if (!id) return;
    try {
      await projectsApi.updateStageContent(id, stage, stageContent);
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setEditingStage(null);
      loadProject(id);
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    }
  };

  const handleCompleteStage = async (stage: StageKey) => {
    if (!id) return;
    try {
      await projectsApi.completeStage(id, stage);
      Taro.showToast({ title: '阶段完成', icon: 'success' });
      loadProject(id);
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  if (isCreateMode) {
    return (
      <View className="page-container">
        <CustomNav title="NEW PROJECT" showBack />
        <ScrollView scrollY className="page-content-scroll">
          <View className="px-5 py-6">
            <View className="form-group">
              <Text className="form-label">PROJECT NAME</Text>
              <BrutalInput value={title} onInput={setTitle} placeholder="My Awesome Idea" />
            </View>

            <View className="form-group">
              <Text className="form-label">PAIN POINT</Text>
              <Textarea
                className="brutal-textarea"
                value={painPoint}
                onInput={(e) => setPainPoint(e.detail.value)}
                placeholder="What problem are you solving?"
              />
            </View>

            <View className="form-group">
              <Text className="form-label">ORIGINAL IDEA</Text>
              <Textarea
                className="brutal-textarea"
                value={originalIdea}
                onInput={(e) => setOriginalIdea(e.detail.value)}
                placeholder="Describe your idea in a few sentences"
              />
            </View>

            <BrutalButton variant="primary" block onClick={handleCreate}>
              CREATE PROJECT
            </BrutalButton>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!project) {
    return (
      <View className="page-container">
        <CustomNav title="LOADING..." showBack />
        <ScrollView scrollY className="page-content-scroll">
          <View className="brutal-empty">
            <Text className="empty-text">LOADING...</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="page-container">
      <CustomNav title={project.title.toUpperCase()} showBack />
      <ScrollView scrollY className="page-content-scroll">
        <View className="px-5 py-5">
          {/* 项目信息卡片 */}
          <BrutalCard title="PROJECT INFO">
            <View className="mb-4">
              <Text className="text-xs text-muted uppercase" style={{ letterSpacing: '2rpx' }}>
                PAIN POINT
              </Text>
              <Text className="text-base mt-2" style={{ lineHeight: 1.6 }}>
                {project.pain_point || '—'}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-muted uppercase" style={{ letterSpacing: '2rpx' }}>
                IDEA
              </Text>
              <Text className="text-base mt-2" style={{ lineHeight: 1.6 }}>
                {project.original_idea || '—'}
              </Text>
            </View>
          </BrutalCard>

          {/* 阶段列表 - 可折叠 */}
          <View className="mt-6">
            <Text className="text-xs text-muted uppercase mb-4" style={{ letterSpacing: '2rpx' }}>
              STAGES
            </Text>

            {STAGE_ORDER.map((stage) => {
              const stageData = project.stages.find((s) => s.stage_key === stage);
              const isExpanded = expandedStages.has(stage);
              const isEditing = editingStage === stage;
              const isCompleted = !!stageData?.completed_at;
              const isCurrent = project.current_stage === stage;

              return (
                <View key={stage} className="brutal-card" style={{ marginBottom: '16rpx' }}>
                  {/* 阶段标题栏（可点击折叠） */}
                  <View
                    className="flex justify-between items-center"
                    onClick={() => !isEditing && toggleStage(stage)}
                  >
                    <View className="flex items-center gap-3">
                      <Text className="text-base font-bold">{STAGE_LABELS[stage]}</Text>
                      {isCompleted && (
                        <View className="brutal-badge badge-success">
                          <Text>DONE</Text>
                        </View>
                      )}
                      {isCurrent && !isCompleted && (
                        <View className="brutal-badge badge-accent">
                          <Text>CURRENT</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-lg text-muted">
                      {isExpanded ? '−' : '+'}
                    </Text>
                  </View>

                  {/* 阶段内容 */}
                  {isExpanded && (
                    <View className="mt-4 pt-4" style={{ borderTop: '2rpx solid var(--brutal-border)' }}>
                      {isEditing ? (
                        <View>
                          <Textarea
                            className="brutal-textarea"
                            value={stageContent}
                            onInput={(e) => setStageContent(e.detail.value)}
                            placeholder="Write your stage content here..."
                          />
                          <View className="flex gap-3 mt-4">
                            <BrutalButton size="small" variant="primary" onClick={() => handleSaveStage(stage)}>
                              SAVE
                            </BrutalButton>
                            <BrutalButton size="small" onClick={() => setEditingStage(null)}>
                              CANCEL
                            </BrutalButton>
                          </View>
                        </View>
                      ) : (
                        <View>
                          <Text className="text-base" style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {stageData?.content || 'No content yet. Tap EDIT to add.'}
                          </Text>
                          <View className="flex gap-3 mt-5">
                            <BrutalButton
                              size="small"
                              onClick={() => {
                                setEditingStage(stage);
                                setStageContent(stageData?.content || '');
                              }}
                            >
                              EDIT
                            </BrutalButton>
                            {!isCompleted && (
                              <BrutalButton
                                size="small"
                                variant="primary"
                                onClick={() => handleCompleteStage(stage)}
                              >
                                COMPLETE
                              </BrutalButton>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
