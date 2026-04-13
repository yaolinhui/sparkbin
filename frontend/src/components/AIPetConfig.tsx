import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { AIPetConfig as Config } from '../types';

interface AIPetConfigProps {
  config: Config | null;
  onSave: (config: Config) => void;
  onClose: () => void;
}

// 宠物配置 - 使用大 Emoji + 个性台词
const PET_OPTIONS = [
  {
    id: 'cat',
    name: '喵仔',
    emoji: '🐱',
    color: '#fbbf24',
    greeting: '喵～要抱抱！',
    traits: '爱撒娇、爱睡觉、治愈系'
  },
  {
    id: 'robot',
    name: '铁蛋',
    emoji: '🤖',
    color: '#60a5fa',
    greeting: '哔哔！铁蛋为你服务！',
    traits: '靠谱、幽默、科技感'
  },
  {
    id: 'panda',
    name: '滚滚',
    emoji: '🐼',
    color: '#a3a3a3',
    greeting: '嗯嗯～竹子真好吃～',
    traits: '佛系、呆萌、慢节奏'
  },
  {
    id: 'fox',
    name: '阿狸',
    emoji: '🦊',
    color: '#f97316',
    greeting: '嘿嘿～今天也很聪明哦！',
    traits: '机灵、调皮、小聪明'
  },
];

const PERSONALITY_OPTIONS = [
  { id: 'gentle', name: '温柔', desc: '鼓励型，语气柔和', emoji: '🌸', color: '#f472b6' },
  { id: 'rational', name: '理性', desc: '高效分析，逻辑清晰', emoji: '📊', color: '#60a5fa' },
  { id: 'zen', name: '佛系', desc: '慢节奏，不着急', emoji: '🧘', color: '#a78bfa' },
  { id: 'sharp', name: '犀利', desc: '直接挑战，指出问题', emoji: '⚡', color: '#fbbf24' },
];

const VERBOSITY_OPTIONS = [
  { id: 'quiet', name: '安静', desc: '只在必要时发言', emoji: '🤫' },
  { id: 'moderate', name: '适中', desc: '适度主动建议', emoji: '💬' },
  { id: 'chatty', name: '话痨', desc: '经常主动提示', emoji: '🗣️' },
];

// 宠物台词
const PET_DIALOGUES: Record<string, string[]> = {
  cat: ['喵～', '蹭蹭～', '呼噜呼噜...', '要小鱼干嘛～'],
  robot: ['正在思考...', '铁蛋明白！', '数据分析中...', '哔哔！'],
  panda: ['嗯嗯～', '竹子真香～', '困困...', '抱抱～'],
  fox: ['嘿嘿～', '我聪明吧！', '今天也超棒！', '摸摸头～'],
};

