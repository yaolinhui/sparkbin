import { useEffect, useState } from 'react';
import { Check, AlertCircle, X, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    setIsVisible(true);
    setProgress(100);

    const startTime = Date.now();
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [duration, onClose]);

  const colors = {
    success: 'bg-brutal-success border-brutal-success',
    error: 'bg-brutal-warning border-brutal-warning',
    info: 'bg-brutal-accent border-brutal-accent',
  };

  const icons = {
    success: <Check className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  };

  return (
    <div
      className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50
                  transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div
        className={`px-4 py-3 border-2 text-brutal-bg font-mono text-sm flex items-center gap-2 shadow-lg ${colors[type]}`}
        style={{ boxShadow: '4px 4px 0px var(--brutal-text)' }}
      >
        {icons[type]}
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70">
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-brutal-border mt-0">
        <div
          className="h-full bg-brutal-bg transition-none"
          style={{ width: `${progress}%`, opacity: 0.3 }}
        />
      </div>
    </div>
  );
}
