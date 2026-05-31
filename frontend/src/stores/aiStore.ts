import { create } from 'zustand';
import { aiService, type AIProvider } from '../services/ai';
import { aiApi } from '../services/api';

interface AIState {
  provider: AIProvider;
  isConfigured: boolean;
  availableProviders: { provider: AIProvider; name: string; is_active: boolean }[];
  isLoading: boolean;
}

interface AIActions {
  setProvider: (provider: AIProvider) => void;
  refreshProviders: () => Promise<void>;
  checkConfiguration: () => Promise<boolean>;
}

// 从 localStorage 读取保存的 provider
const getSavedProvider = (): AIProvider => {
  const saved = localStorage.getItem('sparkbin_ai_provider_v2') as AIProvider | null;
  if (saved && ['deepseek', 'kimi', 'doubao', 'openai', 'ollama'].includes(saved)) {
    return saved;
  }
  return 'deepseek';
};

export const useAIStore = create<AIState & AIActions>()(
  (set) => ({
    provider: getSavedProvider(),
    isConfigured: false,
    availableProviders: [],
    isLoading: false,

    setProvider: (provider: AIProvider) => {
      aiService.updateProvider(provider);
      localStorage.setItem('sparkbin_ai_provider_v2', provider);
      set({ provider });
    },

    refreshProviders: async () => {
      try {
        const providers = await aiApi.getProviders();
        set({
          availableProviders: providers.map(p => ({
            provider: p.provider,
            name: p.provider.toUpperCase(),
            is_active: p.is_active,
          })),
        });
      } catch (error) {
        console.error('Failed to refresh providers:', error);
      }
    },

    checkConfiguration: async () => {
      try {
        const providers = await aiApi.getProviders();
        const active = providers.some(p => p.is_active);
        set({ isConfigured: active });
        return active;
      } catch (error) {
        set({ isConfigured: false });
        return false;
      }
    },
  })
);

export { aiService };
