import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { CustomNav } from '../../components/CustomNav';
import { BrutalButton } from '../../components/BrutalButton';
import { BrutalInput } from '../../components/BrutalInput';
import { authApi, setToken, setRefreshToken } from '../../services/api';
import { useAuth } from '../../stores/appStore';
import './index.scss';

type LoginMode = 'wechat' | 'password';

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<LoginMode>('wechat');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWechatLogin = async () => {
    setLoading(true);
    try {
      const { code } = await Taro.login();
      const data = await authApi.wechatLogin({ code });

      setToken(data.access_token);
      setRefreshToken(data.refresh_token);

      // 获取用户信息
      const me = await authApi.getMe();
      const user = {
        id: me.id,
        username: me.username,
        email: me.email,
        emailVerified: me.email_verified,
        avatarUrl: me.avatar_url,
        role: me.role,
        preferredModel: me.preferred_model,
        themePreference: me.theme_preference,
        quota: {
          aiCredits: me.quota.ai_credits,
          aiCreditsTotalConsumed: me.quota.ai_credits_total_consumed,
          projectsUsed: me.quota.projects_used,
          projectsLimit: me.quota.projects_limit,
        },
        createdAt: me.created_at,
      };

      login(data.access_token, user);

      if (data.is_new_user) {
        Taro.showModal({
          title: 'WELCOME',
          content: 'New account created! You can set a password in Profile.',
          showCancel: false,
          success: () => {
            Taro.switchTab({ url: '/pages/index/index' });
          },
        });
      } else {
        Taro.switchTab({ url: '/pages/index/index' });
      }
    } catch (err: any) {
      Taro.showToast({ title: err.message || 'Login failed', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Taro.showToast({ title: '请输入用户名和密码', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.login({ username, password });
      setToken(data.access_token);
      setRefreshToken(data.refresh_token);

      const me = await authApi.getMe();
      const user = {
        id: me.id,
        username: me.username,
        email: me.email,
        emailVerified: me.email_verified,
        avatarUrl: me.avatar_url,
        role: me.role,
        preferredModel: me.preferred_model,
        themePreference: me.theme_preference,
        quota: {
          aiCredits: me.quota.ai_credits,
          aiCreditsTotalConsumed: me.quota.ai_credits_total_consumed,
          projectsUsed: me.quota.projects_used,
          projectsLimit: me.quota.projects_limit,
        },
        createdAt: me.created_at,
      };

      login(data.access_token, user);
      Taro.switchTab({ url: '/pages/index/index' });
    } catch (err: any) {
      Taro.showToast({ title: err.message || 'Login failed', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="page-container flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      <CustomNav title="LOGIN" />

      <View className="w-full px-8" style={{ marginTop: '88rpx' }}>
        {/* Logo / 标题 */}
        <View className="text-center mb-12">
          <Text className="text-3xl font-bold uppercase" style={{ letterSpacing: '4rpx' }}>
            SPARKBIN
          </Text>
          <Text className="text-sm text-muted mt-2 block">AI PROJECT COACH</Text>
        </View>

        {/* 登录模式切换 */}
        <View className="flex border mb-6">
          <View
            className={`flex-1 py-3 text-center ${mode === 'wechat' ? 'bg-fg text-bg' : ''}`}
            onClick={() => setMode('wechat')}
          >
            <Text className="text-sm uppercase">WeChat</Text>
          </View>
          <View
            className={`flex-1 py-3 text-center ${mode === 'password' ? 'bg-fg text-bg' : ''}`}
            onClick={() => setMode('password')}
          >
            <Text className="text-sm uppercase">Account</Text>
          </View>
        </View>

        {mode === 'wechat' ? (
          <View>
            <Text className="text-sm text-muted text-center mb-6">
              One-click login with your WeChat account
            </Text>
            <BrutalButton
              variant="primary"
              block
              onClick={handleWechatLogin}
              disabled={loading}
            >
              {loading ? '...' : 'WECHAT LOGIN'}
            </BrutalButton>
          </View>
        ) : (
          <View>
            <View className="mb-4">
              <Text className="text-sm text-muted uppercase mb-2">Username</Text>
              <BrutalInput
                value={username}
                onInput={setUsername}
                placeholder="Enter username"
              />
            </View>
            <View className="mb-6">
              <Text className="text-sm text-muted uppercase mb-2">Password</Text>
              <BrutalInput
                value={password}
                onInput={setPassword}
                placeholder="Enter password"
                password
              />
            </View>
            <BrutalButton
              variant="primary"
              block
              onClick={handlePasswordLogin}
              disabled={loading}
            >
              {loading ? '...' : 'LOGIN'}
            </BrutalButton>
          </View>
        )}
      </View>
    </View>
  );
}
