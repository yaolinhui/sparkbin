// 全局 Toast 事件系统 —— 避免在每个组件中重复渲染 Toast UI

export type ToastType = 'success' | 'error' | 'info';

interface ToastPayload {
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastListener = (payload: ToastPayload) => void;

const listeners: ToastListener[] = [];

export function subscribeToast(listener: ToastListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

export function emitToast(message: string, type: ToastType = 'info', duration?: number): void {
  listeners.forEach((listener) => listener({ message, type, duration }));
}
