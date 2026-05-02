# PixelPetCompanion 像素宠物伙伴组件重构 — 技术指示词

## 一、背景与问题

当前 `PetHabitat` 组件（160px 宽的大框"栖息地"）因两个核心问题被弃用：
1. **面积过大**：160px 的硬边框矩形在右下角视觉重量过重，与"点缀"定位矛盾。
2. **内容空洞**：框内除宠物外，天空光点（opacity 0.2~0.5）和地面条纹（opacity 0.3）几乎不可见，导致"大框套小内容"的空虚感。

用户明确要求回归**紧凑的"伙伴"式设计**——宠物独立显示，配以极简台词气泡和草地平台点缀。宠物是整个界面中唯一"活的、暖的、有灵性"的元素，与 Brutalist 主风格形成"死/活"对比。

## 二、设计目标

- **小巧精致**：整体占地控制在约 100×160px（含气泡），不争夺主界面注意力。
- **信息密度高**：每一寸空间都有意义，没有"留白焦虑"。
- **场景感保留**：宠物脚下有极简草地平台，增强"站立感"而非"悬浮感"。
- **台词自然浮现**：像游戏 NPC 对话框，打字机逐字显示，几秒后自动淡出。
- **交互反馈明确**：Hover、单击、双击都有清晰的视觉响应。

## 三、组件架构

### 3.1 文件变更

| 动作 | 路径 | 说明 |
|------|------|------|
| 新建 | `frontend/src/components/PixelPetCompanion.tsx` | 主组件 |
| 删除 | `frontend/src/components/PetHabitat.tsx` | 旧大框栖息地 |
| 修改 | `frontend/src/components/ProjectBoard.tsx` | 替换组件引用 |
| 可选修改 | `frontend/src/index.css` | 调整动画幅度适配更大 scale |

### 3.2 Props 接口

```typescript
interface PixelPetCompanionProps {
  petFrames: PixelPetFrames;
  petName: string;
  personality?: string;
  dialogue: string;
  onPetClick: () => void;
  onPetDoubleClick: () => void;
  isBouncing?: boolean;
}
```

### 3.3 整体布局

```
fixed bottom-6 right-6 z-40
  └─ flex flex-col items-center
       ├─ 台词气泡（上方，右对齐，向左展开）
       ├─ 宠物主体（中间，约 80×80px）
       └─ 草地平台（下方，约 100×12px）
```

**间距规范**：
- 气泡与宠物间距：`gap-2`（8px）
- 宠物与平台间距：`gap-1`（4px）

## 四、台词气泡详细设计

### 4.1 显示/隐藏时序（核心状态机）

```
dialogue 变化（由父组件传入）
└── 如果新 dialogue 非空且与上次不同：
    ├── 阶段 1：重置
    │   ├── clearInterval(typingTimer) — 中断正在进行的打字
    │   ├── clearTimeout(hideTimer) — 取消即将执行的隐藏
    │   ├── setIsVisible(true)
    │   ├── setOpacity(1) — 立即完全不透明
    │   ├── setDisplayedText('')
    │   └── setIsTyping(true)
    ├── 阶段 2：打字机
    │   └── setInterval(30ms) 逐字追加 displayedText
    │       └── 当 index >= dialogue.length：
    │           ├── clearInterval(typingTimer)
    │           ├── setIsTyping(false)
    │           └── 进入阶段 3
    ├── 阶段 3：驻留倒计时
    │   └── setTimeout(8000ms)
    │       └── 进入阶段 4
    └── 阶段 4：淡出
        ├── setOpacity(0) — CSS transition 500ms
        └── transitionend 事件 → setIsVisible(false)

特殊情况：
- dialogue 变为空字符串 → 立即清除所有 timer，setIsVisible(false)
- 淡出过程中收到新 dialogue → 立即中断淡出（setOpacity(1)），从阶段 1 重新开始
```

### 4.2 视觉样式

- **尺寸**：`max-w-[220px]`, `min-w-[120px]`，高度自适应内容
- **背景**：`bg-brutal-surface/90`（90% 不透明，保证可读性）
- **边框**：`border border-brutal-border`（1px 实线）
- **圆角**：`0`（严格 Brutalist，零圆角）
- **内边距**：`px-3 py-2`
- **文字**：`text-[10px] font-mono leading-relaxed`
- **文字颜色**：`var(--brutal-text)`
- **定位**：气泡容器 `self-end`（右对齐），即气泡右侧与宠物右侧对齐，向左展开，避免超出视口

### 4.3 对话框尾巴（指向宠物）

位于气泡右下角，指向宠物头顶偏右位置：

```tsx
<div
  className="absolute -bottom-[5px] right-6 w-0 h-0"
  style={{
    borderLeft: '5px solid transparent',
    borderRight: '5px solid transparent',
    borderTop: '5px solid var(--brutal-border)',
  }}
/>
```

### 4.4 打字机光标

- 仅在 `isTyping === true` 时显示
- 样式：`<span className="inline-block w-[3px] h-[10px] ml-[2px] align-middle bg-brutal-accent animate-blink" />`
- `animate-blink` 已存在于 `index.css` 中

### 4.5 淡出过渡

气泡最外层容器：
```tsx
<div
  className="... transition-opacity duration-500"
  style={{ opacity: isVisible ? bubbleOpacity : 0 }}
>
```

**注意**：不能用 `hidden` 或条件渲染来直接移除 DOM，因为需要 `transitionend` 事件。正确做法是用 `opacity` 过渡 + `pointer-events-none`（当 opacity 为 0 时），并在 `transitionend` 后设置 `display: none` 或条件移除。

更简洁的做法：用 `opacity` 控制可见度，当 opacity 为 0 时附加 `pointer-events-none` 避免遮挡点击，不需要真的从 DOM 移除。

