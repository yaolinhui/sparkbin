import { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useI18n } from '../i18n/hooks';

interface SliderCaptchaProps {
  token: string;
  background: string;
  slider: string;
  sliderWidth: number;
  sliderHeight: number;
  sliderY: number;
  onVerify: (token: string, x: number) => void;
  onRefresh: () => void;
}

export function SliderCaptcha({
  token,
  background,
  slider,
  sliderWidth,
  sliderHeight,
  sliderY,
  onVerify,
  onRefresh,
}: SliderCaptchaProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sliderPercent, setSliderPercent] = useState(0);
  const [containerWidth, setContainerWidth] = useState(300);
  const startXRef = useRef(0);
  const startPercentRef = useRef(0);

  // 图片设计尺寸（与后端一致）
  const IMAGE_WIDTH = 300;
  const IMAGE_HEIGHT = 150;

  // 监听容器宽度变化
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.getBoundingClientRect().width);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 滑块在设计图中的最大可移动百分比
  const maxPercent = Math.max(0, (IMAGE_WIDTH - sliderWidth) / IMAGE_WIDTH) * 100;

  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
    startPercentRef.current = sliderPercent;
  }, [sliderPercent]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    const deltaPx = clientX - startXRef.current;
    const deltaPercent = (deltaPx / containerWidth) * 100;
    let newPercent = startPercentRef.current + deltaPercent;
    newPercent = Math.max(0, Math.min(newPercent, maxPercent));
    setSliderPercent(newPercent);
  }, [isDragging, containerWidth, maxPercent]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // 将百分比转回设计图坐标系的 x
    const actualX = Math.round((sliderPercent / 100) * IMAGE_WIDTH);
    onVerify(token, actualX);
  }, [isDragging, sliderPercent, token, onVerify]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  // 滑块在容器中的尺寸和位置（百分比，响应式缩放）
  const sliderStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${sliderPercent}%`,
    top: `${(sliderY / IMAGE_HEIGHT) * 100}%`,
    width: `${(sliderWidth / IMAGE_WIDTH) * 100}%`,
    height: `${(sliderHeight / IMAGE_HEIGHT) * 100}%`,
    pointerEvents: 'none',
    userSelect: 'none',
    willChange: 'left',
  };

  return (
    <div className="space-y-2 select-none">
      {/* 图片区域 */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[300px] mx-auto aspect-[2/1] border-2 border-brutal-border bg-brutal-bg overflow-hidden"
        onMouseMove={onMouseMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchMove={onTouchMove}
        onTouchEnd={handleEnd}
      >
        {/* 背景图 */}
        <img
          src={background}
          alt="captcha background"
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />

        {/* 滑块图 */}
        <img
          src={slider}
          alt="captcha slider"
          style={sliderStyle}
          draggable={false}
        />

        {/* Drag visual feedback */}
        {isDragging && (
          <div className="absolute inset-0 bg-brutal-accent/5 pointer-events-none" />
        )}
      </div>

      {/* 滑轨 */}
      <div className="relative h-10 border-2 border-brutal-border bg-brutal-bg flex items-center max-w-[300px] mx-auto">
        {/* 进度条 */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-brutal-accent/20 transition-all"
          style={{ width: `${(sliderPercent / maxPercent) * 100}%` }}
        />

        {/* 提示文字 */}
        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-brutal-muted pointer-events-none">
          {t('auth.slider_hint')}
        </span>

        {/* 滑块按钮 */}
        <div
          className={`absolute top-0 bottom-0 w-10 bg-brutal-accent text-brutal-bg flex items-center justify-center cursor-grab active:cursor-grabbing z-10 ${
            isDragging ? 'shadow-lg' : ''
          }`}
          style={{ left: `calc(${(sliderPercent / maxPercent) * 100}% - ${(sliderPercent / maxPercent) * 40}px)` }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <span className="text-lg">→</span>
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end max-w-[300px] mx-auto">
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-brutal-muted hover:text-brutal-accent transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          {t('auth.refresh_captcha')}
        </button>
      </div>
    </div>
  );
}
