import { useState, useEffect, useRef } from 'react';
import { Lock, User, AlertCircle, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { authApi, setAuthToken, ApiError } from '../services/api';
import { DotGridBackground } from './DotGridBackground';
import type { DotGridBackgroundRef } from './DotGridBackground';

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
  const [rememberMe, setRememberMe] = useState(false);

  // Captcha & lockout states
  const [captchaQuestion, setCaptchaQuestion] = useState<string | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const gridRef = useRef<DotGridBackgroundRef>(null);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const rect = e.target.getBoundingClientRect();
    const container = e.target.closest('.fixed.inset-0');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - containerRect.left;
    const y = rect.top + rect.height / 2 - containerRect.top;
    gridRef.current?.addPulse(x, y, 3.5);
  };

  // 弹窗打开时加载记住的用户名
  useEffect(() => {
    if (isOpen) {
      const remembered = localStorage.getItem('sparkbin_remembered_username');
      if (remembered) {
        setUsername(remembered);
        setRememberMe(true);
      }
    }
  }, [isOpen]);

  // 全局键盘监听：Esc 关闭弹窗
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 弹窗关闭时重置状态（保留用户名若勾选了记住我）
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsLoading(false);
      setPassword('');
      setCaptchaQuestion(null);
      setCaptchaAnswer('');
      setLockoutSeconds(null);
      setIsLocked(false);
      if (!rememberMe) {
        setUsername('');
      }
    }
  }, [isOpen, rememberMe]);

  // 锁定倒计时
  useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) {
      setIsLocked(false);
      return;
    }
    setIsLocked(true);
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setIsLocked(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  if (!isOpen) return null;

  const resetErrors = () => setError(null);

  // 获取验证码
  const fetchCaptcha = async () => {
    try {
      const data = await authApi.getCaptcha();
      setCaptchaQuestion(data.question);
      setCaptchaAnswer('');
    } catch {
      setCaptchaQuestion(null);
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s.toString().padStart(2, '0')}秒`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    resetErrors();
    setIsLoading(true);

    try {
      const response = await authApi.login({
        username,
        password,
        captcha_answer: captchaAnswer || undefined,
      });
      setAuthToken(response.access_token);
      if (rememberMe) {
        localStorage.setItem('sparkbin_remembered_username', username);
      } else {
        localStorage.removeItem('sparkbin_remembered_username');
      }
      setCaptchaQuestion(null);
      setCaptchaAnswer('');
      onLogin();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        // 需要验证码
        if (err.status === 400 && (err.message.includes('需要验证码') || err.message.includes('验证码错误'))) {
          fetchCaptcha();
        }
        // 速率限制：解析 Retry-After
        if (err.status === 429) {
          const retryAfter = parseInt(err.headers['retry-after'] || err.headers['Retry-After'] || '300', 10);
          setLockoutSeconds(retryAfter);
        }
      } else {
        setError(err instanceof Error ? err.message : '登录失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <DotGridBackground ref={gridRef} />
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
              <p className="text-xs font-mono text-brutal-bg/70">管理员登录</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 pt-4 animate-slide-down">
            <div className="p-3 border-2 border-brutal-warning bg-brutal-warning/10 flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-brutal-warning flex-shrink-0" />
              <span className="text-sm font-mono text-brutal-warning">{error}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4 animate-fade-in-slide">
          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              用户名
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={handleInputFocus}
                className="w-full pl-10 pr-3 py-3 border border-brutal-border bg-brutal-bg
                           focus:border-brutal-accent focus:outline-none
                           font-mono text-sm transition-colors"
                placeholder="用户名"
                autoComplete="username"
                disabled={isLoading || isLocked}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={handleInputFocus}
                className="w-full pl-10 pr-10 py-3 border border-brutal-border bg-brutal-bg
                           focus:border-brutal-accent focus:outline-none
                           font-mono text-sm transition-colors"
                placeholder="输入密码"
                autoComplete="current-password"
                disabled={isLoading || isLocked}
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

          {/* 验证码输入 */}
          {captchaQuestion && (
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                验证码
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-brutal-text whitespace-nowrap">
                  {captchaQuestion} =
                </span>
                <input
                  type="text"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  onFocus={handleInputFocus}
                  className="flex-1 px-3 py-2 border border-brutal-border bg-brutal-bg
                             focus:border-brutal-accent focus:outline-none
                             font-mono text-sm transition-colors"
                  placeholder="?"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  className="px-3 py-2 text-xs font-mono border border-brutal-border
                             hover:border-brutal-accent hover:text-brutal-accent transition-colors"
                  disabled={isLoading}
                >
                  刷新
                </button>
              </div>
            </div>
          )}

          {/* 锁定倒计时 */}
          {isLocked && lockoutSeconds !== null && (
            <div className="p-3 border-2 border-brutal-error bg-brutal-error/10 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-brutal-error flex-shrink-0" />
              <span className="text-sm font-mono text-brutal-error">
                尝试次数过多，请等待 {formatCountdown(lockoutSeconds)} 后重试
              </span>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 border-2 border-brutal-border bg-brutal-bg
                         checked:bg-brutal-accent checked:border-brutal-accent
                         focus:outline-none focus:ring-1 focus:ring-brutal-accent"
            />
            <span className="text-xs font-mono text-brutal-muted">记住我</span>
          </label>

          <button
            type="submit"
            disabled={isLoading || isLocked || !username || !password}
            className="w-full py-3 bg-brutal-accent text-brutal-bg font-mono font-bold
                       border-2 border-brutal-accent
                       hover:bg-brutal-bg hover:text-brutal-accent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2
                       active:translate-x-[2px] active:translate-y-[2px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                登录中...
              </>
            ) : (
              '登录'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brutal-border bg-brutal-bg">
          <div className="flex items-center justify-between text-xs font-mono text-brutal-muted">
            <span>自托管模式</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-brutal-success rounded-full animate-pulse" />
              在线
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
