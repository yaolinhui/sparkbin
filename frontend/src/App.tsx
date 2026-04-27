import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import type { FutureConfig } from 'react-router-dom';
import { ProjectBoard } from './components/ProjectBoard';
import { ProjectDetail } from './components/ProjectDetail';
import { AdminPage } from './components/AdminPage';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import {
  authApi, clearAuthToken, isAuthenticated, setCachedRole, setOnUnauthorized,
  setRefreshToken, startTokenRefreshTimer, stopTokenRefreshTimer, setAuthToken,
} from './services/api';

// React Router v7 兼容配置
const routerFuture: FutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

function OAuthHandler({ onLogin }: { onLogin: (resp?: { access_token: string; refresh_token: string }) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth_success');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (oauthSuccess === '1' && accessToken && refreshToken) {
      setAuthToken(accessToken);
      setRefreshToken(refreshToken);
      // 清除 URL 中的 token 参数
      setSearchParams({}, { replace: true });
      onLogin({ access_token: accessToken, refresh_token: refreshToken });
    }
  }, [searchParams, setSearchParams, onLogin]);

  return null;
}

function AppRoutes() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  useEffect(() => {
    setOnUnauthorized(() => {
      setCachedRole(null);
      setUserRole(null);
      setIsLoggedIn(false);
      setShowLogin(true);
    });

    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          const me = await authApi.getMe();
          setCachedRole(me.role);
          setUserRole(me.role);
          if (me.require_password_change) {
            setRequirePasswordChange(true);
            setIsLoggedIn(true);
          } else {
            setRequirePasswordChange(false);
            setIsLoggedIn(true);
          }
          startTokenRefreshTimer();
        } catch {
          clearAuthToken();
          stopTokenRefreshTimer();
          setCachedRole(null);
          setUserRole(null);
          setIsLoggedIn(false);
          setRequirePasswordChange(false);
        }
      }
      setIsChecking(false);
    };

    checkAuth();

    return () => {
      setOnUnauthorized(null);
      stopTokenRefreshTimer();
    };
  }, []);

  const handleLogin = async (loginResponse?: { access_token: string; refresh_token: string }) => {
    try {
      if (loginResponse) {
        setRefreshToken(loginResponse.refresh_token);
      }
      const me = await authApi.getMe();
      setCachedRole(me.role);
      setUserRole(me.role);
      setIsLoggedIn(true);
      setShowLogin(false);
      startTokenRefreshTimer();
      if (me.require_password_change) {
        setRequirePasswordChange(true);
      }
    } catch {
      // getMe 失败时保持未登录状态
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 忽略错误
    }
    clearAuthToken();
    stopTokenRefreshTimer();
    setCachedRole(null);
    setUserRole(null);
    setIsLoggedIn(false);
    setShowLogin(true);
  };

  // 公共路由（无需登录）
  const publicPaths = ['/verify-email', '/reset-password'];
  const isPublicPath = publicPaths.includes(location.pathname);

  if (isChecking && !isPublicPath) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brutal-accent border-t-transparent animate-spin mx-auto mb-4" />
          <p className="font-mono text-brutal-muted">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OAuthHandler onLogin={handleLogin} />

      {/* 公共页面 */}
      {isPublicPath && (
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}

      {/* 未登录：显示登录弹窗或占位页 */}
      {!isLoggedIn && !isPublicPath && (
        <>
          <LoginModal
            isOpen={showLogin}
            onLogin={handleLogin}
            onClose={() => setShowLogin(false)}
          />
          {!showLogin && (
            <div className="min-h-screen bg-brutal-bg flex flex-col items-center justify-center p-4">
              <div className="border-2 border-brutal-border bg-brutal-surface p-8 max-w-md w-full text-center">
                <h1 className="text-2xl font-mono font-bold text-brutal-text mb-4">SPARKBIN</h1>
                <p className="text-sm font-mono text-brutal-muted mb-6">
                  你需要登录才能继续使用。
                </p>
                <button
                  onClick={() => setShowLogin(true)}
                  className="w-full py-3 bg-brutal-accent text-brutal-bg font-mono font-bold
                             border-2 border-brutal-accent
                             hover:bg-brutal-bg hover:text-brutal-accent
                             transition-colors"
                >
                  LOGIN
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 已登录：主应用路由 */}
      {isLoggedIn && requirePasswordChange && !isPublicPath && (
        <ChangePasswordModal
          isOpen={true}
          isForced={true}
          onSuccess={() => setRequirePasswordChange(false)}
        />
      )}

      {isLoggedIn && !requirePasswordChange && !isPublicPath && (
        <Routes>
          <Route path="/" element={<ProjectBoard onLogout={handleLogout} />} />
          <Route path="/project/:id" element={<ProjectDetail onLogout={handleLogout} />} />
          <Route
            path="/admin"
            element={userRole === 'admin' ? <AdminPage onLogout={handleLogout} /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter future={routerFuture}>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
