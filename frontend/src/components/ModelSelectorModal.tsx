import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n/hooks';
import { aiApi } from '../services/api';
import type { AIProvider } from '../services/api';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: AIProvider | null;
  onSelect: (provider: AIProvider) => void;
}

export function ModelSelectorModal({
  isOpen,
  onClose,
  currentModel,
  onSelect,
}: ModelSelectorModalProps) {
  const { t, language } = useI18n();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProviders();
    }
  }, [isOpen]);

  const fetchProviders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await aiApi.getProviders();
      setProviders(data.map((p) => p.provider));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (provider: AIProvider) => {
    onSelect(provider);
    onClose();
  };

  if (!isOpen) return null;

  const displayNames: Record<AIProvider, Record<string, string>> = {
    deepseek: { zh: 'DeepSeek', en: 'DeepSeek', ja: 'DeepSeek', ko: 'DeepSeek', es: 'DeepSeek', fr: 'DeepSeek', de: 'DeepSeek' },
    kimi: { zh: 'Kimi', en: 'Kimi', ja: 'Kimi', ko: 'Kimi', es: 'Kimi', fr: 'Kimi', de: 'Kimi' },
    doubao: { zh: '豆包', en: 'Doubao', ja: 'Doubao', ko: 'Doubao', es: 'Doubao', fr: 'Doubao', de: 'Doubao' },
    openai: { zh: 'OpenAI', en: 'OpenAI', ja: 'OpenAI', ko: 'OpenAI', es: 'OpenAI', fr: 'OpenAI', de: 'OpenAI' },
    ollama: { zh: 'Ollama', en: 'Ollama', ja: 'Ollama', ko: 'Ollama', es: 'Ollama', fr: 'Ollama', de: 'Ollama' },
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-brutal-muted font-mono">//</span>
            <span className="text-sm font-mono font-bold">{t('modal.select_model')}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading && (
            <div className="text-center py-4 text-brutal-muted">
              <span className="text-xs font-mono">Loading...</span>
            </div>
          )}

          {error && (
            <div className="border border-brutal-warning text-brutal-warning p-2 text-xs font-mono mb-4">
              {error}
            </div>
          )}

          {!isLoading && !error && providers.length === 0 && (
            <div className="text-center py-4 text-brutal-muted font-mono text-sm">
              <p>{t('ai.no_models_available')}</p>
            </div>
          )}

          <div className="space-y-2">
            {providers.map((provider) => (
              <button
                key={provider}
                onClick={() => handleSelect(provider)}
                className={`w-full flex items-center justify-between p-3 border font-mono text-sm transition-colors ${
                  currentModel === provider
                    ? 'border-brutal-accent bg-brutal-accent text-brutal-bg'
                    : 'border-brutal-border hover:border-brutal-text hover:bg-brutal-surface-hover'
                }`}
              >
                <span>{'>'} {displayNames[provider][language]}</span>
                {currentModel === provider && (
                  <span className="text-xs">[ACTIVE]</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg">
          <div className="text-xs font-mono text-brutal-muted">
            {'>'} {providers.length} {t('ai.providers_count')}
            <span className="animate-blink">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}
