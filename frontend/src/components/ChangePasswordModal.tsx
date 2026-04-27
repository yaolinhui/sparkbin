import { useState } from 'react';
import { Lock, AlertCircle, Check, X } from 'lucide-react';
import { authApi } from '../services/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  isForced?: boolean;
  onSuccess: () => void;
  onClose?: () => void;
}

export function ChangePasswordModal({ isOpen, isForced = false, onSuccess, onClose }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少需要 6 个字符');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改密码失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brutal-bg/90 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md border-2 border-brutal-border bg-brutal-surface">
        {/* Header */}
        <div className="p-6 border-b-2 border-brutal-border bg-brutal-text relative">
          {!isForced && onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 bg-brutal-bg flex items-center justify-center hover:bg-brutal-accent transition-colors"
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
              <h1 className="text-xl font-mono font-bold text-brutal-bg">
                {isForced ? '首次登录 — 修改默认密码' : '修改密码'}
              </h1>
              <p className="text-xs font-mono text-brutal-bg/70">
                {isForced ? '为了账户安全，请先修改默认密码' : 'BACKEND AUTHENTICATION'}
              </p>
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

          {success && (
            <div className="p-3 border-2 border-brutal-success bg-brutal-success/10 flex items-center gap-2">
              <Check className="w-4 h-4 text-brutal-success flex-shrink-0" />
              <span className="text-sm font-mono text-brutal-success">密码修改成功</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              当前密码
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-3 border border-brutal-border bg-brutal-bg
                         focus:border-brutal-accent focus:outline-none
                         font-mono text-sm transition-colors"
              placeholder="输入当前密码"
              disabled={isLoading || success}
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              新密码
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-3 border border-brutal-border bg-brutal-bg
                         focus:border-brutal-accent focus:outline-none
                         font-mono text-sm transition-colors"
              placeholder="至少 6 个字符"
              disabled={isLoading || success}
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-brutal-muted mb-2 uppercase">
              确认新密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-3 border border-brutal-border bg-brutal-bg
                         focus:border-brutal-accent focus:outline-none
                         font-mono text-sm transition-colors"
              placeholder="再次输入新密码"
              disabled={isLoading || success}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || success || !oldPassword || !newPassword || !confirmPassword}
            className="w-full py-3 bg-brutal-accent text-brutal-bg font-mono font-bold
                       border-2 border-brutal-accent
                       hover:bg-brutal-bg hover:text-brutal-accent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-brutal-bg border-t-transparent animate-spin" />
                处理中...
              </>
            ) : (
              isForced ? '确认修改并进入系统' : '修改密码'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
