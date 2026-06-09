import { View, Text } from '@tarojs/components';
import type { ProjectListItem } from '../types';
import { STAGE_LABELS, STATUS_LABELS, PROJECT_TYPE_LABELS, PROJECT_TYPE_ICONS } from '../types';

interface ProjectCardProps {
  project: ProjectListItem;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <View className="brutal-list-item" onClick={onClick}>
      <View className="flex flex-col flex-1">
        <View className="flex items-center gap-2">
          <Text className="text-base font-bold">{PROJECT_TYPE_ICONS[project.projectType]}</Text>
          <Text className="item-title">{project.title}</Text>
        </View>
        <View className="flex items-center gap-2 mt-2">
          <View className="brutal-badge badge-outline">
            <Text>{STAGE_LABELS[project.currentStage]}</Text>
          </View>
          <View className="brutal-badge badge-outline">
            <Text>{STATUS_LABELS[project.status]}</Text>
          </View>
        </View>
      </View>
      <Text className="item-meta">{PROJECT_TYPE_LABELS[project.projectType]}</Text>
    </View>
  );
}
