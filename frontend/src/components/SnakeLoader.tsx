import { useState, useEffect, useRef } from 'react';

interface SnakeLoaderProps {
  isLoading: boolean;
}

export function SnakeLoader({ isLoading }: SnakeLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [progress, setProgress] = useState(0);

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current || !isLoading) return;

    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [isLoading]);

  // 蛇身进度动画 - 沿着边框循环爬行
  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      // 2.5秒绕边框一圈
      const newProgress = (elapsed / 2500) % 1;
      setProgress(newProgress);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLoading]);

  if (!isLoading) return null;

  const { width, height } = size;
  const padding = 2;
  const rectW = Math.max(0, width - padding * 2);
  const rectH = Math.max(0, height - padding * 2);
  const perimeter = rectW * 2 + rectH * 2;

  // 主蛇身：周长的 18%，连续光带
  const headLen = perimeter > 0 ? perimeter * 0.18 : 0;
  const headGap = perimeter > 0 ? perimeter * 0.82 : 0;
  const headOffset = perimeter > 0 ? -progress * perimeter : 0;

  // 拖尾光晕：周长的 40%，更宽更淡
  const tailLen = perimeter > 0 ? perimeter * 0.4 : 0;
  const tailGap = perimeter > 0 ? perimeter * 0.6 : 0;
  const tailOffset = perimeter > 0 ? -progress * perimeter : 0;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-40 pointer-events-none"
      aria-hidden="true"
    >
      {/* 轻微背景遮罩 */}
      <div className="absolute inset-0 bg-brutal-bg/10" />

      {width > 0 && height > 0 && (
        <svg
          className="absolute inset-0"
          width={width}
          height={height}
        >
          <defs>
            <filter id="snake-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="var(--brutal-accent)" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="snake-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--brutal-accent)" />
              <stop offset="50%" stopColor="var(--brutal-bg)" />
              <stop offset="100%" stopColor="var(--brutal-accent)" />
            </linearGradient>
          </defs>

          {/* 边框跑道 - 淡淡的引导线 */}
          <rect
            x={padding}
            y={padding}
            width={rectW}
            height={rectH}
            fill="none"
            stroke="var(--brutal-border)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.3}
          />

          {/* 拖尾光晕层：更宽、更淡 */}
          <rect
            x={padding}
            y={padding}
            width={rectW}
            height={rectH}
            fill="none"
            stroke="var(--brutal-accent)"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${tailLen} ${tailGap}`}
            strokeDashoffset={tailOffset}
            opacity={0.2}
            filter="url(#snake-glow)"
            style={{ transition: 'none' }}
          />

          {/* 贪吃蛇本体：发光的渐变主蛇身 */}
          <rect
            x={padding}
            y={padding}
            width={rectW}
            height={rectH}
            fill="none"
            stroke="url(#snake-gradient)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${headLen} ${headGap}`}
            strokeDashoffset={headOffset}
            filter="url(#snake-glow)"
            style={{ transition: 'none' }}
          />
        </svg>
      )}

      {/* 四角脉冲扫描标记 */}
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-brutal-accent animate-pulse" />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-brutal-accent animate-pulse" style={{ animationDelay: '200ms' }} />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-brutal-accent animate-pulse" style={{ animationDelay: '400ms' }} />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-brutal-accent animate-pulse" style={{ animationDelay: '600ms' }} />
    </div>
  );
}

export default SnakeLoader;
