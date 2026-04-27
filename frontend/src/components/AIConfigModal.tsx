import { useState, useEffect } from 'react';
import { X, Cpu, Check, AlertCircle, Server } from 'lucide-react';
import { useAIStore } from '../stores/aiStore';
import { aiApi, type AIProvider, type AIConfig } from '../services/api';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_INFO: Record<AIProvider, { name: string; desc: string; defaultUrl: string; defaultModel: string }> = {
  deepseek: {
    name: 'DeepSeek',
    desc: 'DeepSeek Chat API',
    defaultUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  kimi: {
    name: 'Kimi (Moonshot)',
    desc: 'Moonshot AI API',
    defaultUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
  },
  doubao: {
    name: '豆包 (Volces)',
    desc: '字节跳动豆包 API',
    defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-lite-4k',
  },
  openai: {
    name: 'OpenAI',
    desc: 'OpenAI API',
    defaultUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4',
  },
};

export function AIConfigModal({ isOpen, onClose }: AIConfigModalProps) {
  // i18n hook reserved for future use
  const { provider, setProvider, refreshProviders } = useAIStore();

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(provider);
  const [configs, setConfigs] = useState<Record<AIProvider, AIConfig>>({
    deepseek: { base_url: '', api_key: '', default_model: '', is_active: false },
    kimi: { base_url: '', api_key: '', default_model: '', is_active: false },
    doubao: { base_url: '', api_key: '', default_model: '', is_active: false },
    openai: { base_url: '', api_key: '', default_model: '', is_active: false },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
    }
  }, [isOpen]);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const configs = await aiApi.getConfigs();
      const configMap: Record<AIProvider, AIConfig> = {
        deepseek: { base_url: '', api_key: '', default_model: '', is_active: false },
        kimi: { base_url: '', api_key: '', default_model: '', is_active: false },
        doubao: { base_url: '', api_key: '', default_model: '', is_active: false },
        openai: { base_url: '', api_key: '', default_model: '', is_active: false },
      };

      configs.forEach((c) => {
        if (c.provider in configMap) {
          configMap[c.provider as AIProvider] = {
            base_url: c.base_url,
            api_key: c.api_key === '***' ? '' : c.api_key, // 如果已配置，显示 ***
            default_model: c.default_model,
            is_active: c.is_active,
          };
        }
      });

      setConfigs(configMap);
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentConfig = configs[selectedProvider];
  const info = PROVIDER_INFO[selectedProvider];

  const handleProviderChange = (p: AIProvider) => {
    setSelectedProvider(p);
    setTestResult(null);
    setSaveMessage('');
  };

  const updateCurrentConfig = (updates: Partial<AIConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [selectedProvider]: { ...prev[selectedProvider], ...updates },
    }));
  };

  const handleTest = async () => {
    if (!currentConfig.api_key) {
      setTestResult('error');
      setTestError('请先输入 API Key');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setTestError('');

    try {
      // 先保存配置
      await aiApi.updateConfig(selectedProvider, {
        ...currentConfig,
        is_active: true,
      });

      // 简单测试 - 尝试获取提供商列表（需要认证）
      await refreshProviders();
      setTestResult('success');
    } catch (err) {
      setTestResult('error');
      setTestError(err instanceof Error ? err.message : '连接失败');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!currentConfig.api_key) {
      setSaveMessage('请输入 API Key');
      return;
    }

    setIsLoading(true);
    try {
      await aiApi.updateConfig(selectedProvider, {
        ...currentConfig,
        is_active: true,
      });

      setProvider(selectedProvider);
      setSaveMessage('配置已保存');
      await refreshProviders();

      setTimeout(() => {
        onClose();
        setSaveMessage('');
      }, 1000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDefault = () => {
    updateCurrentConfig({
      base_url: info.defaultUrl,
      default_model: info.defaultModel,
    });
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/95 flex items-center justify-center z-50 p-4">
      <div className="border border-brutal-border bg-brutal-surface w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-brutal-accent" />
            <span className="text-xs text-brutal-muted font-mono">// </span>
            <span className="text-sm font-mono font-bold">AI_BACKEND_CONFIG</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info Banner */}
          <div className="p-3 border border-brutal-accent bg-brutal-accent/5 text-xs font-mono">
            <div className="flex items-center gap-2 text-brutal-accent mb-1">
              <Cpu className="w-3 h-3" />
              <span>后端代理模式</span>
            </div>
            <p className="text-brutal-muted">
              API Key 将安全地存储在后端，前端不直接接触。
            </p>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`p-3 border text-left transition-colors ${
                    selectedProvider === p
                      ? 'border-brutal-accent bg-brutal-accent/10'
                      : 'border-brutal-border hover:border-brutal-text'
                  }`}
                >
                  <div className="text-sm font-mono">{PROVIDER_INFO[p].name}</div>
                  <div className="text-xs text-brutal-muted truncate">{PROVIDER_INFO[p].desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-brutal-muted uppercase">Status</span>
            {currentConfig.is_active ? (
              <span className="px-2 py-0.5 text-xs border border-brutal-success text-brutal-success bg-brutal-success/10">
                ACTIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs border border-brutal-muted text-brutal-muted">
                NOT_CONFIGURED
              </span>
            )}
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              API Key
            </label>
            <input
              type="password"
              value={currentConfig.api_key}
              onChange={(e) => updateCurrentConfig({ api_key: e.target.value })}
              placeholder="sk-..."
              className="w-full p-3 border border-brutal-border bg-brutal-bg focus:border-brutal-accent transition-colors font-mono text-sm"
            />
          </div>

          {/* Base URL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-mono text-brutal-muted uppercase">
                Base URL
              </label>
              <button
                onClick={handleUseDefault}
                className="text-xs text-brutal-accent hover:underline"
              >
                使用默认
              </button>
            </div>
            <input
              type="text"
              value={currentConfig.base_url}
              onChange={(e) => updateCurrentConfig({ base_url: e.target.value })}
              placeholder={info.defaultUrl}
              className="w-full p-3 border border-brutal-border bg-brutal-bg focus:border-brutal-accent transition-colors font-mono text-sm"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              Model
            </label>
            <input
              type="text"
              value={currentConfig.default_model}
              onChange={(e) => updateCurrentConfig({ default_model: e.target.value })}
              placeholder={info.defaultModel}
              className="w-full p-3 border border-brutal-border bg-brutal-bg focus:border-brutal-accent transition-colors font-mono text-sm"
            />
          </div>

          {/* Test Result */}
          {testResult === 'success' && (
            <div className="p-3 border border-brutal-success text-brutal-success text-sm font-mono flex items-center gap-2">
              <Check className="w-4 h-4" />
              Configuration saved successfully
            </div>
          )}

          {testResult === 'error' && (
            <div className="p-3 border border-brutal-warning text-brutal-warning text-sm font-mono">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4" />
                Error
              </div>
              <div className="text-xs opacity-80">{testError}</div>
            </div>
          )}

          {saveMessage && !testResult && (
            <div className={`p-3 border text-sm font-mono ${saveMessage.includes('成功') || saveMessage.includes('已保存') ? 'border-brutal-success text-brutal-success' : 'border-brutal-warning text-brutal-warning'}`}>
              {saveMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleTest}
              disabled={!currentConfig.api_key || isTesting || isLoading}
              className="btn-brutal h-9 flex-1 disabled:opacity-50"
            >
              {isTesting ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-3 h-3 border border-brutal-text border-t-transparent animate-spin" />
                  SAVING...
                </span>
              ) : 'SAVE & TEST'}
            </button>
            <button
              onClick={handleSave}
              disabled={!currentConfig.api_key || isLoading}
              className="btn-brutal-primary h-9 flex-1 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-3 h-3 border border-brutal-bg border-t-transparent animate-spin" />
                  SAVING...
                </span>
              ) : 'SAVE'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg">
          <div className="text-xs font-mono text-brutal-muted">
            {'>'} Current: {PROVIDER_INFO[selectedProvider].name}
            {currentConfig.is_active && ' [ACTIVE]'}
            <span className="animate-blink">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}
