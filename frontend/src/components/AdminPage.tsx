import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Server, Key, FileText, Shield, Check, AlertCircle, Cpu, Eye, EyeOff } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { aiApi, adminApi, type AIProvider, type AIConfig } from '../services/api';
// i18n reserved for future use

const PROVIDER_INFO: Record<AIProvider, { name: string; desc: string; defaultUrl: string; defaultModel: string; noApiKey?: boolean }> = {
  deepseek: {
    name: 'DeepSeek',
    desc: 'DeepSeek Chat API',
    defaultUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-flash',
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
  ollama: {
    name: 'Ollama (本地)',
    desc: '本地部署的 AI 模型，无需 API Key',
    defaultUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    noApiKey: true,
  },
};

interface AdminPageProps {
  onLogout: () => void;
}

export function AdminPage({ onLogout }: AdminPageProps) {
  const navigate = useNavigate();
  // i18n hook reserved
  const [activeTab, setActiveTab] = useState<'ai' | 'logs'>('ai');

  // AI Config State
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('deepseek');
  const [configs, setConfigs] = useState<Record<AIProvider, AIConfig>>({
    deepseek: { base_url: '', api_key: '', default_model: '', is_active: false },
    kimi: { base_url: '', api_key: '', default_model: '', is_active: false },
    doubao: { base_url: '', api_key: '', default_model: '', is_active: false },
    openai: { base_url: '', api_key: '', default_model: '', is_active: false },
    ollama: { base_url: '', api_key: '', default_model: '', is_active: false },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<Record<AIProvider, Date | null>>({
    deepseek: null,
    kimi: null,
    doubao: null,
    openai: null,
    ollama: null,
  });

  // Logs State
  interface LogEntry {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_values?: string;
    new_values?: string;
    created_at: string;
  }
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    loadConfigs();
    loadLogs();
  }, []);

  const loadConfigs = async () => {
    try {
      const configs = await aiApi.getConfigs();

      setConfigs((prev) => {
        const next = { ...prev };
        configs.forEach((c) => {
          if (c.provider in next) {
            const provider = c.provider as AIProvider;
            next[provider] = {
              base_url: c.base_url,
              // 后端隐藏已配置的 key 为 ***，保留前端已有值避免输入框被清空
              api_key: c.api_key === '***' ? (prev[provider]?.api_key || '') : c.api_key,
              default_model: c.default_model,
              is_active: c.is_active,
            };
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Failed to load configs:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const logs = await adminApi.getLogs(50);
      setLogs(logs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const handleSave = async (provider: AIProvider = selectedProvider, silent = false) => {
    const config = configs[provider];
    const info = PROVIDER_INFO[provider];
    if (!info.noApiKey && !config.api_key) {
      if (!silent) setMessage({ type: 'error', text: '请输入 API Key' });
      return false;
    }

    if (!silent) setIsLoading(true);
    if (!silent) setMessage(null);

    try {
      await aiApi.updateConfig(provider, {
        ...config,
        is_active: true,
      });
      if (!silent) setMessage({ type: 'success', text: '配置已保存' });
      await loadConfigs();
      return true;
    } catch (err) {
      if (!silent) setMessage({ type: 'error', text: err instanceof Error ? err.message : '保存失败' });
      return false;
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleTest = async () => {
    const config = configs[selectedProvider];
    const info = PROVIDER_INFO[selectedProvider];
    if (!info.noApiKey && !config.api_key) {
      setMessage({ type: 'error', text: '请输入 API Key' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: 'info', text: '正在测试连接...' });

    try {
      const result = await aiApi.testConnection(selectedProvider, {
        base_url: config.base_url,
        api_key: config.api_key,
        default_model: config.default_model,
      });
      if (result.success) {
        setMessage({ type: 'success', text: `✓ ${result.message || '连接成功'}` });
        setLastTestedAt((prev) => ({ ...prev, [selectedProvider]: new Date() }));
        // 测试成功后自动保存配置
        await handleSave(selectedProvider, true);
      } else {
        setMessage({ type: 'error', text: `✗ ${result.message || '连接失败'}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '测试失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentConfig = (updates: Partial<AIConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [selectedProvider]: { ...prev[selectedProvider], ...updates },
    }));
  };

  const useDefault = () => {
    const info = PROVIDER_INFO[selectedProvider];
    updateCurrentConfig({
      base_url: info.defaultUrl,
      default_model: info.defaultModel,
    });
  };

  const currentConfig = configs[selectedProvider];

  return (
    <div className="min-h-[100dvh] bg-brutal-bg text-brutal-text font-mono">
      {/* Header */}
      <header className="border-b border-brutal-border bg-brutal-surface">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-brutal-muted hover:text-brutal-text transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">返回</span>
            </button>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-brutal-accent" />
              <h1 className="text-lg font-bold">系统管理</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <button
              onClick={onLogout}
              className="btn-brutal h-9 flex items-center gap-2 border-brutal-warning text-brutal-warning"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100dvh-73px)]">
        {/* Sidebar */}
        <aside className="w-64 border-r border-brutal-border bg-brutal-surface">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                activeTab === 'ai'
                  ? 'bg-brutal-accent text-brutal-bg'
                  : 'hover:bg-brutal-surface-hover'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>AI 服务配置</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                activeTab === 'logs'
                  ? 'bg-brutal-accent text-brutal-bg'
                  : 'hover:bg-brutal-surface-hover'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>操作日志</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'ai' && (
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <Server className="w-5 h-5 text-brutal-accent" />
                <h2 className="text-xl font-bold">AI 后端配置</h2>
              </div>

              {/* Info Banner */}
              <div className="p-4 border border-brutal-accent bg-brutal-accent/5 mb-6">
                <div className="flex items-center gap-2 text-brutal-accent mb-2">
                  <Key className="w-4 h-4" />
                  <span className="font-bold">后端代理模式</span>
                </div>
                <p className="text-sm text-brutal-muted">
                  API Key 将安全地存储在后端数据库中，前端不直接接触。支持 DeepSeek、Kimi、豆包三家 AI 服务。
                </p>
              </div>

              {/* Two-column layout: Form left, Status right */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Provider + Config Form (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                      选择提供商
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((p) => {
                        const isActive = configs[p].is_active;
                        const lastTest = lastTestedAt[p];
                        return (
                          <button
                            key={p}
                            onClick={() => setSelectedProvider(p)}
                            className={`p-3 border text-left transition-colors relative ${
                              selectedProvider === p
                                ? 'border-brutal-accent bg-brutal-accent/10'
                                : 'border-brutal-border hover:border-brutal-text'
                            }`}
                          >
                            <span
                              className={`absolute top-2 right-2 w-2 h-2 ${
                                isActive ? 'bg-brutal-success' : 'bg-brutal-muted/40'
                              }`}
                              title={isActive ? '已配置' : '未配置'}
                            />
                            <div className="font-mono font-bold pr-4">{PROVIDER_INFO[p].name}</div>
                            <div className="text-xs text-brutal-muted mt-1">
                              {isActive ? '已配置' : '未配置'}
                              {lastTest && (
                                <span className="ml-1 text-brutal-accent">
                                  {lastTest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Config Form */}
                  <div className="space-y-4 border border-brutal-border p-6 bg-brutal-surface">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">{PROVIDER_INFO[selectedProvider].name} 配置</h3>
                      {currentConfig.is_active && (
                        <span className="px-2 py-1 text-xs border border-brutal-success text-brutal-success">
                          已启用
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                        {PROVIDER_INFO[selectedProvider].noApiKey ? 'API Key (无需填写)' : 'API Key'}
                      </label>
                      {PROVIDER_INFO[selectedProvider].noApiKey ? (
                        <div className="p-3 border border-brutal-border bg-brutal-bg text-brutal-muted font-mono text-sm">
                          Ollama 本地模型无需 API Key
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={currentConfig.api_key}
                            onChange={(e) => updateCurrentConfig({ api_key: e.target.value })}
                            placeholder="sk-..."
                            className="w-full p-3 pr-12 border border-brutal-border bg-brutal-bg focus:border-brutal-accent focus:ring-1 focus:ring-brutal-accent focus:outline-none transition-colors font-mono text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-muted hover:text-brutal-text transition-colors"
                            title={showApiKey ? '隐藏' : '显示'}
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-mono text-brutal-muted uppercase">
                            Base URL
                          </label>
                          <button
                            onClick={useDefault}
                            className="text-xs text-brutal-accent hover:underline"
                          >
                            使用默认
                          </button>
                        </div>
                        <input
                          type="text"
                          value={currentConfig.base_url}
                          onChange={(e) => updateCurrentConfig({ base_url: e.target.value })}
                          placeholder={PROVIDER_INFO[selectedProvider].defaultUrl}
                          className="w-full p-3 border border-brutal-border bg-brutal-bg focus:border-brutal-accent focus:ring-1 focus:ring-brutal-accent focus:outline-none transition-colors font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                          Model
                        </label>
                        <input
                          type="text"
                          value={currentConfig.default_model}
                          onChange={(e) => updateCurrentConfig({ default_model: e.target.value })}
                          placeholder={PROVIDER_INFO[selectedProvider].defaultModel}
                          className="w-full p-3 border border-brutal-border bg-brutal-bg focus:border-brutal-accent focus:ring-1 focus:ring-brutal-accent focus:outline-none transition-colors font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleTest}
                        disabled={isLoading}
                        className="flex-1 btn-brutal h-10 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Server className="w-4 h-4" />
                        {isLoading ? '测试中...' : '测试并保存'}
                      </button>
                      <button
                        onClick={() => handleSave()}
                        disabled={isLoading}
                        className="flex-1 btn-brutal-primary h-10 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Key className="w-4 h-4" />
                        {isLoading ? '保存中...' : '仅保存'}
                      </button>
                    </div>

                    {/* Message - placed right after buttons */}
                    {message && (
                      <div
                        className={`p-3 border flex items-center gap-2 font-mono text-sm ${
                          message.type === 'success'
                            ? 'border-brutal-success text-brutal-success bg-brutal-success/5'
                            : message.type === 'info'
                              ? 'border-brutal-accent text-brutal-accent bg-brutal-accent/5'
                              : 'border-brutal-warning text-brutal-warning bg-brutal-warning/5'
                        }`}
                      >
                        {message.type === 'success' ? (
                          <Check className="w-4 h-4 flex-shrink-0" />
                        ) : message.type === 'info' ? (
                          <Server className="w-4 h-4 flex-shrink-0 animate-pulse" />
                        ) : (
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="break-all">{message.text}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Status Panel (1/3) */}
                <div className="space-y-4">
                  {/* Provider Status */}
                  <div className="border border-brutal-border p-4 bg-brutal-surface">
                    <h3 className="font-bold mb-3 text-sm">提供商状态</h3>
                    <div className="space-y-2">
                      {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((p) => {
                        const cfg = configs[p];
                        const lastTest = lastTestedAt[p];
                        return (
                          <div key={p} className="flex items-center justify-between text-sm">
                            <span className="font-mono">{PROVIDER_INFO[p].name}</span>
                            <div className="flex items-center gap-2">
                              {lastTest && (
                                <span className="text-xs text-brutal-muted">
                                  {lastTest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              <span
                                className={`w-2 h-2 ${
                                  cfg.is_active ? 'bg-brutal-success' : 'bg-brutal-muted/40'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Help */}
                  <div className="border border-brutal-border p-4 bg-brutal-surface">
                    <h3 className="font-bold mb-3 text-sm">配置说明</h3>
                    <div className="space-y-3 text-xs text-brutal-muted font-mono">
                      <p>
                        <span className="text-brutal-accent">{'>'}</span> 测试连接成功后会自动保存配置
                      </p>
                      <p>
                        <span className="text-brutal-accent">{'>'}</span> API Key 加密存储，前端不直接接触
                      </p>
                      <p>
                        <span className="text-brutal-accent">{'>'}</span> 切换提供商不会影响已保存的其他配置
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-5 h-5 text-brutal-accent" />
                <h2 className="text-xl font-bold">操作日志</h2>
              </div>

              <div className="border border-brutal-border bg-brutal-surface">
                <table className="w-full text-sm">
                  <thead className="border-b border-brutal-border bg-brutal-bg">
                    <tr>
                      <th className="text-left p-3 text-xs uppercase text-brutal-muted">时间</th>
                      <th className="text-left p-3 text-xs uppercase text-brutal-muted">操作</th>
                      <th className="text-left p-3 text-xs uppercase text-brutal-muted">对象</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-brutal-border last:border-0">
                        <td className="p-3 text-xs text-brutal-muted">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-xs border ${
                              log.action === 'create'
                                ? 'border-brutal-success text-brutal-success'
                                : log.action === 'update'
                                ? 'border-brutal-accent text-brutal-accent'
                                : 'border-brutal-warning text-brutal-warning'
                            }`}
                          >
                            {log.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-xs">
                          {log.entity_type} {log.entity_id?.slice(0, 8)}
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-brutal-muted">
                          暂无日志记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
