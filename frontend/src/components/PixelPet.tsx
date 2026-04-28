import { useState, useEffect, useRef, useMemo } from 'react';
import type { PixelPetFrames } from './PixelPet.frames';

interface PixelPetProps {
  frames: PixelPetFrames;
  scale?: number; // pixel size in px, default 8
  animation?: 'idle' | 'blink' | 'happy';
  onClick?: () => void;
  className?: string;
}

export function PixelPet({ frames, scale = 8, animation = 'idle', onClick, className = '' }: PixelPetProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [currentAnim, setCurrentAnim] = useState(animation);
  const animRef = useRef(animation);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // track external animation prop changes
  useEffect(() => {
    if (animation !== animRef.current) {
      animRef.current = animation;
      setCurrentAnim(animation);
      setFrameIndex(0);
    }
  }, [animation]);

  const frameSet = useMemo(() => {
    switch (currentAnim) {
      case 'blink':
        return frames.blink;
      case 'happy':
        return frames.happy;
      default:
        return frames.idle;
    }
  }, [currentAnim, frames]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setFrameIndex(0);

    timerRef.current = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= frameSet.length) {
          // one-shot animations return to idle after completing
          if (currentAnim === 'blink' || currentAnim === 'happy') {
            setCurrentAnim('idle');
            animRef.current = 'idle';
            return 0;
          }
          return 0;
        }
        return next;
      });
    }, 500);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [frameSet, currentAnim]);

  const frame = frameSet[frameIndex] ?? frameSet[0];
  if (!frame) return null;

  const { width, height, pixels, palette } = frame;

  return (
    <div
      className={`inline-block leading-none select-none ${className}`}
      style={{ width: width * scale, height: height * scale }}
      onClick={onClick}
    >
      <svg
        width={width * scale}
        height={height * scale}
        viewBox={`0 0 ${width} ${height}`}
        shapeRendering="crispEdges"
        className={onClick ? 'cursor-pointer' : ''}
      >
        {pixels.map((row, y) =>
          row.split('').map((char, x) => {
            const color = palette[char];
            if (!color || color === 'transparent') return null;
            return (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill={color}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
