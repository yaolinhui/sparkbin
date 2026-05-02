import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Shield, Cat, Lock, Palette,
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
    role: string;
    preferred_model: string | null;
    pet_config: { type: string; name: string; personality: string; verbosity: string } | null;
    theme_preference: string | null;
    require_password_change: boolean;
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
            value={user.email || '未设置'}
          />
          <InfoRow label="注册时间" value={formatDate(user.created_at)} />
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
