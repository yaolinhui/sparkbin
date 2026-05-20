import { useState, useEffect, useRef } from 'react';
import { PixelPet } from './PixelPet';
import type { PixelPetFrames } from './PixelPet.frames';
import { PERSONALITY_OPTIONS } from './AIPetConfig.constants';

interface PetHabitatProps {
  petFrames: PixelPetFrames;
  petName: string;
  personality?: string;
  dialogue: string;
  onPetClick: () => void;
  onPetDoubleClick: () => void;
  isBouncing?: boolean;
}

export function PetHabitat({
  petFrames,
  petName,
  personality,
  dialogue,
  onPetClick,
  onPetDoubleClick,
  isBouncing = false,
}: PetHabitatProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevDialogueRef = useRef(dialogue);

  // 打字机效果
  useEffect(() => {
    // 只在 dialogue 真正有变化时触发
    if (dialogue === prevDialogueRef.current && displayedText === dialogue) {
      return;
    }
    prevDialogueRef.current = dialogue;

    if (!dialogue) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedText('');

    let index = 0;
    if (typingRef.current) {
      clearInterval(typingRef.current);
    }

    typingRef.current = setInterval(() => {
      index += 1;
      if (index <= dialogue.length) {
        setDisplayedText(dialogue.slice(0, index));
      } else {
        setIsTyping(false);
        if (typingRef.current) {
          clearInterval(typingRef.current);
          typingRef.current = null;
        }
      }
    }, 30);

    return () => {
      if (typingRef.current) {
        clearInterval(typingRef.current);
        typingRef.current = null;
      }
    };
    // displayedText 仅被写入，不依赖其当前值；加入依赖会导致无限重渲染
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogue]);

  const personalityOption = PERSONALITY_OPTIONS.find((p) => p.id === personality);
  const PersonalityIcon = personalityOption?.icon;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div
        className="relative w-[160px] overflow-hidden transition-colors duration-200 hover:border-brutal-accent border-2 border-brutal-border"
        style={{
          boxShadow: '4px 4px 0 var(--brutal-text)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Glassmorphism 背景层 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: 'var(--brutal-bg)',
            opacity: 0.18,
          }}
        />

        {/* 天空区 */}
        <div className="relative h-[72px] overflow-hidden">
          {/* 像素光点 / 星星 */}
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.5,
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(255,255,255,0.35) 1px, transparent 1px),
                radial-gradient(circle at 70% 20%, rgba(255,255,255,0.25) 1px, transparent 1px),
                radial-gradient(circle at 40% 55%, rgba(255,255,255,0.3) 1px, transparent 1px),
                radial-gradient(circle at 85% 45%, rgba(255,255,255,0.2) 1px, transparent 1px),
                radial-gradient(circle at 10% 70%, rgba(255,255,255,0.25) 1px, transparent 1px),
                radial-gradient(circle at 55% 75%, rgba(255,255,255,0.15) 1px, transparent 1px)
              `,
            }}
          />

          {/* 宠物 */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <div className={isBouncing ? 'animate-pet-bounce' : 'animate-pet-breathe'}>
              <PixelPet frames={petFrames} scale={2} animation="idle" />
            </div>
          </div>

          {/* 性格装饰 */}
          {PersonalityIcon && (
            <span
              className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-brutal-bg border border-brutal-border"
              style={{ boxShadow: '1px 1px 0 var(--brutal-text)' }}
            >
              <PersonalityIcon className="w-2.5 h-2.5" style={{ color: personalityOption.color }} />
            </span>
          )}
        </div>

        {/* 地面 */}
        <div
          className="h-[16px] relative"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent, transparent 3px, var(--brutal-border) 3px, var(--brutal-border) 4px)',
            opacity: 0.3,
          }}
        />

        {/* 台词区 */}
        <div className="relative">
          {/* 半透明背景 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: 'var(--brutal-surface)',
              opacity: 0.85,
            }}
          />
          <div
            className="relative px-2.5 py-2 min-h-[40px] flex items-center"
            style={{ borderTop: '1px solid var(--brutal-border)' }}
          >
            <p
              className="text-[10px] font-mono leading-relaxed w-full break-words"
              style={{ color: 'var(--brutal-text)' }}
            >
              {displayedText}
              {isTyping && (
                <span className="inline-block w-[6px] h-[10px] ml-[1px] align-middle" style={{ backgroundColor: 'var(--brutal-accent)' }} />
              )}
            </p>
          </div>
        </div>

        {/* 点击区域 */}
        <button
          type="button"
          onClick={onPetClick}
          onDoubleClick={onPetDoubleClick}
          className="absolute inset-0 cursor-pointer bg-transparent"
          title={`${petName} - 单击互动 / 双击配置`}
          aria-label={`${petName} - 单击互动 / 双击配置`}
        />
      </div>
    </div>
  );
}
