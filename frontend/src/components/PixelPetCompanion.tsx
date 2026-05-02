import { useState, useEffect, useRef, useCallback } from 'react';
import { PixelPet } from './PixelPet';
import type { PixelPetFrames } from './PixelPet.frames';
import { PERSONALITY_OPTIONS } from './AIPetConfig.constants';

interface PixelPetCompanionProps {
  petFrames: PixelPetFrames;
  petName: string;
  personality?: string;
  dialogue: string;
  onPetClick: () => void;
  onPetDoubleClick: () => void;
  isBouncing?: boolean;
}

const TYPING_SPEED_MS = 30;
const DIALOGUE_DISPLAY_MS = 8000;
const FADE_DURATION_MS = 500;

export function PixelPetCompanion({
  petFrames,
  petName,
  personality,
  dialogue,
  onPetClick,
  onPetDoubleClick,
  isBouncing = false,
}: PixelPetCompanionProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [opacity, setOpacity] = useState(1);

  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDialogueRef = useRef(dialogue);

  const clearAllTimers = useCallback(() => {
    if (typingRef.current) {
      clearInterval(typingRef.current);
      typingRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  // 打字机 + 自动淡出 状态机
  useEffect(() => {
    // dialogue 为空：立即隐藏
    if (!dialogue) {
      clearAllTimers();
      setIsVisible(false);
      setOpacity(0);
      setDisplayedText('');
      setIsTyping(false);
      prevDialogueRef.current = dialogue;
      return;
    }

    // dialogue 未变化且已完整显示：不做任何事
    if (dialogue === prevDialogueRef.current && displayedText === dialogue && !isTyping) {
      return;
    }

    prevDialogueRef.current = dialogue;

    // 阶段 1：重置并开始打字
    clearAllTimers();
    setIsVisible(true);
    setOpacity(1);
    setDisplayedText('');
    setIsTyping(true);

    let index = 0;
    typingRef.current = setInterval(() => {
      index += 1;
      if (index <= dialogue.length) {
        setDisplayedText(dialogue.slice(0, index));
      } else {
        // 打字完成
        setIsTyping(false);
        if (typingRef.current) {
          clearInterval(typingRef.current);
          typingRef.current = null;
        }

        // 阶段 3：启动驻留倒计时
        hideTimerRef.current = setTimeout(() => {
          // 阶段 4：开始淡出
          setOpacity(0);

          // 淡出完成后从 DOM 意义上去除
          fadeTimerRef.current = setTimeout(() => {
            setIsVisible(false);
          }, FADE_DURATION_MS);
        }, DIALOGUE_DISPLAY_MS);
      }
    }, TYPING_SPEED_MS);

    return () => {
      clearAllTimers();
    };
  }, [dialogue, clearAllTimers]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const personalityOption = PERSONALITY_OPTIONS.find((p) => p.id === personality);
  const PersonalityIcon = personalityOption?.icon;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center group">
      {/* 台词气泡 */}
      {isVisible && (
        <div
          className="relative self-end mb-2 max-w-[220px] min-w-[120px] pointer-events-none transition-opacity duration-500"
          style={{ opacity }}
        >
          <div className="border border-brutal-border bg-brutal-surface/90 px-3 py-2">
            <p className="text-[10px] font-mono leading-relaxed break-words" style={{ color: 'var(--brutal-text)' }}>
              {displayedText}
              {isTyping && (
                <span
                  className="inline-block w-[3px] h-[10px] ml-[2px] align-middle animate-blink"
                  style={{ backgroundColor: 'var(--brutal-accent)' }}
                />
              )}
            </p>
          </div>
          {/* 对话框尾巴 */}
          <div
            className="absolute -bottom-[5px] right-6 w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid var(--brutal-border)',
            }}
          />
        </div>
      )}

      {/* 宠物主体 */}
      <div
        className={`relative transition-transform duration-200 group-hover:-translate-y-0.5 ${
          isBouncing ? 'animate-pet-bounce' : 'animate-pet-breathe'
        }`}
      >
        <PixelPet frames={petFrames} scale={2.5} animation="idle" />

        {/* 性格装饰角标 */}
        {PersonalityIcon && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-brutal-bg border border-brutal-border"
            style={{ boxShadow: '1px 1px 0 var(--brutal-text)' }}
          >
            <PersonalityIcon className="w-2.5 h-2.5" style={{ color: personalityOption.color }} />
          </span>
        )}
      </div>

      {/* 草地平台 */}
      <div className="relative w-[100px] h-3 mt-1">
        {/* 地平线 */}
        <div className="absolute bottom-0 w-full h-px" style={{ backgroundColor: 'var(--brutal-border)' }} />
        {/* 像素草 */}
        <div
          className="absolute bottom-px left-[18px] w-[2px]"
          style={{ height: '3px', backgroundColor: 'var(--brutal-success)' }}
        />
        <div
          className="absolute bottom-px left-[44px] w-[2px]"
          style={{ height: '5px', backgroundColor: 'var(--brutal-success)' }}
        />
        <div
          className="absolute bottom-px left-[72px] w-[2px]"
          style={{ height: '3px', backgroundColor: 'var(--brutal-success)' }}
        />
      </div>

      {/* 点击区域（覆盖宠物+平台） */}
      <button
        type="button"
        onClick={onPetClick}
        onDoubleClick={onPetDoubleClick}
        className="absolute inset-0 cursor-pointer bg-transparent"
        title={`${petName} - 单击互动 / 双击配置`}
        aria-label={`${petName} - 单击互动 / 双击配置`}
      />
    </div>
  );
}
