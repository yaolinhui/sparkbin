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

  const displayNames: Record<AIProvider, Record<string, string>> = {
    deepseek: { zh: 'DeepSeek', en: 'DeepSeek', ja: 'DeepSeek', ko: 'DeepSeek', es: 'DeepSeek', fr: 'DeepSeek', de: 'DeepSeek' },
    kimi: { zh: 'Kimi', en: 'Kimi', ja: 'Kimi', ko: 'Kimi', es: 'Kimi', fr: 'Kimi', de: 'Kimi' },
    doubao: { zh: '豆包', en: 'Doubao', ja: 'Doubao', ko: 'Doubao', es: 'Doubao', fr: 'Doubao', de: 'Doubao' },
    openai: { zh: 'OpenAI', en: 'OpenAI', ja: 'OpenAI', ko: 'OpenAI', es: 'OpenAI', fr: 'OpenAI', de: 'OpenAI' },
  };

  const displayName = hasProviders
    ? displayNames[currentModel][language]
    : t('ai.no_models_available');

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 border border-brutal-border bg-brutal-surface text-brutal-text hover:border-brutal-accent hover:bg-brutal-surface-hover transition-colors ${className}`}
        title={t('ai.select_model')}
      >
        <Cpu className="w-4 h-4" />
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
