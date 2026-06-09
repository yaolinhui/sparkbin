import { useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { CustomNav } from '../../components/CustomNav';
import { BrutalButton } from '../../components/BrutalButton';
import { BrutalCard } from '../../components/BrutalCard';
import { authApi, clearToken } from '../../services/api';
import { useAuth, useTheme } from '../../stores/appStore';
import type { Theme } from '../../types';
import './index.scss';

export default function ProfilePage() {
  const { isLoggedIn, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (isLoggedIn && !user) {
      loadUser();
    }
  }, [isLoggedIn, user]);

  const loadUser = async () => {
    try {
      const data = await authApi.getMe();
      // 这里需要通过 dispatch 更新用户状态，但 useAuth 只提供 login/logout
      // 实际使用时需要在 api.ts 或 appStore 中补充 setUser 逻辑
      console.log('User loaded:', data);
    } catch {
      handleLogout();
    }
  };

  const handleLogout = () => {
    clearToken();
    logout();
    Taro.reLaunch({ url: '/pages/login/index' });
  };

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    Taro.setStorageSync('theme', newTheme);
    // 设置 page 属性以触发 CSS 变量切换
    // 小程序中通过重新设置 page 的 data-theme 属性
    // 实际需要在 app.tsx 或页面中处理
  };

  if (!isLoggedIn) {
    return (
      <View className="page-container">
        <CustomNav title="PROFILE" />
        <View className="brutal-empty" style={{ marginTop: '88rpx' }}>
          <Text className="empty-text">PLEASE LOGIN</Text>
          <BrutalButton className="mt-8" onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>
            GO TO LOGIN
          </BrutalButton>
        </View>
      </View>
    );
  }

  return (
    <View className="page-container">
      <CustomNav title="PROFILE" />
      <View style={{ marginTop: '88rpx', padding: '32rpx' }}>
        {/* 用户信息 */}
        <BrutalCard title="ACCOUNT">
          <View className="mb-2">
            <Text className="text-sm text-muted">USERNAME</Text>
            <Text className="text-base">{user?.username || '—'}</Text>
          </View>
          <View className="mb-2">
            <Text className="text-sm text-muted">EMAIL</Text>
            <Text className="text-base">{user?.email || '—'}</Text>
          </View>
          <View>
            <Text className="text-sm text-muted">ROLE</Text>
            <Text className="text-base uppercase">{user?.role || 'USER'}</Text>
          </View>
        </BrutalCard>

        {/* AI 额度 */}
        <BrutalCard className="mt-4" title="CREDITS">
          <View className="flex justify-between items-center">
            <View>
              <Text className="text-sm text-muted">AVAILABLE</Text>
              <Text className="text-2xl font-bold text-accent">
                {user?.quota?.aiCredits ?? 0}
              </Text>
            </View>
            <View>
              <Text className="text-sm text-muted">CONSUMED</Text>
              <Text className="text-base text-muted">
                {user?.quota?.aiCreditsTotalConsumed ?? 0}
              </Text>
            </View>
          </View>
        </BrutalCard>

        {/* 项目统计 */}
        <BrutalCard className="mt-4" title="PROJECTS">
          <View className="flex justify-between items-center">
            <Text className="text-sm text-muted">TOTAL PROJECTS</Text>
            <Text className="text-xl font-bold">{user?.quota?.projectsUsed ?? 0}</Text>
          </View>
        </BrutalCard>

        {/* 设置 */}
        <BrutalCard className="mt-4" title="SETTINGS">
          <View className="flex justify-between items-center py-3 border-b">
            <Text className="text-base">THEME</Text>
            <View
              className="brutal-badge badge-outline"
              onClick={toggleTheme}
            >
              <Text>{theme.toUpperCase()}</Text>
            </View>
          </View>
          <View className="flex justify-between items-center py-3">
            <Text className="text-base">PREFERRED MODEL</Text>
            <Text className="text-sm text-muted uppercase">
              {user?.preferredModel || 'DEFAULT'}
            </Text>
          </View>
        </BrutalCard>

        {/* 退出登录 */}
        <BrutalButton
          className="mt-6"
          variant="accent"
          block
          onClick={handleLogout}
        >
          LOGOUT
        </BrutalButton>
      </View>
    </View>
  );
}
