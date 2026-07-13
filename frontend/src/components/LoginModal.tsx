import { useState, useEffect, useRef } from 'react';
import { Lock, User, AlertCircle, Loader2, X, Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';
import { authApi, setAuthToken, ApiError, type BaseResponse, type CaptchaResponse } from '../services/api';
import { useI18n } from '../i18n/hooks';
import { DotGridBackground } from './DotGridBackground';
import { SliderCaptcha } from './SliderCaptcha';
import type { DotGridBackgroundRef } from './DotGridBackground';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: () => void;
  onClose?: () => void;
}

type Tab = 'login' | 'register' | 'forgot';

function calculatePasswordStrength(password: string): { score: number; label: 'Weak' | 'Medium' | 'Strong'; colorClass: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', colorClass: 'bg-[var(--brutal-error)]' };
  if (score <= 4) return { score, label: 'Medium', colorClass: 'bg-[var(--brutal-warning)]' };
  return { score, label: 'Strong', colorClass: 'bg-[var(--brutal-success)]' };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 50;
}

export function LoginModal({ isOpen, onLogin, onClose }: LoginModalProps) {
  const { t } = useI18n();
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
  const [formStartTime, setFormStartTime] = useState<number>(0);

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Captcha & lockout states
  const [captchaData, setCaptchaData] = useState<CaptchaResponse | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaX, setCaptchaX] = useState<number | null>(null);
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

  // Load remembered username when modal opens
  useEffect(() => {
    if (isOpen) {
      const remembered = localStorage.getItem('sparkbin_remembered_username');
      if (remembered) {
        setUsername(remembered);
        setRememberMe(true);
      }
    }
  }, [isOpen]);

  // Global keyboard listener: Esc closes modal
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

  // Reset state when modal closes (keep username if remember me is checked)
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
      setCaptchaData(null);
      setCaptchaToken(null);
      setCaptchaX(null);
      setLockoutSeconds(null);
      setIsLocked(false);
      if (!rememberMe) {
        setUsername('');
      }
    }
  }, [isOpen, rememberMe]);

  // Lockout countdown
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

  const resetErrors = () => {
    setError(null);
    setRegisterSuccess(null);
  };

  // Fetch captcha
  const fetchCaptcha = async () => {
    try {
      const data = await authApi.getCaptcha();
      setCaptchaData(data);
      setCaptchaToken(null);
      setCaptchaX(null);
    } catch {
      setCaptchaData(null);
      setCaptchaToken(null);
      setCaptchaX(null);
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    resetErrors();
    setIsLoading(true);

    try {
      await authApi.login({
        username,
        password,
        captcha_token: captchaToken ?? undefined,
        captcha_x: captchaX ?? undefined,
      });
      // Token is written to HttpOnly Cookie by backend, JS does not hold real token
      setAuthToken('ok');
      if (rememberMe) {
        localStorage.setItem('sparkbin_remembered_username', username);
      } else {
        localStorage.removeItem('sparkbin_remembered_username');
      }
      setCaptchaData(null);
      setCaptchaToken(null);
      setCaptchaX(null);
      onLogin();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        // Captcha required
        if (err.status === 400 && (err.message.includes('Captcha required') || err.message.includes('Captcha incorrect'))) {
          fetchCaptcha();
        }
        // Rate limit: parse Retry-After
        if (err.status === 429) {
          const retryAfter = parseInt(err.headers['retry-after'] || err.headers['Retry-After'] || '300', 10);
          setLockoutSeconds(retryAfter);
        }
      } else {
        setError(err instanceof Error ? err.message : t('auth.login_failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    // Honeypot defense: silently drop if hidden field is filled
    if (honeypot.trim()) {
      setError('Registration failed. Please refresh and try again.');
      return;
    }

    // Frontend validation chain
    if (!validateUsername(regUsername)) {
      setError('Username must be 3-50 characters.');
      return;
    }
    if (!validateEmail(regEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (regPassword !== regConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.register({
        username: regUsername,
        email: regEmail,
        password: regPassword,
        honeypot,
        form_start_time: formStartTime > 0 ? formStartTime / 1000 : 0,
      });
      setRegisterSuccess(response.message || 'Registration successful. Please check your email to verify.');
      // Clear registration form to avoid duplicate submission
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.register_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();
    setIsLoading(true);

    try {
      const res: BaseResponse = await authApi.forgotPassword({ email: forgotEmail });
      if (res.success === false) {
        setError(res.message || '{t('auth.send_failed')}');
      } else {
        setForgotSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.send_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    resetErrors();
    setForgotSent(false);
    if (t === 'register') {
      setFormStartTime(Date.now());
    }
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
      <DotGridBackground ref={gridRef} />
      <div className="w-full max-w-md border-2 border-brutal-border bg-brutal-surface">
        {/* Header */}
        <div className="p-6 border-b-2 border-brutal-border bg-brutal-text relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 bg-brutal-bg flex items-center justify-center
                         hover:bg-brutal-accent transition-colors"
              aria-label="Close"
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
              <p className="text-xs font-mono text-brutal-bg/70">{t('auth.account_auth')}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-brutal-border">
          {tabButton('login', t('auth.login'))}
          {tabButton('register', t('auth.register'))}
          {tabButton('forgot', t('auth.forgot_password'))}
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
                  {t('auth.username')}
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
                    placeholder={t('auth.username')}
                    autoComplete="username"
                    disabled={isLoading || isLocked}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
                  {t('auth.password')}
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
                    placeholder={t('auth.password')}
                    autoComplete="current-password"
                    disabled={isLoading || isLocked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-muted hover:text-brutal-text"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Slider captcha */}
              {captchaData && (
                <div className="animate-fade-in-slide">
                  <SliderCaptcha
                    token={captchaData.token}
                    background={captchaData.background}
                    slider={captchaData.slider}
                    slider_width={captchaData.slider_width}
                    slider_height={captchaData.slider_height}
                    slider_y={captchaData.slider_y}
                    onVerify={(token, x) => {
                      setCaptchaToken(token);
                      setCaptchaX(x);
                    }}
                    onRefresh={fetchCaptcha}
                  />
                </div>
              )}

              {/* Lockout countdown */}
              {isLocked && lockoutSeconds !== null && (
                <div className="p-3 border-2 border-brutal-error bg-brutal-error/10 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-brutal-error flex-shrink-0" />
                  <span className="text-sm font-mono text-brutal-error">
                    Too many attempts. Please retry after {formatCountdown(lockoutSeconds)}.
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
                <span className="text-xs font-mono text-brutal-muted">{t('auth.remember_me')}</span>
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
                    {t('auth.logging_in')}
                  </>
                ) : (
                  {t('auth.login')}
                )}
              </button>
            </form>

            {/* OAuth Divider */}
            <div className="px-6 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-brutal-border" />
                <span className="text-xs font-mono text-brutal-muted">{t('auth.or_login_with')}</span>
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
          registerSuccess ? (
            <div className="p-6 space-y-4 animate-fade-in-slide text-center">
              <p className="text-sm font-mono text-brutal-success mb-4">
                {registerSuccess}
              </p>
              <button
                type="button"
                onClick={() => { switchTab('login'); }}
                className="px-6 py-2 bg-brutal-accent text-brutal-bg font-mono font-bold
                           border-2 border-brutal-accent hover:bg-brutal-bg hover:text-brutal-accent transition-colors
                           active:translate-x-[2px] active:translate-y-[2px]"
              >
                {t('auth.login')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="p-6 space-y-4 animate-fade-in-slide">
            {/* Honeypot: hidden field, bots fill it, humans don't */}
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
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">{t('auth.username')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  onFocus={handleInputFocus}
                  className="w-full pl-10 pr-3 py-3 border border-brutal-border bg-brutal-bg
                             focus:border-brutal-accent focus:outline-none font-mono text-sm"
                  placeholder="3-50 chars"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  onFocus={handleInputFocus}
                  className="w-full pl-10 pr-3 py-3 border border-brutal-border bg-brutal-bg
                             focus:border-brutal-accent focus:outline-none font-mono text-sm"
                  placeholder="your@email.com"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  onFocus={handleInputFocus}
                  className="w-full pl-10 pr-10 py-3 border border-brutal-border bg-brutal-bg
                             focus:border-brutal-accent focus:outline-none font-mono text-sm"
                  placeholder="Enter password"
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
                {t('auth.password_requirements')}
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
                    <span className={`text-xs font-mono ${regStrength.label === 'Weak' ? 'text-[var(--brutal-error)]' : regStrength.label === 'Medium' ? 'text-[var(--brutal-warning)]' : 'text-[var(--brutal-success)]'}`}>
                      {regStrength.label}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-brutal-muted">
                    {t('auth.password_requirements')}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">{t('auth.confirm_password')}</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                onFocus={handleInputFocus}
                className="w-full px-3 py-3 border border-brutal-border bg-brutal-bg
                           focus:border-brutal-accent focus:outline-none font-mono text-sm"
                placeholder="Confirm password"
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
                  {t('auth.registering')}
                </>
              ) : (
                {t('auth.register')}
              )}
            </button>
          </form>
          )
        )}

        {/* Forgot Password Tab */}
        {tab === 'forgot' && (
          <div className="p-6 space-y-4 animate-fade-in-slide">
            {forgotSent ? (
              <div className="text-center py-4">
                <p className="text-sm font-mono text-brutal-success mb-4">
                  If this email is registered, a reset email has been sent.
                </p>
                <button
                  type="button"
                  onClick={() => { switchTab('login'); setForgotSent(false); setForgotEmail(''); }}
                  className="px-6 py-2 bg-brutal-accent text-brutal-bg font-mono font-bold
                             border-2 border-brutal-accent hover:bg-brutal-bg hover:text-brutal-accent transition-colors
                             active:translate-x-[2px] active:translate-y-[2px]"
                >
                  {t('auth.back_to_login')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-muted" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      onFocus={handleInputFocus}
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
                      {t('auth.sending')}
                    </>
                  ) : (
                    {t('auth.send_reset_email')}
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="w-full py-2 text-xs font-mono text-brutal-muted hover:text-brutal-text
                             flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  {t('auth.back_to_login')}
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
