# SparkBin 截图/动图录制指南

为了让 GitHub 仓库更吸引人，建议补充以下视觉素材。使用 [Screen Studio](https://www.screen.studio/) (Mac) 或 [ShareX](https://getsharex.com/) (Windows) 或 [LICEcap](https://www.cockos.com/licecap/) 录制 GIF。

## 必须录制的核心动图

### 1. 首页登录 + 项目看板 (`docs/assets/demo-login-board.gif`)
- **时长**: 8-10 秒
- **内容**: 打开首页 → 点击登录 → 输入账号密码 → 进入项目看板 → 展示 Pixel Pet 动画
- **目的**: 展示第一印象和核心交互

### 2. AI 聊天演示 (`docs/assets/demo-ai-chat.gif`)
- **时长**: 12-15 秒
- **内容**: 进入项目 → 打开 AI 聊天 → 输入"帮我分析这个创意的可行性" → 展示 AI 流式回复 + 宠物互动
- **目的**: 展示核心 AI 能力

### 3. 六阶段工作流 (`docs/assets/demo-stages.gif`)
- **时长**: 15-20 秒
- **内容**: Idea 阶段写便利贴 → Validate 阶段拖拽看板 → Ship 阶段生成推广文案 → 点击完成阶段
- **目的**: 展示产品方法论

### 4. OAuth 登录 (`docs/assets/demo-oauth.gif`)
- **时长**: 6-8 秒
- **内容**: 点击 Google 登录 → 授权 → 成功跳转回应用
- **目的**: 展示多认证方式

## 必须补充的静态截图

| 文件名 | 场景 | 尺寸建议 |
|--------|------|---------|
| `screenshot-idea.png` | Idea 阶段便利贴墙 | 1440x900 |
| `screenshot-validate.png` | Validate 阶段看板 + GO/NO-GO 决策门 | 1440x900 |
| `screenshot-prototype.png` | Prototype 阶段功能列表 + P0/P1/P2 | 1440x900 |
| `screenshot-ship.png` | Ship 阶段推广文案生成器 | 1440x900 |
| `screenshot-monetize.png` | Monetize 阶段 MRR 仪表盘 | 1440x900 |
| `screenshot-dark-light.png` | 暗色/亮色主题切换对比 | 1440x900 |
| `screenshot-mobile.png` | 移动端响应式效果 | 375x812 |

## 录制技巧

1. **浏览器**: 使用 Chrome，按 F11 全屏，只保留标签栏和地址栏
2. **分辨率**: 1440x900 或 1920x1080（太高会导致 GIF 文件过大）
3. **光标**: 放大光标（Chrome DevTools 设置或系统设置）
4. **帧率**: GIF 10-15 fps 即可，文件大小控制在 2MB 以内
5. **背景**: 使用纯色桌面背景，不要露出私人文件

## 文件放置

所有素材放入 `docs/assets/` 目录，README 中已预留对应引用位置。
