import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { FutureConfig } from 'react-router-dom';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { LandingPage } from './components/LandingPage';

// 懒加载页面级组件
const ProjectBoard = lazy(() => import('./components/ProjectBoard'));
const ProjectDetail = lazy(() => import('./components/ProjectDetail'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
import {
  authApi, clearAuthToken, setCachedRole, setCachedUserId, setOnUnauthorized,
  startTokenRefreshTimer, stopTokenRefreshTimer, setAuthToken,
} from './services/api';

// React Router v7 兼容配置
const routerFuture: FutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

function OAuthHandler({ onLogin }: { onLogin: () => void }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const githubConnect = params.get('github_connect');
    const oauthBindSuccess = params.get('oauth_bind_success');

    if (oauthSuccess === '1') {
      // token 已通过后端 HttpOnly Cookie 写入，直接触发登录状态刷新
      window.history.replaceState(null, '', window.location.pathname);
      onLogin();
    }

    if (githubConnect === 'success') {
      sessionStorage.setItem('sparkbin_github_connected', '1');
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (oauthBindSuccess === '1') {
      sessionStorage.setItem('sparkbin_oauth_bind_success', '1');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [onLogin]);

  return null;
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  useEffect(() => {
    setOnUnauthorized(() => {
      setCachedRole(null);
      setCachedUserId(null);
      setUserRole(null);
      setIsLoggedIn(false);
      setShowLogin(true);
    });

    const checkAuth = async () => {
      // 处理 OAuth / bind / GitHub connect 回调标记（token 已通过 Cookie 写入）
      const params = new URLSearchParams(window.location.search);
      const oauthSuccess = params.get('oauth_success');
      const githubConnect = params.get('github_connect');
      const oauthBindSuccess = params.get('oauth_bind_success');

      if (oauthSuccess === '1') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      if (githubConnect === 'success') {
        sessionStorage.setItem('sparkbin_github_connected', '1');
        window.history.replaceState(null, '', window.location.pathname);
      }
      if (oauthBindSuccess === '1') {
        sessionStorage.setItem('sparkbin_oauth_bind_success', '1');
        window.history.replaceState(null, '', window.location.pathname);
      }

      // 始终尝试通过 Cookie 拉取当前用户信息（HttpOnly Cookie 自动携带）
      try {
        const me = await authApi.getMe();
        setCachedRole(me.role);
        setCachedUserId(me.id);
        setUserRole(me.role);
        setAuthToken('ok');
        if (me.require_password_change) {
          setRequirePasswordChange(true);
        } else {
          setRequirePasswordChange(false);
        }
        setIsLoggedIn(true);
        startTokenRefreshTimer();
      } catch {
        clearAuthToken();
        stopTokenRefreshTimer();
        setCachedRole(null);
        setCachedUserId(null);
        setUserRole(null);
        setIsLoggedIn(false);
        setRequirePasswordChange(false);
      }
      setIsChecking(false);
    };

    checkAuth();

    return () => {
      setOnUnauthorized(null);
      stopTokenRefreshTimer();
    };
  }, []);

  const handleLogin = async () => {
    try {
      const me = await authApi.getMe();
      setCachedRole(me.role);
      setCachedUserId(me.id);
      setUserRole(me.role);
      setAuthToken('ok');
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

  const handleLogout = () => {
    // 先发 logout 请求（不 await），确保带上当前 token
    authApi.logout().catch(() => {});

    // 立即清空本地状态并跳转，避免后端 API 延迟导致页面卡住
    clearAuthToken();
    stopTokenRefreshTimer();
    setCachedRole(null);
    setCachedUserId(null);
    setUserRole(null);
    setIsLoggedIn(false);
    setShowLogin(true);
    navigate('/', { replace: true });
  };

  // 页面加载占位
  const pageFallback = (
    <div className="min-h-screen bg-brutal-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brutal-accent border-t-transparent animate-spin mx-auto mb-4" />
        <p className="font-mono text-brutal-muted">加载页面中...</p>
      </div>
    </div>
  );

  // 公共路由（无需登录）
  const publicPaths = ['/verify-email', '/reset-password'];
  const isPublicPath = publicPaths.includes(location.pathname);

  if (isChecking && !isPublicPath) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brutal-accent border-t-transparent animate-spin mx-auto mb-4" />
          <p className="font-mono text-brutal-muted">连接后端中...</p>
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
          {!showLogin && <LandingPage onEnter={() => setShowLogin(true)} />}
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
        <Suspense fallback={pageFallback}>
          <Routes>
            <Route path="/" element={<ProjectBoard onLogout={handleLogout} />} />
            <Route path="/project/:id" element={<ProjectDetail onLogout={handleLogout} />} />
            <Route
              path="/admin"
              element={userRole === 'admin' ? <AdminPage onLogout={handleLogout} /> : <Navigate to="/" replace />}
            />
            <Route path="/profile" element={<ProfilePage onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
