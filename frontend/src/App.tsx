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
  authApi, clearAuthToken, isAuthenticated, setCachedRole, setCachedUserId, setOnUnauthorized,
  setRefreshToken, startTokenRefreshTimer, stopTokenRefreshTimer, setAuthToken,
} from './services/api';

// React Router v7 兼容配置
const routerFuture: FutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

function OAuthHandler({ onLogin }: { onLogin: (resp?: { access_token: string; refresh_token: string }) => void }) {
  useEffect(() => {
    // 从 URL fragment 读取 OAuth 参数
    const hash = window.location.hash.slice(1); // 去掉开头的 #
    const params = new URLSearchParams(hash);
    const oauthSuccess = params.get('oauth_success');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const githubConnect = params.get('github_connect');
    const oauthBindSuccess = params.get('oauth_bind_success');

    if (oauthSuccess === '1' && accessToken && refreshToken) {
      setAuthToken(accessToken);
      setRefreshToken(refreshToken);
      // 清除 URL fragment
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      onLogin({ access_token: accessToken, refresh_token: refreshToken });
    }

    if (githubConnect === 'success') {
      // GitHub 连接成功，清除 URL fragment 并标记 session
      sessionStorage.setItem('sparkbin_github_connected', '1');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (oauthBindSuccess === '1') {
      sessionStorage.setItem('sparkbin_oauth_bind_success', '1');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
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
      if (isAuthenticated()) {
        // 前置校验：token 格式必须是合法 JWT（header.payload.signature）
        const token = localStorage.getItem('sparkbin_token');
        const isValidJwt = token ? /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) : false;
        if (!isValidJwt) {
          clearAuthToken();
          stopTokenRefreshTimer();
          setCachedRole(null);
          setUserRole(null);
          setIsLoggedIn(false);
          setRequirePasswordChange(false);
          setIsChecking(false);
          return;
        }

        try {
          const me = await authApi.getMe();
          setCachedRole(me.role);
          setCachedUserId(me.id);
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
      setCachedUserId(me.id);
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
        <p className="font-mono text-brutal-muted">Loading page...</p>
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
