export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/project-detail/index',
    'pages/ai-chat/index',
    'pages/agent-cockpit/index',
    'pages/profile/index',
    'pages/login/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0a0a0a',
    navigationBarTitleText: 'SparkBin',
    navigationBarTextStyle: 'white',
    backgroundColor: '#0a0a0a',
    navigationStyle: 'custom', // 自定义导航栏，保持 Brutalist 风格统一
  },
  tabBar: {
    color: '#666666',
    selectedColor: '#ffffff',
    backgroundColor: '#0a0a0a',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '项目',
      },
      {
        pagePath: 'pages/ai-chat/index',
        text: 'AI',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
      },
    ],
  },
});
