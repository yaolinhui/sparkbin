import { useState } from 'react';
import { X, Cat, Bot, Smile, Frown, Zap } from 'lucide-react';
import type { AIPetConfig as Config } from '../types';

interface AIPetConfigProps {
  config: Config | null;
  onSave: (config: Config) => void;
  onClose: () => void;
}

const PET_OPTIONS = [
  { id: 'cat', name: '猫咪', icon: Cat, ascii: '/\\_/\\\n( o.o )\n > ^ <' },
  { id: 'robot', name: '机器人', icon: Bot, ascii: '[o_o]\n/| |\\\n d b' },
  { id: 'panda', name: '熊猫', icon: Smile, ascii: '(\\/)\n(•ㅅ•)\n/  っ' },
  { id: 'fox', name: '狐狸', icon: Zap, ascii: ' /^\\\n( ◠‿◠ )\n/    \\' },
];

const PERSONALITY_OPTIONS = [
  { id: 'gentle', name: '温柔', desc: '鼓励型，语气柔和' },
  { id: 'rational', name: '理性', desc: '高效分析，逻辑清晰' },
  { id: 'zen', name: '佛系', desc: '慢节奏，不着急' },
  { id: 'sharp', name: '犀利', desc: '直接挑战，指出问题' },
];

export function AIPetConfig({ config, onSave, onClose }: AIPetConfigProps) {
  const [form, setForm] = useState<Config>({
    type: config?.type || 'cat',
    name: config?.name || 'AI助手',
    personality: config?.personality || 'gentle',
    verbosity: config?.verbosity || 'moderate',
  });

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/95 z-50 flex items-center justify-center p-4">
      <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-brutal-muted font-mono">//</span>
            <span className="text-sm font-mono font-bold">AI宠物配置</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Pet Selection */}
          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-3 uppercase">选择宠物形象</label>
            <div className="grid grid-cols-4 gap-3">
              {PET_OPTIONS.map((pet) => {
                const Icon = pet.icon;
                return (
                  <button
                    key={pet.id}
                    onClick={() => setForm({ ...form, type: pet.id as any })}
                    className={`p-4 border-2 text-center transition-all ${
                      form.type === pet.id
                        ? 'border-brutal-accent bg-brutal-accent/10'
                        : 'border-brutal-border hover:border-brutal-accent/50'
                    }`}
                  >
                    <Icon className="w-8 h-8 mx-auto mb-2 text-brutal-accent" />
                    <span className="text-xs font-mono">{pet.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pet Name */}
          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">宠物名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
              placeholder="给你的AI助手起个名字"
            />
          </div>

          {/* Personality Selection */}
          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-3 uppercase">性格风格</label>
            <div className="grid grid-cols-2 gap-3">
              {PERSONALITY_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setForm({ ...form, personality: p.id as any })}
                  className={`p-3 border-2 text-left transition-all ${
                    form.personality === p.id
                      ? 'border-brutal-accent bg-brutal-accent/10'
                      : 'border-brutal-border hover:border-brutal-accent/50'
                  }`}
                >
                  <span className="text-sm font-mono font-bold">{p.name}</span>
                  <p className="text-xs text-brutal-muted mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Verbosity Slider */}
          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-3 uppercase">活跃程度</label>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono">安静</span>
              <input
                type="range"
                min="0"
                max="2"
                value={form.verbosity === 'quiet' ? 0 : form.verbosity === 'moderate' ? 1 : 2}
                onChange={(e) => {
                  const values = ['quiet', 'moderate', 'chatty'] as const;
                  setForm({ ...form, verbosity: values[parseInt(e.target.value)] });
                }}
                className="flex-1 h-2 bg-brutal-border appearance-none cursor-pointer"
              />
              <span className="text-xs font-mono">话痨</span>
            </div>
            <p className="text-xs text-brutal-muted mt-2">
              当前: {form.verbosity === 'quiet' ? '安静 - 只在必要时发言' : form.verbosity === 'moderate' ? '适中 - 适度主动建议' : '话痨 - 经常主动提示'}
            </p>
          </div>

          {/* Preview */}
          <div className="border border-brutal-border bg-brutal-bg p-4">
            <label className="block text-xs font-mono text-brutal-muted mb-3 uppercase">预览</label>
            <div className="flex items-start gap-4">
              <pre className="text-xs text-brutal-accent font-mono leading-none">
                {PET_OPTIONS.find(p => p.id === form.type)?.ascii}
              </pre>
              <div>
                <p className="text-sm font-mono font-bold">{form.name}</p>
                <p className="text-xs text-brutal-muted">
                  性格: {PERSONALITY_OPTIONS.find(p => p.id === form.personality)?.name} |
                  活跃度: {form.verbosity === 'quiet' ? '安静' : form.verbosity === 'moderate' ? '适中' : '话痨'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-brutal-border bg-brutal-bg">
          <button onClick={onClose} className="flex-1 btn-brutal py-3">
            取消
          </button>
          <button onClick={handleSave} className="flex-1 btn-brutal-primary py-3">
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIPetConfig;