## 五、宠物主体详细设计

### 5.1 尺寸

- `PixelPet` 组件 `scale={2.5}`
- 原始帧约 32×32 像素，渲染后约 **80×80px**
- `shapeRendering="crispEdges"` 保持像素锐度

### 5.2 动画

- **呼吸动画**：`animate-pet-breathe`
  - 周期：3s
  - 幅度：`translateY(-3px)`（因 scale 增大，从原来的 -2px 微调为 -3px）
  - 缓动：`ease-in-out`
- **点击弹跳**：`animate-pet-bounce`
  - 时长：300ms
  - 幅度：`translateY(-12px)`（从 -10px 微调）
  - 缓动：`ease-out`

### 5.3 交互

- 单击：触发 `onPetClick()` + 激活弹跳动画（由父组件的 `isBouncing` prop 控制）
- 双击：触发 `onPetDoubleClick()`（打开配置面板）
- Hover：整体（宠物+平台）向上浮动 2px，`transition-transform duration-200`

## 六、草地平台详细设计

### 6.1 定位与尺寸

- 宽度：`100px`（略宽于 80px 宠物，给呼吸动画留边距）
- 高度：`12px`
- 位于宠物正下方，间距 4px

### 6.2 视觉元素

草地平台由以下纯 CSS 元素组成，**禁止用图片**：

1. **地平线**：底部 1px 实线，颜色 `var(--brutal-border)`，宽度 100%
2. **土壤层**：地平线之上 2px，颜色 `var(--brutal-surface)`（与背景融合，不抢眼）
3. **像素草**（3 株，错落有致）：
   - 草 1：宽 2px，高 3px，`left: 18px`，底部对齐地平线，颜色 `var(--brutal-success)`
   - 草 2：宽 2px，高 5px，`left: 44px`，底部对齐地平线，颜色 `var(--brutal-success)`
   - 草 3：宽 2px，高 3px，`left: 72px`，底部对齐地平线，颜色 `var(--brutal-success)`

草的实现方式：使用绝对定位的 `div`，每个草是一个细长的矩形。不用 border-radius，保持像素感。

### 6.3 颜色说明

`var(--brutal-success)` 是主题定义的绿色系 CSS 变量，与项目成功状态色一致。草地使用这个颜色是为了让宠物平台成为项目"成功/完成"情绪的自然延伸，而非突兀的自然绿。

## 七、ProjectBoard.tsx 修改要点

1. **移除导入**：`import { PetHabitat } from './PetHabitat'`
2. **新增导入**：`import { PixelPetCompanion } from './PixelPetCompanion'`
3. **替换 JSX**：将原有的 `<PetHabitat ... />` 块替换为：
   ```tsx
   <PixelPetCompanion
     petFrames={petFrames}
     petName={petName}
     personality={petConfig?.personality}
     dialogue={petDialogue}
     onPetClick={handlePetClick}
     onPetDoubleClick={() => setIsPetConfigOpen(true)}
     isBouncing={isPetBouncing}
   />
   ```
4. **保留所有现有逻辑**：
   - `handlePetClick` 的 dialogue 生成逻辑
   - `isPetBouncing` 的 300ms 定时器逻辑
   - `petDialogue` 的状态管理
   - 全部不变

## 八、CSS 动画调整（index.css）

如果现有动画参数不适用于 scale=2.5 的宠物，需微调：

```css
@keyframes pet-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); } /* 原 -2px */
}

@keyframes pet-bounce {
  0% { transform: translateY(0); }
  40% { transform: translateY(-12px); } /* 原 -10px */
  100% { transform: translateY(0); }
}
```

## 九、边界情况与防御式编程

1. **组件卸载**：`useEffect` 返回函数必须清理 `typingTimer`、`hideTimer`、`transitionend` 监听器。
2. **快速连续点击**：用户连续单击宠物时，`isBouncing` 由父组件控制（300ms 后自动重置），组件本身不管理弹跳状态，只读取 prop。
3. **空 dialogue**：当 `dialogue` 为空字符串时，气泡完全不渲染，不启动任何 timer。
4. ** dialogue 快速变化**：typing 过程中收到新 dialogue，立即中断当前打字，从头开始新打字。
5. **淡出期间新 dialogue**：中断淡出动画，opacity 立即回到 1，重新开始打字+计时。
6. **长台词溢出**：`max-w-[220px]` + `break-words` 确保长文本自动换行，不撑破气泡。

## 十、禁止事项

- **禁止**使用 `backdrop-blur`（小元素不需要，且和主 Brutalist 风格冲突）。
- **禁止**使用圆角（`border-radius` 必须为 0，保持 Brutalist 直角）。
- **禁止**使用图片素材（草地、宠物、气泡全部用 CSS/SVG）。
- **禁止**添加天空、星星、云朵等虚浮装饰（用户已明确拒绝大框场景）。
- **禁止**修改父组件 ProjectBoard 的任何状态逻辑（仅做组件替换）。

## 十一、验收标准

- [ ] PixelPetCompanion.tsx 编译无 TypeScript 错误。
- [ ] PetHabitat.tsx 已删除，无残留引用。
- [ ] ProjectBoard.tsx 正常渲染，宠物显示在右下角。
- [ ] 宠物 scale=2.5，呼吸和弹跳动画正常。
- [ ] 台词气泡打字机效果正常，8 秒后自动淡出。
- [ ] 草地平台可见，3 株像素草颜色为主题绿。
- [ ] 单击弹跳 + 双击打开配置面板功能正常。
- [ ] Vite build 成功。
- [ ] E2E auth.setup.ts 通过（已修复，不应 regress）。
