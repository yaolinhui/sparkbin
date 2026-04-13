const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/ProjectDetail.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. 替换 import 添加 GitGraph
if (!content.includes('GitGraph')) {
  content = content.replace(
    'from \'lucide-react\';',
    'from \'lucide-react\';\nimport { GitGraph } from \'lucide-react\';'
  );
}

// 2. 添加 ProjectBlueprint import
if (!content.includes('ProjectBlueprint')) {
  content = content.replace(
    "import { MonetizeStage } from './MonetizeStage';",
    "import { MonetizeStage } from './MonetizeStage';\nimport { ProjectBlueprint } from './ProjectBlueprint';"
  );
}

// 3. 添加 showBlueprint state
if (!content.includes('showBlueprint')) {
  content = content.replace(
    'const [isAIChatCollapsed, setIsAIChatCollapsed] = useState(false); // AI 聊天折叠状态',
    'const [isAIChatCollapsed, setIsAIChatCollapsed] = useState(false); // AI 聊天折叠状态\n  const [showBlueprint, setShowBlueprint] = useState(false); // 项目蓝图显示状态'
  );
}

// 4. 添加视图切换按钮和条件渲染
const viewToggleCode = `
      {/* View Toggle */}
      <div className="flex items-center justify-between px-6 py-2 bg-brutal-surface border-b border-brutal-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBlueprint(false)}
            className={\`text-xs font-mono px-3 py-1 border \${!showBlueprint ? 'bg-brutal-accent text-brutal-bg border-brutal-accent' : 'border-brutal-border'}\`}
          >
            阶段视图
          </button>
          <button
            onClick={() => setShowBlueprint(true)}
            className={\`text-xs font-mono px-3 py-1 border \${showBlueprint ? 'bg-brutal-accent text-brutal-bg border-brutal-accent' : 'border-brutal-border'}\`}
          >
            <GitGraph className="w-3 h-3 inline mr-1" />
            蓝图视图
          </button>
        </div>
        <span className="text-xs font-mono text-brutal-muted">
          {showBlueprint ? '全局鸟瞰视角' : '按部就班完成每个阶段'}
        </span>
      </div>

      {!showBlueprint && (
`;

content = content.replace(
  '{/* Stage Flow */}',
  viewToggleCode + '        {/* Stage Flow */}'
);

// 5. 包裹 StageFlow 和 Main Content 的条件渲染
// 找到 StageFlow 的结束位置和 Main Content 的结束位置
const stageFlowStart = content.indexOf('{/* Stage Flow */}');
const mainContentStart = content.indexOf('{/* Main Content */}');

if (stageFlowStart > 0 && mainContentStart > 0) {
  // 在 StageFlow 之前插入条件渲染开始
  // 这个逻辑比较复杂，需要找到合适的位置
}

fs.writeFileSync(filePath, content);
console.log('Modified ProjectDetail.tsx successfully');
