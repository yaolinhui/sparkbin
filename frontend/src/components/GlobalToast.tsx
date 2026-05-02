import { useEffect, useState, useCallback } from 'react';
import { Toast } from './Toast';
import { subscribeToast, type ToastType } from '../hooks/toastEvents';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

export function GlobalToast() {
  const [toast, setToast] = useState<ToastItem | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToast((payload) => {
      const id = Date.now();
      setToast({ id, ...payload });
    });
    return unsubscribe;
  }, []);

  const removeToast = useCallback(() => {
    setToast(null);
  }, []);

  if (!toast) return null;

  return (
    <Toast
      key={toast.id}
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      onClose={removeToast}
    />
  );
}
