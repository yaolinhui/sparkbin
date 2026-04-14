import { useState, useEffect, useRef } from 'react';

interface SnakeLoaderProps {
  isLoading: boolean;
  text?: string;
}

const LOADING_LOGS = [
  '> Initializing neural context...',
  '> Parsing user intent...',
  '> Extracting key dimensions...',
  '> Cross-referencing patterns...',
  '> Synthesizing response...',
  '> Finalizing output...',
];

export function SnakeLoader({ isLoading, text = 'AI 正在深度理解...' }: SnakeLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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
      // 3秒绕边框一圈
      const newProgress = (elapsed / 3000) % 1;
      setProgress(newProgress);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLoading]);

  // 终端日志逐行输出
  useEffect(() => {
    if (!isLoading) {
      setLogs([]);
      return;
    }

    setLogs([LOADING_LOGS[0]]);
    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index < LOADING_LOGS.length) {
        setLogs(prev => [...prev.slice(-3), LOADING_LOGS[index]]);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  const { width, height } = size;
  const padding = 3;
  const rectW = Math.max(0, width - padding * 2);
  const rectH = Math.max(0, height - padding * 2);
  const perimeter = rectW * 2 + rectH * 2;

  // 主蛇身：周长的 22%，连续光带
  const headLen = perimeter > 0 ? perimeter * 0.22 : 0;
  const headGap = perimeter > 0 ? perimeter * 0.78 : 0;
  const headOffset = perimeter > 0 ? -progress * perimeter : 0;

  // 拖尾光晕：周长的 45%，更宽更淡
  const tailLen = perimeter > 0 ? perimeter * 0.45 : 0;
  const tailGap = perimeter > 0 ? perimeter * 0.55 : 0;
  const tailOffset = perimeter > 0 ? -progress * perimeter : 0;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-50 bg-brutal-bg/70 backdrop-blur-[2px] flex items-center justify-center"
    >
      {/* SVG 边框贪吃蛇 */}
      {width > 0 && height > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={height}
        >
          <defs>
            <filter id="snake-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
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
              <stop offset="50%" stopColor="#fff" />
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
            opacity={0.4}
          />

          {/* 拖尾光晕层：更宽、更淡 */}
          <rect
            x={padding}
            y={padding}
            width={rectW}
            height={rectH}
            fill="none"
            stroke="var(--brutal-accent)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${tailLen} ${tailGap}`}
            strokeDashoffset={tailOffset}
            opacity={0.25}
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
            strokeWidth={5}
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
      <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-brutal-accent animate-pulse" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-brutal-accent animate-pulse" style={{ animationDelay: '200ms' }} />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-brutal-accent animate-pulse" style={{ animationDelay: '400ms' }} />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-brutal-accent animate-pulse" style={{ animationDelay: '600ms' }} />

      {/* 中心终端窗口 */}
      <div className="relative border-2 border-brutal-border bg-brutal-surface/95 shadow-[8px_8px_0px_rgba(0,0,0,0.3)] min-w-[300px] max-w-[90%]">
        {/* 终端标题栏 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-brutal-border bg-brutal-bg">
          <span className="text-[10px] font-mono text-brutal-muted uppercase tracking-wider">
            // SYSTEM.LOADING
          </span>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-brutal-border" />
            <div className="w-2 h-2 bg-brutal-border" />
            <div className="w-2 h-2 bg-brutal-accent animate-pulse" />
          </div>
        </div>

        {/* 终端内容 */}
        <div className="p-5 space-y-4">
          {/* 主标题 */}
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-brutal-accent border-t-transparent animate-spin" />
            <span className="text-sm font-mono font-bold text-brutal-text">{text}</span>
          </div>

          {/* 进度条 */}
          <div className="w-full h-2 bg-brutal-border/30 border border-brutal-border">
            <div
              className="h-full bg-brutal-accent animate-pulse"
              style={{
                width: `${Math.min(95, (logs.length / LOADING_LOGS.length) * 100)}%`,
                transition: 'width 0.3s ease-out',
              }}
            />
          </div>

          {/* 终端日志 */}
          <div className="bg-brutal-bg border border-brutal-border p-3 min-h-[100px]">
            <div className="space-y-1 font-mono text-xs">
              {logs.map((log, i) => (
                <div
                  key={`${i}-${log}`}
                  className={`${
                    i === logs.length - 1 ? 'text-brutal-accent' : 'text-brutal-muted'
                  }`}
                >
                  {log}
                  {i === logs.length - 1 && (
                    <span className="animate-blink ml-0.5">_</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SnakeLoader;
