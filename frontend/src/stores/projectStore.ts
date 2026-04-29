import { create } from 'zustand';
import type { Project, ProjectStatus, StageKey, Stage, PromoteStage } from '../types';
import { projectsApi, type ProjectDetail } from '../services/api';

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  lastSyncAt: string | null;
  error: string | null;
}

interface ProjectActions {
  fetchProjects: () => Promise<void>;
  createProject: (title: string, painPoint: string, originalIdea?: string) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateProjectStatus: (id: string, status: ProjectStatus) => Promise<void>;
  updateStageContent: (id: string, stage: StageKey, content: string) => Promise<void>;
  completeStage: (id: string, stage: StageKey) => Promise<void>;
  reopenStage: (id: string, stage: StageKey) => Promise<void>;
  addPromoteTask: (id: string, text: string) => Promise<void>;
  togglePromoteTask: (id: string, taskIndex: number) => Promise<void>;
  updatePromoteTask: (id: string, taskId: string, done: boolean) => Promise<void>;
  deletePromoteTask: (id: string, taskId: string) => Promise<void>;
}

// 转换后端项目数据为前端格式
export function convertProjectDetailToProject(detail: ProjectDetail): Project {
  const stages: Record<string, Stage | PromoteStage> = {};

  detail.stages.forEach((stage) => {
    const baseStage = {
      content: stage.content,
      completedAt: stage.completed_at,
      isLocked: stage.is_locked,
    };

    if (stage.stage_key === 'monetize') {
      stages[stage.stage_key] = {
        ...baseStage,
        tasks: detail.promote_tasks.map((t) => ({
          id: t.id,
          text: t.text,
          done: t.done,
          sortOrder: t.sort_order,
        })),
        aiSuggestions: detail.promote_suggestions[0] || { channels: [], templates: [] },
      };
    } else {
      stages[stage.stage_key] = baseStage;
    }
  });

  return {
    id: detail.id,
    title: detail.title,
    painPoint: detail.pain_point,
    originalIdea: detail.original_idea || '',
    status: detail.status,
    currentStage: detail.current_stage,
    stages: stages as unknown as Project['stages'],
    createdAt: detail.created_at,
    updatedAt: detail.updated_at,
  };
}

export const useProjectStore = create<ProjectState & ProjectActions>()((set, get) => ({
  projects: [],
  isLoading: false,
  lastSyncAt: null,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectsApi.list();
      // 将后端返回的数据转换为前端 Project 类型
      const convertedProjects = projects.map((p: { id: string; title: string; pain_point: string; original_idea: string; status: string; current_stage: string; created_at: string; updated_at: string }) => ({
        id: p.id,
        title: p.title,
        painPoint: p.pain_point,
        originalIdea: p.original_idea || '',
        status: p.status,
        currentStage: p.current_stage,
        stages: {} as Project['stages'], // 列表接口不返回完整 stages
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })) as Project[];
      set({ projects: convertedProjects, isLoading: false, lastSyncAt: new Date().toISOString() });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
        isLoading: false,
      });
    }
  },

  createProject: async (title: string, painPoint: string, originalIdea?: string) => {
    set({ isLoading: true, error: null });
    try {
      const newProject = await projectsApi.create({ title, pain_point: painPoint, original_idea: originalIdea });
      const project = convertProjectDetailToProject(newProject);
      set((state) => ({
        projects: [project, ...state.projects],
        isLoading: false,
        lastSyncAt: new Date().toISOString(),
      }));
      return project;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create project',
        isLoading: false,
      });
      return null;
    }
  },

  updateProject: async (id: string, updates: Partial<Project>) => {
    try {
      const backendUpdates: Record<string, string | number | boolean | object> = {};
      if (updates.title !== undefined) backendUpdates.title = updates.title;
      if (updates.painPoint !== undefined) backendUpdates.pain_point = updates.painPoint;
      if (updates.status !== undefined) backendUpdates.status = updates.status;
      if (updates.currentStage !== undefined) backendUpdates.current_stage = updates.currentStage;

      await projectsApi.update(id, backendUpdates);

      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update project' });
    }
  },

  deleteProject: async (id: string) => {
    try {
      await projectsApi.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        lastSyncAt: new Date().toISOString(),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete project' });
      throw error instanceof Error ? error : new Error('Failed to delete project');
    }
  },

  updateProjectStatus: async (id: string, status: ProjectStatus) => {
    await get().updateProject(id, { status });
  },

  updateStageContent: async (id: string, stage: StageKey, content: string) => {
    try {
      await projectsApi.updateStageContent(id, stage, content);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id
            ? {
                ...p,
                stages: {
                  ...p.stages,
                  [stage]: { ...p.stages[stage], content },
                },
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update stage' });
    }
  },

  completeStage: async (id: string, stage: StageKey) => {
    try {
      const result = await projectsApi.completeStage(id, stage);
      const updatedProject = convertProjectDetailToProject(result);

      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updatedProject : p)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to complete stage' });
    }
  },

  reopenStage: async (id: string, stage: StageKey) => {
    try {
      const result = await projectsApi.reopenStage(id, stage);
      const updatedProject = convertProjectDetailToProject(result);

      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updatedProject : p)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to reopen stage' });
    }
  },

  addPromoteTask: async (id: string, text: string) => {
    try {
      const result = await projectsApi.addTask(id, text);
      const updatedProject = convertProjectDetailToProject(result);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updatedProject : p)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add task' });
    }
  },

  togglePromoteTask: async (id: string, taskIndex: number) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return;

    const tasks = project.stages.monetize.tasks || [];
    const task = tasks[taskIndex];
    if (!task) return;

    await get().updatePromoteTask(id, task.id, !task.done);
  },

  updatePromoteTask: async (id: string, taskId: string, done: boolean) => {
    try {
      const result = await projectsApi.updateTask(id, taskId, { done });
      const updatedProject = convertProjectDetailToProject(result);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updatedProject : p)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update task' });
    }
  },

  deletePromoteTask: async (id: string, taskId: string) => {
    try {
      const result = await projectsApi.deleteTask(id, taskId);
      const updatedProject = convertProjectDetailToProject(result);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updatedProject : p)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete task' });
    }
  },
}));
