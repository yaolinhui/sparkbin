import { useEffect, useState } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'bg-brutal-success border-brutal-success',
    error: 'bg-brutal-warning border-brutal-warning',
    info: 'bg-brutal-accent border-brutal-accent',
  };

  const icons = {
    success: <Check className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
    info: <Check className="w-4 h-4" />,
  };

  return (
    <div
      className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50
                  transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div
        className={`px-4 py-3 border-2 text-white font-mono text-sm flex items-center gap-2 shadow-lg ${colors[type]}`}
        style={{ boxShadow: '4px 4px 0px #000' }}
      >
        {icons[type]}
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Toast 管理 Hook
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const hideToast = () => setToast(null);

  return { toast, showToast, hideToast };
}

export default Toast;
