# Prompt: Pixel Glass Habitat（像素玻璃栖息地）实现

## 背景
ProjectBoard 首页右下角当前使用「彩色圆角气泡 + 64×64 按钮」展示 AI 宠物。气泡风格（rounded-2xl、糖果色）与项目整体 Brutalist 设计语言冲突，且 4.5 秒自动消失导致阅读焦虑。用户希望给宠物一个「家」的感觉，同时不占用额外空间。

## 目标
将宠物展示区域改造为「Pixel Glass Habitat」—— 一个融合 Brutalist 骨架、Glassmorphism 肌肤、像素灵魂的微缩栖息地。

## 视觉规格

### 尺寸与定位
- 固定定位：`fixed bottom-6 right-6`
- 卡片尺寸：宽度 160px，高度自适应（最小 120px，最大 150px）
- 不遮挡主要内容，半透明背景保证背后内容可见

### 三层材质
1. **外壳（Brutalist）**
   - 零圆角（`rounded-none` 或默认）
   - 2px 硬边框（`border-2 border-brutal-border`）
   - 4px 硬阴影（`box-shadow: 4px 4px 0 var(--brutal-text)`）
   - 等宽字体全局使用

2. **主体（Glassmorphism）**
   - `backdrop-filter: blur(12px)`
   - 暗色主题底色：`rgba(0, 0, 0, 0.2)`
   - 亮色主题底色：`rgba(255, 255, 255, 0.35)`
   - 内阴影边缘光：`inset 0 1px 0 rgba(255,255,255,0.1)`

3. **内部（像素场景）**
   - **天空区**：占卡片上部 60%，使用 CSS `radial-gradient` 散布 1-2px 半透明光点（模拟像素星星/灰尘）
   - **地面区**：占卡片下部 15%，使用 `repeating-linear-gradient(90deg, ...)` 生成 1px 横纹（模拟像素草地/地板），暗色主题用 `rgba(255,255,255,0.15)`，亮色主题用 `rgba(0,0,0,0.1)`
   - **分隔线**：天空与地面之间用 `border-t-2 border-brutal-border/30`

### 宠物展示
- 宠物站在「地面」上，居中显示
- 呼吸动画：CSS `@keyframes` 实现 `translateY(-2px)` ↔ `translateY(0)`，周期 3s，ease-in-out，无限循环
- 宠物尺寸：scale=2（和当前一致）

### 台词区
- 位于卡片最底部，地面之下
- 背景：`bg-brutal-surface/80`（半透明面板）
- 文字：等宽字体，`text-xs`，颜色 `var(--brutal-text)`
- **打字机效果**：台词逐字显示，每字 30ms
- **常驻显示**：不自动消失，点击宠物换一句时重新打字
- 最大高度限制：最多 3 行，超出截断

### 性格装饰
- 保留当前右上角性格图标（PERSONALITY_OPTIONS）
- 位置调整为卡片右上角外侧或内侧左上角

## 交互规格

| 动作 | 效果 |
|------|------|
| 单击宠物 | 宠物弹跳动画（CSS `transform: translateY(-8px)` 200ms ease-out）+ 触发 `onPetClick`（换台词） |
| 双击宠物 | 触发 `onPetDoubleClick`（打开 AIPetConfig 配置面板） |
| Hover 卡片 | 边框颜色过渡为 `var(--brutal-accent)`，过渡时间 200ms |
| 台词更新 | 新台词逐字打字显示，旧台词清空后重新开始 |

## 技术约束

- **新建文件**：`frontend/src/components/PetHabitat.tsx`
- **修改文件**：`frontend/src/components/ProjectBoard.tsx`（替换宠物渲染区域）
- **零图片资源**：所有纹理和效果纯 CSS 实现
- **主题适配**：使用 CSS 变量，暗色/亮色切换时自动适配
- **命名导出**：`export function PetHabitat`
- **TypeScript**：使用 interface 定义 Props
- **可访问性**：按钮保留 `type="button"`，title 提示双击配置

## Props 接口

```typescript
interface PetHabitatProps {
  petFrames: PixelPetFrames;
  petName: string;
  petColor: string;
  personality?: string;
  dialogue: string;
  onPetClick: () => void;
  onPetDoubleClick: () => void;
  isBouncing?: boolean;
}
```

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `frontend/src/components/PetHabitat.tsx` | 像素玻璃栖息地组件 |
| 修改 | `frontend/src/components/ProjectBoard.tsx` | 移除旧气泡+按钮代码，引入 PetHabitat |

## 验收标准

- [ ] 视觉上符合「像素玻璃栖息地」设计（Brutalist 边框 + Glassmorphism 背景 + 像素场景）
- [ ] 宠物有呼吸浮动动画
- [ ] 单击宠物触发弹跳动画并更新台词（打字机效果）
- [ ] 双击宠物打开配置面板
- [ ] 台词常驻显示，不自动消失
- [ ] 暗色/亮色主题下玻璃效果和地面纹理都正常
- [ ] 构建无 TypeScript 错误
- [ ] Playwright E2E 测试通过

## 风格参考

```
┌────────────────────────┐
│ ·  ·    ·        ·  ·  │  ← 玻璃质感半透明背景 + 像素光点
│    ·         ·         │
│       [像素宠物]        │  ← 呼吸浮动
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← 像素地面横纹
│ ────────────────────── │
│ "喵～今天也要加油！"    │  ← 打字机台词
└────────────────────────┘
  ↑ 2px硬边框 + 4px硬阴影
```
