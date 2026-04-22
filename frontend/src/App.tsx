import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { FutureConfig } from 'react-router-dom';
import { ProjectBoard } from './components/ProjectBoard';
import { ProjectDetail } from './components/ProjectDetail';
import { AdminPage } from './components/AdminPage';
import { LoginModal } from './components/LoginModal';
import { authApi, clearAuthToken, isAuthenticated, isAdmin } from './services/api';

// React Router v7 兼容配置
const routerFuture: FutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          await authApi.getMe();
          setIsLoggedIn(true);
        } catch {
          clearAuthToken();
          setIsLoggedIn(false);
        }
      }
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 忽略错误
    }
    clearAuthToken();
    setIsLoggedIn(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brutal-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-brutal-muted">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <LoginModal isOpen={!isLoggedIn} onLogin={handleLogin} />
      {isLoggedIn && (
        <BrowserRouter future={routerFuture}>
          <Routes>
            <Route path="/" element={<ProjectBoard onLogout={handleLogout} />} />
            <Route path="/project/:id" element={<ProjectDetail onLogout={handleLogout} />} />
            <Route
              path="/admin"
              element={isAdmin() ? <AdminPage onLogout={handleLogout} /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      )}
    </>
  );
}

export default App;