export function AIPetConfig({ config, onSave, onClose }: AIPetConfigProps) {
  const [form, setForm] = useState<Config>({
    type: config?.type || 'cat',
    name: config?.name || PET_OPTIONS[0].name,
    personality: config?.personality || 'gentle',
    verbosity: config?.verbosity || 'moderate',
  });
  const [dialogue, setDialogue] = useState('');
  const [isBouncing, setIsBouncing] = useState(false);

  const selectedPet = PET_OPTIONS.find(p => p.id === form.type);
  const selectedPersonality = PERSONALITY_OPTIONS.find(p => p.id === form.personality);

  // 切换宠物时更新默认名字和台词
  useEffect(() => {
    const pet = PET_OPTIONS.find(p => p.id === form.type);
    if (pet) {
      setForm(prev => ({ ...prev, name: pet.name }));
      setDialogue(pet.greeting);
    }
  }, [form.type]);

  // 点击宠物互动
  const handlePetClick = () => {
    setIsBouncing(true);
    const dialogues = PET_DIALOGUES[form.type] || ['嗨！'];
    const random = dialogues[Math.floor(Math.random() * dialogues.length)];
    setDialogue(random);
    setTimeout(() => setIsBouncing(false), 500);
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/95 z-50 flex items-center justify-center p-4">
      <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-brutal-muted font-mono">//</span>
            <span className="text-sm font-mono font-bold">领养你的 AI 小伙伴</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row">
          {/* Left: 宠物展示舞台 */}
          <div className="md:w-2/5 border-b md:border-b-0 md:border-r border-brutal-border bg-gradient-to-b from-brutal-surface to-brutal-bg p-8 flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden">
            {/* 背景装饰 */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 text-4xl">✨</div>
              <div className="absolute top-20 right-10 text-3xl">⭐</div>
              <div className="absolute bottom-20 left-5 text-2xl">💫</div>
              <div className="absolute bottom-10 right-20 text-3xl">✨</div>
            </div>

            {/* 宠物 Emoji - 大且可点击互动 */}
            <div
              onClick={handlePetClick}
              className={`relative cursor-pointer select-none transition-transform ${
                isBouncing ? 'animate-bounce scale-110' : 'hover:scale-105'
              }`}
              style={{ fontSize: '120px', lineHeight: 1 }}
            >
              {selectedPet?.emoji}
              {/* 表情装饰 */}
              <span className="absolute -top-2 -right-2 text-3xl">
                {selectedPersonality?.emoji}
              </span>
            </div>

            {/* 对话气泡 */}
            {dialogue && (
              <div className="mt-6 relative">
                <div
                  className="px-4 py-3 rounded-2xl text-sm font-mono text-center max-w-[200px]"
                  style={{
                    backgroundColor: selectedPet?.color || '#374151',
                    color: '#fff',
                    border: '2px solid #000',
                    boxShadow: '4px 4px 0px #000',
                  }}
                >
                  {dialogue}
                </div>
                {/* 气泡小尾巴 */}
                <div
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: `10px solid ${selectedPet?.color || '#374151'}`,
                  }}
                />
              </div>
            )}

            <p className="mt-6 text-xs text-brutal-muted font-mono text-center">
              点击宠物和它互动！
            </p>

            {/* 名字输入 */}
            <div className="mt-6 text-center w-full">
              <label className="text-xs text-brutal-muted font-mono block mb-2">给它起个名字</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="text-xl font-mono font-bold text-center bg-brutal-bg border-2 border-brutal-border focus:border-brutal-accent outline-none px-4 py-2 w-full max-w-[180px]"
                style={{ boxShadow: '3px 3px 0px var(--brutal-border)' }}
              />
            </div>

            {/* 宠物特点 */}
            <div className="mt-4 text-center">
              <span className="text-xs text-brutal-muted font-mono">
                特点: {selectedPet?.traits}
              </span>
            </div>
          </div>

          {/* Right: 属性选择 */}
          <div className="md:w-3/5 p-6 space-y-6">
            {/* Pet Selection */}
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-3 uppercase">选择小伙伴</label>
              <div className="grid grid-cols-4 gap-2">
                {PET_OPTIONS.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => setForm({ ...form, type: pet.id as any })}
                    className={`p-3 border-2 text-center transition-all relative ${
                      form.type === pet.id
                        ? 'border-brutal-accent bg-brutal-accent/10'
                        : 'border-brutal-border hover:border-brutal-accent/50'
                    }`}
                  >
                    <span className="text-4xl block mb-1">{pet.emoji}</span>
                    <span className="text-xs font-mono">{pet.name}</span>
                    {form.type === pet.id && (
                      <span className="absolute top-1 right-1 text-brutal-accent">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Personality Selection */}
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-3 uppercase">性格风格</label>
              <div className="grid grid-cols-2 gap-2">
                {PERSONALITY_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setForm({ ...form, personality: p.id as any })}
                    className={`p-3 border-2 text-left transition-all flex items-center gap-3 ${
                      form.personality === p.id
                        ? 'border-brutal-accent bg-brutal-accent/10'
                        : 'border-brutal-border hover:border-brutal-accent/50'
                    }`}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <span className="text-sm font-mono font-bold block">{p.name}</span>
                      <span className="text-xs text-brutal-muted">{p.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Verbosity Selection */}
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-3 uppercase">话痨程度</label>
              <div className="grid grid-cols-3 gap-2">
                {VERBOSITY_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setForm({ ...form, verbosity: v.id as any })}
                    className={`p-3 border-2 text-center transition-all ${
                      form.verbosity === v.id
                        ? 'border-brutal-accent bg-brutal-accent/10'
                        : 'border-brutal-border hover:border-brutal-accent/50'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{v.emoji}</span>
                    <span className="text-xs font-mono font-bold block">{v.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-brutal-border bg-brutal-bg">
          <button onClick={onClose} className="flex-1 btn-brutal py-3">
            再看看
          </button>
          <button onClick={handleSave} className="flex-1 btn-brutal-primary py-3">
            领养 {form.name}！
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIPetConfig;
