// SparkBin 微信小程序全局状态管理
// 使用 React Context + useReducer 模式（小程序环境轻量方案）

import { createContext, useContext, useReducer, useCallback } from 'react';
import type { ProjectListItem, UserProfile, Theme, AIProvider } from '../types';

// ===== State 定义 =====
interface AppState {
  // 认证
  isLoggedIn: boolean;
  token: string | null;

  // 用户
  user: UserProfile | null;

  // 项目列表
  projects: ProjectListItem[];
  projectsLoading: boolean;

  // 主题
  theme: Theme;

  // AI 配置
  preferredModel: AIProvider | null;

  // 全局加载
  globalLoading: boolean;
}

type AppAction =
  | { type: 'SET_AUTH'; payload: { token: string; user: UserProfile } }
  | { type: 'CLEAR_AUTH' }
  | { type: 'SET_USER'; payload: UserProfile }
  | { type: 'SET_PROJECTS'; payload: ProjectListItem[] }
  | { type: 'SET_PROJECTS_LOADING'; payload: boolean }
  | { type: 'ADD_PROJECT'; payload: ProjectListItem }
  | { type: 'UPDATE_PROJECT'; payload: ProjectListItem }
  | { type: 'REMOVE_PROJECT'; payload: string }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_PREFERRED_MODEL'; payload: AIProvider }
  | { type: 'SET_GLOBAL_LOADING'; payload: boolean };

const initialState: AppState = {
  isLoggedIn: false,
  token: null,
  user: null,
  projects: [],
  projectsLoading: false,
  theme: 'dark',
  preferredModel: null,
  globalLoading: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return {
        ...state,
        isLoggedIn: true,
        token: action.payload.token,
        user: action.payload.user,
      };
    case 'CLEAR_AUTH':
      return {
        ...state,
        isLoggedIn: false,
        token: null,
        user: null,
        projects: [],
      };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'SET_PROJECTS_LOADING':
      return { ...state, projectsLoading: action.payload };
    case 'ADD_PROJECT':
      return { ...state, projects: [action.payload, ...state.projects] };
    case 'UPDATE_PROJECT': {
      const idx = state.projects.findIndex((p) => p.id === action.payload.id);
      if (idx === -1) return state;
      const next = [...state.projects];
      next[idx] = action.payload;
      return { ...state, projects: next };
    }
    case 'REMOVE_PROJECT':
      return { ...state, projects: state.projects.filter((p) => p.id !== action.payload) };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_PREFERRED_MODEL':
      return { ...state, preferredModel: action.payload };
    case 'SET_GLOBAL_LOADING':
      return { ...state, globalLoading: action.payload };
    default:
      return state;
  }
}

// ===== Context =====
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppStore must be used within AppProvider');
  }
  return ctx;
}

// ===== 便捷 Hooks =====
export function useAuth() {
  const { state, dispatch } = useAppStore();

  const login = useCallback((token: string, user: UserProfile) => {
    dispatch({ type: 'SET_AUTH', payload: { token, user } });
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch({ type: 'CLEAR_AUTH' });
  }, [dispatch]);

  return {
    isLoggedIn: state.isLoggedIn,
    user: state.user,
    login,
    logout,
  };
}

export function useProjects() {
  const { state, dispatch } = useAppStore();

  const setProjects = useCallback((projects: ProjectListItem[]) => {
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, [dispatch]);

  const addProject = useCallback((project: ProjectListItem) => {
    dispatch({ type: 'ADD_PROJECT', payload: project });
  }, [dispatch]);

  const removeProject = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PROJECT', payload: id });
  }, [dispatch]);

  return {
    projects: state.projects,
    projectsLoading: state.projectsLoading,
    setProjects,
    addProject,
    removeProject,
  };
}

export function useTheme() {
  const { state, dispatch } = useAppStore();

  const setTheme = useCallback((theme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, [dispatch]);

  return {
    theme: state.theme,
    setTheme,
  };
}
