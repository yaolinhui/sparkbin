import { useState } from 'react';
import { Lock, User, AlertCircle, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { authApi, setAuthToken } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: () => void;
  onClose?: () => void;
}

export function LoginModal({ isOpen, onLogin, onClose }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.login({ username, password });
      setAuthToken(response.access_token);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md border-2 border-brutal-border bg-brutal-surface">
        {/* Header */}
        <div className="p-6 border-b-2 border-brutal-border bg-brutal-text relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 bg-brutal-bg flex items-center justify-center
                         hover:bg-brutal-accent transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4 text-brutal-text" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brutal-bg flex items-center justify-center">
              <Lock className="w-5 h-5 text-brutal-text" />
            </div>
            <div>
              <h1 className="text-xl font-mono font-bold text-brutal-bg">SPARKBIN</h1>
              <p className="text-xs font-mono text-brutal-bg/70">BACKEND AUTHENTICATION</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 border-2 border-brutal-warning bg-brutal-warning/10 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-brutal-warning flex-shrink-0" />
              <span className="text-sm font-mono text-brutal-warning">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-brutal-border bg-brutal-bg
                           focus:border-brutal-accent focus:outline-none
                           font-mono text-sm transition-colors"
                placeholder="admin"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-brutal-border bg-brutal-bg
                           focus:border-brutal-accent focus:outline-none
                           font-mono text-sm transition-colors"
                placeholder="••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-muted hover:text-brutal-text"
                tabIndex={-1}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full py-3 bg-brutal-accent text-brutal-bg font-mono font-bold
                       border-2 border-brutal-accent
                       hover:bg-brutal-bg hover:text-brutal-accent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AUTHENTICATING...
              </>
            ) : (
              'LOGIN'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brutal-border bg-brutal-bg">
          <div className="flex items-center justify-between text-xs font-mono text-brutal-muted">
            <span>Backend Mode</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-brutal-success rounded-full animate-pulse" />
              Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
