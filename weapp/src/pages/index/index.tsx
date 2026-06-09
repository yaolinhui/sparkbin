import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { CustomNav } from '../../components/CustomNav';
import { ProjectCard } from '../../components/ProjectCard';
import { BrutalButton } from '../../components/BrutalButton';
import { projectsApi } from '../../services/api';
import type { ProjectListItem } from '../../types';
import './index.scss';

export default function IndexPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await projectsApi.list();
      const mapped: ProjectListItem[] = data.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        currentStage: p.current_stage,
        projectType: p.project_type,
        updatedAt: p.updated_at,
      }));
      setProjects(mapped);
    } catch {
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjects(false);
  };

  const handleProjectClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/project-detail/index?id=${id}` });
  };

  const handleCreateProject = () => {
    Taro.navigateTo({ url: '/pages/project-detail/index?mode=create' });
  };

  return (
    <View className="page-container">
      <CustomNav title="PROJECTS" />

      <ScrollView
        scrollY
        className="page-content-scroll"
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
      >
        {/* 顶部操作栏 */}
        <View className="flex justify-between items-center px-5 py-4 border-b">
          <Text className="text-sm text-muted uppercase">
            {projects.length} PROJECTS
          </Text>
          <BrutalButton size="small" onClick={handleCreateProject}>
            + NEW
          </BrutalButton>
        </View>

        {/* 项目列表 */}
        {projects.length === 0 && !loading ? (
          <View className="brutal-empty">
            <Text className="empty-text">NO PROJECTS YET</Text>
            <Text className="empty-subtext">Tap + NEW to create your first project</Text>
            <BrutalButton className="mt-8" variant="primary" block onClick={handleCreateProject}>
              CREATE FIRST PROJECT
            </BrutalButton>
          </View>
        ) : (
          <View>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project.id)}
              />
            ))}
            {/* 底部留白（避开 TabBar） */}
            <View style={{ height: '40rpx' }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
