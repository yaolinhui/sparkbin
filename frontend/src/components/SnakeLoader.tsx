import { useState, useEffect } from 'react';

interface SnakeLoaderProps {
  isLoading: boolean;
  text?: string;
}

export function SnakeLoader({ isLoading, text = 'AI 正在思考...' }: SnakeLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    // 模拟进度增加
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  // 计算贪吃蛇位置 - 沿着边框移动
  // 边框路径: 左上 -> 右上 -> 右下 -> 左下 -> 回到左上
  const getSnakePosition = () => {
    const p = progress % 100;
    // 每边占 25%
    if (p < 25) {
      // 上边: 从左到右
      return {
        left: `${(p / 25) * 100}%`,
        top: '-2px',
        transform: 'translateX(-50%)',
      };
    } else if (p < 50) {
      // 右边: 从上到下
      return {
        right: '-2px',
        top: `${((p - 25) / 25) * 100}%`,
        transform: 'translateY(-50%)',
      };
    } else if (p < 75) {
      // 下边: 从右到左
      return {
        right: `${((p - 50) / 25) * 100}%`,
        bottom: '-2px',
        transform: 'translateX(50%)',
      };
    } else {
      // 左边: 从下到上
      return {
        left: '-2px',
        bottom: `${((p - 75) / 25) * 100}%`,
        transform: 'translateY(50%)',
      };
    }
  };

  // 生成拖尾效果 - 多个小点
  const getTrailPositions = () => {
    const trail: Array<{
      left?: string;
      right?: string;
      top?: string;
      bottom?: string;
      transform: string;
      opacity: number;
      scale: number;
    }> = [];
    const trailLength = 8; // 拖尾长度

    for (let i = 0; i < trailLength; i++) {
      const trailProgress = (progress - i * 3 + 100) % 100;
      const p = trailProgress;

      let pos: {
        left?: string;
        right?: string;
        top?: string;
        bottom?: string;
        transform: string;
      };

      if (p < 25) {
        pos = {
          left: `${(p / 25) * 100}%`,
          top: '-2px',
          transform: 'translateX(-50%)',
        };
      } else if (p < 50) {
        pos = {
          right: '-2px',
          top: `${((p - 25) / 25) * 100}%`,
          transform: 'translateY(-50%)',
        };
      } else if (p < 75) {
        pos = {
          right: `${((p - 50) / 25) * 100}%`,
          bottom: '-2px',
          transform: 'translateX(50%)',
        };
      } else {
        pos = {
          left: '-2px',
          bottom: `${((p - 75) / 25) * 100}%`,
          transform: 'translateY(50%)',
        };
      }

      trail.push({
        ...pos,
        opacity: 1 - i * 0.12,
        scale: 1 - i * 0.08,
      });
    }

    return trail;
  };

  const snakePos = getSnakePosition();
  const trailPositions = getTrailPositions();

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* 贪吃蛇头部 */}
      <div
        className="absolute w-3 h-3 bg-brutal-accent rounded-sm"
        style={{
          ...snakePos,
          transition: 'none',
          boxShadow: '0 0 8px var(--brutal-accent)',
        }}
      />

      {/* 贪吃蛇拖尾 */}
      {trailPositions.map((pos, index) => (
        <div
          key={index}
          className="absolute bg-brutal-accent rounded-sm"
          style={{
            width: `${8 - index}px`,
            height: `${8 - index}px`,
            ...pos,
            opacity: pos.opacity,
            transform: `${pos.transform} scale(${pos.scale})`,
            transition: 'none',
          }}
        />
      ))}

      {/* 角落的小方块装饰 */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-brutal-accent animate-pulse" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-brutal-accent animate-pulse delay-75" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-brutal-accent animate-pulse delay-150" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-brutal-accent animate-pulse delay-200" />

      {/* 加载文字 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-brutal-surface/90 border border-brutal-border px-4 py-2 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-brutal-accent border-t-transparent animate-spin" />
          <span className="text-sm font-mono">{text}</span>
        </div>
      </div>
    </div>
  );
}

export default SnakeLoader;
