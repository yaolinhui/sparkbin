import { useState, useEffect } from 'react';
import { Lock, User, AlertCircle, Loader2, X, Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';
import { authApi, setAuthToken, setRefreshToken, ApiError } from '../services/api';
import { DotGridBackground } from './DotGridBackground';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: () => void;
  onClose?: () => void;
}

type Tab = 'login' | 'register' | 'forgot';

function calculatePasswordStrength(password: string): { score: number; label: '弱' | '中' | '强'; colorClass: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score++;

  if (score <= 2) return { score, label: '弱', colorClass: 'bg-[var(--brutal-error)]' };
  if (score <= 4) return { score, label: '中', colorClass: 'bg-[var(--brutal-warning)]' };
  return { score, label: '强', colorClass: 'bg-[var(--brutal-success)]' };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 50;
}

export function LoginModal({ isOpen, onLogin, onClose }: LoginModalProps) {
  const [tab, setTab] = useState<Tab>('login');

  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Captcha & lockout states
  const [captchaQuestion, setCaptchaQuestion] = useState<string | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

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
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirm('');
      setHoneypot('');
      setForgotEmail('');
      setForgotSent(false);
      setPassword('');
      setTab('login');
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
      setRefreshToken(response.refresh_token);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    // Honeypot 防御：如果隐藏字段被填写，静默丢弃（不暴露是 honeypot）
    if (honeypot.trim()) {
      setError('注册失败，请刷新页面后重试');
      return;
    }

    // 前端校验链
    if (!validateUsername(regUsername)) {
      setError('用户名长度需在 3-50 个字符之间');
      return;
    }
    if (!validateEmail(regEmail)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    if (regPassword.length < 8) {
      setError('密码至少需要 8 个字符');
      return;
    }
    if (regPassword !== regConfirm) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.register({
        username: regUsername,
        email: regEmail,
        password: regPassword,
        honeypot,
      });
      setAuthToken(response.access_token);
      setRefreshToken(response.refresh_token);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();
    setIsLoading(true);

    try {
      await authApi.forgotPassword({ email: forgotEmail });
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setIsLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    resetErrors();
    setForgotSent(false);
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    window.location.href = authApi.getOAuthUrl(provider);
  };

  const regStrength = calculatePasswordStrength(regPassword);

  const tabButton = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => switchTab(t)}
      className={`flex-1 py-2 text-xs font-mono font-bold border-b-2 transition-colors
        ${tab === t
          ? 'border-brutal-accent text-brutal-accent'
          : 'border-transparent text-brutal-muted hover:text-brutal-text'
        }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <DotGridBackground />
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

        {/* Tabs */}
        <div className="flex border-b border-brutal-border">
          {tabButton('login', '登录')}
          {tabButton('register', '注册')}
          {tabButton('forgot', '找回密码')}
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

        {/* Login Tab */}
        {tab === 'login' && (
          <>
            <form onSubmit={handleLogin} className="p-6 space-y-4 animate-fade-in-slide">
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
                    placeholder="Username"
                    autoComplete="username"
                    disabled={isLoading || isLocked}
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
                    placeholder="Password"
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
                    AUTHENTICATING...
                  </>
                ) : (
                  'LOGIN'
                )}
              </button>
            </form>

            {/* OAuth Divider */}
            <div className="px-6 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-brutal-border" />
                <span className="text-xs font-mono text-brutal-muted">Or continue with</span>
                <div className="flex-1 h-px bg-brutal-border" />
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="px-6 pb-6 pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                className="w-full py-3 bg-brutal-bg text-brutal-text font-mono font-bold
                           border-2 border-brutal-border
                           hover:border-brutal-accent hover:text-brutal-accent
                           transition-colors flex items-center justify-center gap-2
                           active:translate-x-[2px] active:translate-y-[2px]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuth('github')}
                className="w-full py-3 bg-brutal-bg text-brutal-text font-mono font-bold
                           border-2 border-brutal-border
                           hover:border-brutal-accent hover:text-brutal-accent
                           transition-colors flex items-center justify-center gap-2
                           active:translate-x-[2px] active:translate-y-[2px]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </button>
            </div>
          </>
        )}

        {/* Register Tab */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="p-6 space-y-4 animate-fade-in-slide">
            {/* Honeypot: 隐藏字段，机器人会填，人类看不到 */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="absolute opacity-0 top-0 left-0 h-0 w-0 pointer-events-none"
              aria-hidden="true"
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
            />
            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-brutal-border bg-brutal-bg
                             focus:border-brutal-accent focus:outline-none font-mono text-sm"
                  placeholder="3-50 个字符"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-brutal-border bg-brutal-bg
                             focus:border-brutal-accent focus:outline-none font-mono text-sm"
                  placeholder="your@email.com"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-brutal-border bg-brutal-bg
                             focus:border-brutal-accent focus:outline-none font-mono text-sm"
                  placeholder="输入密码"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-muted hover:text-brutal-text"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] font-mono text-brutal-muted mt-1.5">
                至少 8 位，含大写、小写、数字和特殊符号
              </p>
              {/* Password Strength Bar */}
              {regPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[var(--brutal-border)]">
                      <div
                        className={`h-full transition-all duration-150 ${regStrength.colorClass}`}
                        style={{ width: `${(regStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono ${regStrength.label === '弱' ? 'text-[var(--brutal-error)]' : regStrength.label === '中' ? 'text-[var(--brutal-warning)]' : 'text-[var(--brutal-success)]'}`}>
                      {regStrength.label}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-brutal-muted">
                    长度/大写/小写/数字/特殊符号 — 满足 {regStrength.score}/5 项
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">确认密码</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                className="w-full px-3 py-3 border border-brutal-border bg-brutal-bg
                           focus:border-brutal-accent focus:outline-none font-mono text-sm"
                placeholder="再次输入密码"
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !regUsername || !regEmail || !regPassword || !regConfirm}
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
                  REGISTERING...
                </>
              ) : (
                '注册账号'
              )}
            </button>
          </form>
        )}

        {/* Forgot Password Tab */}
        {tab === 'forgot' && (
          <div className="p-6 space-y-4 animate-fade-in-slide">
            {forgotSent ? (
              <div className="text-center py-4">
                <p className="text-sm font-mono text-brutal-success mb-4">
                  如果该邮箱已注册，重置邮件已发送，请查收。
                </p>
                <button
                  type="button"
                  onClick={() => { switchTab('login'); setForgotSent(false); setForgotEmail(''); }}
                  className="px-6 py-2 bg-brutal-accent text-brutal-bg font-mono font-bold
                             border-2 border-brutal-accent hover:bg-brutal-bg hover:text-brutal-accent transition-colors
                             active:translate-x-[2px] active:translate-y-[2px]"
                >
                  返回登录
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">注册邮箱</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 border border-brutal-border bg-brutal-bg
                                 focus:border-brutal-accent focus:outline-none font-mono text-sm"
                      placeholder="your@email.com"
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !forgotEmail}
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
                      发送中...
                    </>
                  ) : (
                    '发送重置邮件'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="w-full py-2 text-xs font-mono text-brutal-muted hover:text-brutal-text
                             flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  返回登录
                </button>
              </form>
            )}
          </div>
        )}

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
