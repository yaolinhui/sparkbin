import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Shield, Cat, Lock, Zap, Palette,
} from 'lucide-react';
import { authApi, isAuthenticated } from '../services/api';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ModelSelector } from './ModelSelector';
import { AIPetConfig } from './AIPetConfig';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useToast } from '../hooks/useToast';
import type { AIPetConfig as AIPetConfigType } from '../types';
import { PET_OPTIONS, PERSONALITY_OPTIONS } from './AIPetConfig.constants';
import { PIXEL_PET_CATALOG } from './PixelPet.frames';
import { PixelPet } from './PixelPet';

interface ProfilePageProps {
  onLogout: () => void;
}

// Section Card Component
function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-brutal-border bg-brutal-surface">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-brutal-border bg-brutal-bg">
        <Icon className="w-4 h-4 text-brutal-accent" />
        <span className="text-sm font-mono font-bold uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

// Info Row Component
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-brutal-border/50 last:border-0">
      <span className="text-xs font-mono text-brutal-muted uppercase">{label}</span>
      <span className="text-sm font-mono text-brutal-text">{value}</span>
    </div>
  );
}

export function ProfilePage({ onLogout }: ProfilePageProps) {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const [user, setUser] = useState<{
    id: string;
    username: string;
    email: string | null;
    email_verified: boolean;
    avatar_url: string | null;
    role: string;
    preferred_model: string | null;
    enable_payments: boolean;
    pet_config: { type: string; name: string; personality: string; verbosity: string } | null;
    theme_preference: string | null;
    require_password_change: boolean;
    oauth_provider: string | null;
    oauth_id: string | null;
    quota: {
      ai_credits: number;
      ai_credits_total_consumed: number;
      projects_used: number;
      projects_limit: number | null;
    };
    created_at: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isPetConfigOpen, setIsPetConfigOpen] = useState(false);
  const [petConfig, setPetConfig] = useState<AIPetConfigType | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const petConfigKey = `sparkbin_pet_config_${user?.id || 'guest'}`;

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/');
      return;
    }

    const loadUser = async () => {
      try {
        const data = await authApi.getMe();
        setUser(data);
        if (data.pet_config) {
          const config: AIPetConfigType = {
            type: data.pet_config.type as AIPetConfigType['type'],
            name: data.pet_config.name,
            personality: data.pet_config.personality as AIPetConfigType['personality'],
            verbosity: data.pet_config.verbosity as AIPetConfigType['verbosity'],
          };
          setPetConfig(config);
          localStorage.setItem(petConfigKey, JSON.stringify(config));
        } else {
          const saved = localStorage.getItem(petConfigKey);
          if (saved) setPetConfig(JSON.parse(saved));
        }
      } catch {
        showToast('加载用户信息失败', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [navigate, showToast, petConfigKey]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    onLogout();
    navigate('/');
  };

  const handleBindOAuth = (provider: 'google' | 'github') => {
    window.location.href = authApi.getOAuthBindUrl(provider);
  };

  const handleUnbindOAuth = async (provider: 'google' | 'github') => {
    try {
      await authApi.unbindOAuth(provider);
      setUser((prev) => prev ? { ...prev, oauth_provider: null, oauth_id: null } : null);
      showToast(`${provider} 账号已解绑`, 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '解绑失败';
      showToast(msg, 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  };

  const selectedPet = PET_OPTIONS.find(p => p.id === petConfig?.type) || PET_OPTIONS[0];
  const petColor = selectedPet.color;
  const petFrames = PIXEL_PET_CATALOG[petConfig?.type || 'cat'] || PIXEL_PET_CATALOG['cat'];
  const personality = PERSONALITY_OPTIONS.find(p => p.id === petConfig?.personality);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-brutal-bg text-brutal-text font-mono">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brutal-accent border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-brutal-muted">LOADING PROFILE...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-brutal-bg text-brutal-text font-mono">
        <div className="text-center">
          <p className="text-brutal-warning mb-4">无法加载用户资料</p>
          <button onClick={() => navigate('/')} className="btn-brutal">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-brutal-bg text-brutal-text font-mono">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`px-4 py-2 border-2 font-mono text-sm shadow-lg
              ${toast.type === 'success' ? 'border-brutal-success bg-brutal-bg text-brutal-success' : ''}
              ${toast.type === 'error' ? 'border-brutal-warning bg-brutal-bg text-brutal-warning' : ''}
              ${toast.type === 'info' ? 'border-brutal-accent bg-brutal-bg text-brutal-accent' : ''}
            `}
          >
            <div className="flex items-center gap-2">
              <span>{toast.message}</span>
              <button onClick={hideToast} className="text-xs opacity-60 hover:opacity-100">×</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b-2 border-brutal-border bg-brutal-surface sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-mono font-bold uppercase tracking-wider">
              个人资料
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-brutal-muted">
              {user.role === 'admin' ? '[ADMIN]' : '[USER]'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Account Overview */}
        <SectionCard title="账户概览" icon={User}>
          <InfoRow label="用户名" value={user.username} />
          <InfoRow
            label="邮箱"
            value={
              <span className="flex items-center gap-1">
                {user.email || '未设置'}
                {user.email_verified && (
                  <Shield className="w-3 h-3 text-brutal-success" />
                )}
              </span>
            }
          />
          <InfoRow label="注册时间" value={formatDate(user.created_at)} />
          <InfoRow
            label="支付功能"
            value={
              <span className={`uppercase ${user.enable_payments ? 'text-brutal-success' : 'text-brutal-muted'}`}>
                {user.enable_payments ? '已启用' : '已关闭'}
              </span>
            }
          />
        </SectionCard>

        {/* Quota */}
        <SectionCard title="配额信息" icon={Zap}>
          <InfoRow
            label="AI 额度"
            value={
              <span className={`font-mono ${user.quota.ai_credits <= 3 ? 'text-brutal-warning' : 'text-brutal-text'}`}>
                {user.quota.ai_credits} 次
              </span>
            }
          />
          <InfoRow
            label="累计消耗"
            value={`${user.quota.ai_credits_total_consumed} 次`}
          />
          <InfoRow
            label="项目数量"
            value={`${user.quota.projects_used} / ∞`}
          />
        </SectionCard>

        {/* Preferences */}
        <SectionCard title="偏好设置" icon={Palette}>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-mono text-brutal-muted uppercase">主题</span>
            <ThemeSwitcher />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-mono text-brutal-muted uppercase">首选 AI 模型</span>
            <ModelSelector />
          </div>
        </SectionCard>

        {/* Pet Config */}
        <SectionCard title="AI 宠物" icon={Cat}>
          {petConfig ? (
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 border-2 border-brutal-border flex items-center justify-center"
                style={{ backgroundColor: petColor }}
              >
                <PixelPet frames={petFrames} scale={2} animation="idle" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-mono font-bold">{petConfig.name || selectedPet.name}</div>
                <div className="text-xs font-mono text-brutal-muted">
                  {selectedPet.name} · {personality?.name || '温和'}
                </div>
              </div>
              <button
                onClick={() => setIsPetConfigOpen(true)}
                className="px-3 py-2 border border-brutal-border text-xs font-mono hover:bg-brutal-text hover:text-brutal-bg transition-colors"
              >
                配置
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-brutal-muted">尚未配置宠物</span>
              <button
                onClick={() => setIsPetConfigOpen(true)}
                className="px-3 py-2 border border-brutal-accent text-brutal-accent text-xs font-mono hover:bg-brutal-accent hover:text-brutal-bg transition-colors"
              >
                去配置
              </button>
            </div>
          )}
        </SectionCard>

        {/* OAuth Binding */}
        <SectionCard title="第三方账号" icon={Shield}>
          <div className="space-y-3">
            {/* Google */}
            <div className="flex items-center justify-between py-2 border-b border-brutal-border/50">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm font-mono">Google</span>
              </div>
              {user.oauth_provider === 'google' ? (
                <button
                  onClick={() => handleUnbindOAuth('google')}
                  className="px-3 py-1 border border-brutal-warning text-brutal-warning text-xs font-mono hover:bg-brutal-warning hover:text-brutal-bg transition-colors"
                >
                  解绑
                </button>
              ) : (
                <button
                  onClick={() => handleBindOAuth('google')}
                  className="px-3 py-1 border border-brutal-accent text-brutal-accent text-xs font-mono hover:bg-brutal-accent hover:text-brutal-bg transition-colors"
                >
                  绑定
                </button>
              )}
            </div>

            {/* GitHub */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span className="text-sm font-mono">GitHub</span>
              </div>
              {user.oauth_provider === 'github' ? (
                <button
                  onClick={() => handleUnbindOAuth('github')}
                  className="px-3 py-1 border border-brutal-warning text-brutal-warning text-xs font-mono hover:bg-brutal-warning hover:text-brutal-bg transition-colors"
                >
                  解绑
                </button>
              ) : (
                <button
                  onClick={() => handleBindOAuth('github')}
                  className="px-3 py-1 border border-brutal-accent text-brutal-accent text-xs font-mono hover:bg-brutal-accent hover:text-brutal-bg transition-colors"
                >
                  绑定
                </button>
              )}
            </div>

            {user.oauth_provider && (
              <div className="text-[10px] font-mono text-brutal-muted">
                当前已绑定: {user.oauth_provider}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Security */}
        <SectionCard title="安全设置" icon={Lock}>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-mono text-brutal-muted uppercase">密码</span>
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="px-3 py-2 border border-brutal-border text-xs font-mono hover:bg-brutal-text hover:text-brutal-bg transition-colors"
            >
              修改密码
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-mono text-brutal-muted uppercase">会话</span>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-3 py-2 border border-brutal-warning text-brutal-warning text-xs font-mono hover:bg-brutal-warning hover:text-brutal-bg transition-colors"
            >
              退出登录
            </button>
          </div>
        </SectionCard>
      </main>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onSuccess={() => setIsChangePasswordOpen(false)}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {isPetConfigOpen && (
        <AIPetConfig
          config={petConfig}
          onSave={async (config: AIPetConfigType) => {
            if (isAuthenticated()) {
              try {
                await authApi.updatePetConfig(config);
                setPetConfig(config);
                localStorage.setItem(petConfigKey, JSON.stringify(config));
                showToast('宠物配置已保存', 'success');
              } catch {
                showToast('保存失败', 'error');
              }
            } else {
              setPetConfig(config);
              localStorage.setItem(petConfigKey, JSON.stringify(config));
            }
          }}
          onClose={() => setIsPetConfigOpen(false)}
        />
      )}

      {/* Logout Confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm border-2 border-brutal-border bg-brutal-surface p-6">
            <h3 className="text-sm font-mono font-bold mb-4">确认退出登录？</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-brutal-bg text-brutal-text font-mono font-bold border-2 border-brutal-border hover:border-brutal-accent hover:text-brutal-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 bg-brutal-warning text-brutal-bg font-mono font-bold border-2 border-brutal-warning hover:bg-brutal-bg hover:text-brutal-warning transition-colors"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
