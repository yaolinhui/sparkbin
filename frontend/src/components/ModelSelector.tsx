import { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';
import { useI18n } from '../i18n/hooks';
import { getCurrentProvider, setCurrentProvider } from '../services/ai';
import { authApi, aiApi } from '../services/api';
import type { AIProvider } from '../services/api';
import { ModelSelectorModal } from './ModelSelectorModal';

interface ModelSelectorProps {
  className?: string;
}

export function ModelSelector({ className = '' }: ModelSelectorProps) {
  const { t, language } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<AIProvider>(getCurrentProvider());
  const [hasProviders, setHasProviders] = useState(true);

  // 组件加载时同步后端存储的模型偏好
  useEffect(() => {
    syncPreferredModel();
    checkProviders();
  }, []);

  const syncPreferredModel = async () => {
    try {
      const { provider } = await authApi.getPreferredModel();
      if (provider) {
        setCurrentModel(provider);
        setCurrentProvider(provider);
      }
    } catch {
      // 忽略错误，使用 localStorage 中的值
    }
  };

  const checkProviders = async () => {
    try {
      const providers = await aiApi.getProviders();
      setHasProviders(providers.length > 0);
    } catch {
      setHasProviders(false);
    }
  };

  const handleSelect = async (provider: AIProvider) => {
    try {
      await authApi.setPreferredModel(provider);
      setCurrentModel(provider);
      setCurrentProvider(provider);
    } catch (err) {
      console.error('Failed to set preferred model:', err);
    }
  };

  const displayNames: Record<AIProvider, { zh: string; en: string }> = {
    deepseek: { zh: 'DeepSeek', en: 'DeepSeek' },
    kimi: { zh: 'Kimi', en: 'Kimi' },
    doubao: { zh: '豆包', en: 'Doubao' },
    openai: { zh: 'OpenAI', en: 'OpenAI' },
  };

  const displayName = hasProviders
    ? displayNames[currentModel][language]
    : 'Negative Seeker';

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 border border-brutal-border bg-brutal-surface hover:border-brutal-text hover:bg-brutal-surface-hover transition-colors ${className}`}
        title={t('ai.select_model')}
      >
        <Cpu className="w-4 h-4 text-brutal-accent" />
        <span className="font-mono text-xs">{`> ${displayName}`}</span>
      </button>

      <ModelSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentModel={currentModel}
        onSelect={handleSelect}
      />
    </>
  );
}
