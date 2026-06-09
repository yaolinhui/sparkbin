import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { AppProvider } from './stores/appStore';
import './app.scss';

function App({ children }) {
  useEffect(() => {
    // 获取系统信息并设置 CSS 变量
    const sysInfo = Taro.getSystemInfoSync();
    const statusBarHeight = sysInfo.statusBarHeight || 0;
    const menuButtonInfo = Taro.getMenuButtonBoundingClientRect ? Taro.getMenuButtonBoundingClientRect() : null;

    // 计算导航栏高度：状态栏 + 胶囊按钮区域
    let navHeight = 96;
    if (menuButtonInfo) {
      navHeight = (menuButtonInfo.top - statusBarHeight) * 2 + menuButtonInfo.height;
    }

    // 写入 page 的 CSS 变量
    const style = document.documentElement.style;
    if (style) {
      style.setProperty('--status-bar-height', `${statusBarHeight * 2}rpx`);
      style.setProperty('--nav-height', `${navHeight * 2}rpx`);
    }

    // 加载 JetBrains Mono 字体
    Taro.loadFontFace({
      family: 'JetBrainsMono',
      source: 'url("https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@v2.304/web/woff2/JetBrainsMono-Regular.woff2")',
      scopes: ['webview', 'native'],
      success: () => console.log('[Font] JetBrains Mono loaded'),
      fail: (err) => console.warn('[Font] Failed to load JetBrains Mono:', err),
    });

    Taro.loadFontFace({
      family: 'JetBrainsMono',
      source: 'url("https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@v2.304/web/woff2/JetBrainsMono-Bold.woff2")',
      scopes: ['webview', 'native'],
      success: () => console.log('[Font] JetBrains Mono Bold loaded'),
      fail: (err) => console.warn('[Font] Failed to load JetBrains Mono Bold:', err),
    });

    // 初始化主题
    const theme = Taro.getStorageSync('theme') || 'dark';
    Taro.setStorageSync('theme', theme);
  }, []);

  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}

export default App;
