import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authApi } from '../services/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在验证邮箱...');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('验证链接无效：缺少 token');
      return;
    }

    authApi.verifyEmail(token)
      .then((res) => {
        if (res.success) {
          setStatus('success');
          setMessage(res.message);
        } else {
          setStatus('error');
          setMessage(res.message);
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : '验证失败');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-brutal-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md border-2 border-brutal-border bg-brutal-surface p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brutal-accent" />
            <h1 className="text-xl font-mono font-bold text-brutal-text">{message}</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-brutal-success" />
            <h1 className="text-xl font-mono font-bold text-brutal-text mb-2">邮箱验证成功</h1>
            <p className="text-sm font-mono text-brutal-muted mb-6">{message}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-brutal-accent text-brutal-bg font-mono font-bold
                         border-2 border-brutal-accent hover:bg-brutal-bg hover:text-brutal-accent transition-colors"
            >
              进入 SparkBin
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-brutal-warning" />
            <h1 className="text-xl font-mono font-bold text-brutal-text mb-2">验证失败</h1>
            <p className="text-sm font-mono text-brutal-muted mb-6">{message}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-brutal-text text-brutal-bg font-mono font-bold
                         border-2 border-brutal-text hover:bg-brutal-bg hover:text-brutal-text transition-colors"
            >
              返回首页
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
