import { useState } from 'react';
import { X } from 'lucide-react';
import type { AIPetConfig as Config } from '../types';
import { PET_OPTIONS, PERSONALITY_OPTIONS, VERBOSITY_OPTIONS } from './AIPetConfig.constants';
import { PixelPet } from './PixelPet';
import { geometricCat, retroCat, bigPixelCat } from './PixelPet.frames';

interface AIPetConfigProps {
  config: Config | null;
  onSave: (config: Config) => void | Promise<void>;
  onClose: () => void;
}

export function AIPetConfig({ config, onSave, onClose }: AIPetConfigProps) {
  const [form, setForm] = useState<Config>({
    type: config?.type || 'cat',
    name: config?.name || PET_OPTIONS[0].name,
    personality: config?.personality || 'gentle',
    verbosity: config?.verbosity || 'moderate',
  });
  // Pixel pet preview states
  const [previewStyle, setPreviewStyle] = useState<'geometric' | 'retro' | 'bigpixel'>('retro');
  const [previewAnim, setPreviewAnim] = useState<'idle' | 'blink' | 'happy'>('idle');

  const selectedPet = PET_OPTIONS.find(p => p.id === form.type);
  const selectedPersonality = PERSONALITY_OPTIONS.find(p => p.id === form.personality);

  const previewFrames = previewStyle === 'geometric' ? geometricCat :
                        previewStyle === 'bigpixel' ? bigPixelCat : retroCat;
  const previewScale = previewStyle === 'geometric' ? 10 :
                       previewStyle === 'bigpixel' ? 6 : 8;

  const handlePixelPetClick = () => {
    setPreviewAnim('happy');
    setTimeout(() => setPreviewAnim('idle'), 1500);
  };

  const handleSave = async () => {
    await onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

            {/* 宠物预览 - 像素风 */}
            <div
              onClick={handlePixelPetClick}
              className="relative cursor-pointer select-none transition-transform hover:scale-105"
            >
              <PixelPet
                frames={previewFrames}
                scale={previewScale}
                animation={previewAnim}
              />
              {/* 性格装饰 */}
              <span className="absolute -top-2 -right-2 text-2xl">
                {selectedPersonality?.emoji}
              </span>
            </div>

            {/* 风格切换 */}
            <div className="mt-4 flex gap-2">
              {[
                { key: 'geometric' as const, label: '极简' },
                { key: 'retro' as const, label: '8-bit' },
                { key: 'bigpixel' as const, label: '大像素' },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setPreviewStyle(s.key);
                    setPreviewAnim('idle');
                  }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold border-2 transition-colors ${
                    previewStyle === s.key
                      ? 'border-brutal-accent bg-brutal-accent text-brutal-bg'
                      : 'border-brutal-text text-brutal-text bg-brutal-bg hover:bg-brutal-text hover:text-brutal-bg'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

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
              <div className="grid grid-cols-5 gap-2">
                {PET_OPTIONS.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => {
                    const currentPet = PET_OPTIONS.find(p => p.id === form.type);
                    const shouldUpdateName = !form.name || form.name === currentPet?.name;
                    setForm({
                      ...form,
                      type: pet.id as Config['type'],
                      name: shouldUpdateName ? pet.name : form.name,
                    });
                  }}
                    className={`p-2 border-2 text-center transition-all relative ${
                      form.type === pet.id
                        ? 'border-brutal-accent bg-brutal-accent/10'
                        : 'border-brutal-border hover:border-brutal-accent/50'
                    }`}
                  >
                    <span className="text-3xl block mb-1">{pet.emoji}</span>
                    <span className="text-[10px] font-mono">{pet.name}</span>
                    {form.type === pet.id && (
                      <span className="absolute top-0.5 right-0.5 text-brutal-accent text-xs">✓</span>
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
                    onClick={() => setForm({ ...form, personality: p.id as Config['personality'] })}
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
                    onClick={() => setForm({ ...form, verbosity: v.id as Config['verbosity'] })}
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
          <button onClick={onClose} className="flex-1 btn-brutal h-9 py-3">
            再看看
          </button>
          <button onClick={handleSave} className="flex-1 btn-brutal-primary h-9 py-3">
            领养 {form.name}！
          </button>
        </div>
      </div>
    </div>
  );
}

