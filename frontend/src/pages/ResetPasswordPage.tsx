import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { authApi } from '../services/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('重置链接无效：缺少 token');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 8) {
      setError('密码至少需要 8 个字符');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, new_password: password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md border-2 border-brutal-border bg-brutal-surface p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-brutal-warning" />
          <h1 className="text-xl font-mono font-bold text-brutal-text mb-2">链接无效</h1>
          <p className="text-sm font-mono text-brutal-muted mb-6">重置链接缺少必要参数</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-brutal-text text-brutal-bg font-mono font-bold
                       border-2 border-brutal-text hover:bg-brutal-bg hover:text-brutal-text transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md border-2 border-brutal-border bg-brutal-surface p-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-brutal-success" />
          <h1 className="text-xl font-mono font-bold text-brutal-text mb-2">密码重置成功</h1>
          <p className="text-sm font-mono text-brutal-muted mb-6">请使用新密码登录</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-brutal-accent text-brutal-bg font-mono font-bold
                       border-2 border-brutal-accent hover:bg-brutal-bg hover:text-brutal-accent transition-colors"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md border-2 border-brutal-border bg-brutal-surface">
        <div className="p-6 border-b-2 border-brutal-border bg-brutal-text">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brutal-bg flex items-center justify-center">
              <Lock className="w-5 h-5 text-brutal-text" />
            </div>
            <div>
              <h1 className="text-xl font-mono font-bold text-brutal-bg">重置密码</h1>
              <p className="text-xs font-mono text-brutal-bg/70">RESET PASSWORD</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 border-2 border-brutal-warning bg-brutal-warning/10 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-brutal-warning flex-shrink-0" />
              <span className="text-sm font-mono text-brutal-warning">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">新密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-3 border border-brutal-border bg-brutal-bg
                         focus:border-brutal-accent focus:outline-none font-mono text-sm"
              placeholder="至少 8 位，包含大小写字母和数字"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-3 border border-brutal-border bg-brutal-bg
                         focus:border-brutal-accent focus:outline-none font-mono text-sm"
              placeholder="再次输入新密码"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full py-3 bg-brutal-accent text-brutal-bg font-mono font-bold
                       border-2 border-brutal-accent hover:bg-brutal-bg hover:text-brutal-accent
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                处理中...
              </>
            ) : (
              '确认重置'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
