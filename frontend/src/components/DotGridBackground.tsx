import { useRef, useEffect } from 'react';

interface Dot {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface DotGridBackgroundProps {
  className?: string;
  style?: React.CSSProperties;
}

export function DotGridBackground({ className, style }: DotGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const prevMouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);
  const themeRef = useRef<'dark' | 'light'>('dark');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SPACING = 28;
    const DOT_RADIUS = 1.2;
    const MOUSE_RADIUS = 140;
    const REPEL_STRENGTH = 2.2;
    const SPRING_K = 0.08;
    const DAMPING = 0.88;

    const getTheme = () => {
      const attr = document.documentElement.getAttribute('data-theme');
      return attr === 'light' ? 'light' : 'dark';
    };

    const getDotColor = () => {
      return themeRef.current === 'dark'
        ? 'rgba(255,255,255,0.18)'
        : 'rgba(26,26,26,0.18)';
    };

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = rect ? rect.width : window.innerWidth;
      const h = rect ? rect.height : window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.ceil(w / SPACING) + 1;
      const rows = Math.ceil(h / SPACING) + 1;
      const dots: Dot[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * SPACING;
          const y = r * SPACING;
          dots.push({ baseX: x, baseY: y, x, y, vx: 0, vy: 0 });
        }
      }
      dotsRef.current = dots;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    const animate = () => {
      const cssW = parseFloat(canvas.style.width) || canvas.width;
      const cssH = parseFloat(canvas.style.height) || canvas.height;
      ctx.clearRect(0, 0, cssW, cssH);

      themeRef.current = getTheme();
      ctx.fillStyle = getDotColor();

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const dx = mx - prevMouseRef.current.x;
      const dy = my - prevMouseRef.current.y;
      const mouseSpeed = Math.sqrt(dx * dx + dy * dy);
      prevMouseRef.current.x = mx;
      prevMouseRef.current.y = my;

      const speedBoost = Math.min(mouseSpeed * 0.12, 2.5);

      for (const dot of dotsRef.current) {
        const ax = (dot.baseX - dot.x) * SPRING_K;
        const ay = (dot.baseY - dot.y) * SPRING_K;

        const dmx = dot.x - mx;
        const dmy = dot.y - my;
        const dist = Math.sqrt(dmx * dmx + dmy * dmy);
        if (dist < MOUSE_RADIUS && dist > 0.1) {
          const force = (1 - dist / MOUSE_RADIUS) * (REPEL_STRENGTH + speedBoost);
          const nx = dmx / dist;
          const ny = dmy / dist;
          dot.vx += nx * force;
          dot.vy += ny * force;
        }

        dot.vx += ax;
        dot.vy += ay;
        dot.vx *= DAMPING;
        dot.vy *= DAMPING;
        dot.x += dot.vx;
        dot.y += dot.vy;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    rafRef.current = requestAnimationFrame(animate);

    const observer = new MutationObserver(() => {
      themeRef.current = getTheme();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className || ''}`}
      style={style}
    />
  );
}
