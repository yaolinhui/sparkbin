# SparkBin

个人创意/点子管理工具，深度规划看板。

## 功能特性

- **两层状态系统**: 项目级（暂停/启用/归档）+ 阶段级（想法→调研→开发→完成→上线→宣传）
- **富文本编辑**: 基于 Tiptap 的所见即所得编辑器
- **AI 辅助对话**: 分屏界面，AI 引导思考并生成内容
- **流程可视化**: React Flow 展示项目阶段进度
- **后端数据持久化**: 使用 PostgreSQL 存储数据
- **AI 后端代理**: API Key 安全存储在后端
- **阶段锁定机制**: 完成阶段后锁定，确保进度可追溯

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Tiptap (富文本编辑)
- React Flow (流程图)
- Zustand (状态管理)
- React Router

### 后端
- Python + FastAPI
- PostgreSQL
- JWT 认证

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`:
```
VITE_API_URL=http://localhost:8000
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

## 后端启动

```bash
cd ../backend
pip install -r requirements.txt
python start.py
```

默认账号: `admin / admin`

## 数据存储

数据现在存储在 PostgreSQL 数据库中，通过后端 API 访问：

- 项目数据持久化在后端
- AI API Key 安全存储在后端
- 前端通过 JWT Token 认证
- 保留 GitHub 同步作为备份功能

## 项目边界

- 仅限个人使用，无协作功能
- 第一版仅适配桌面端
- 无数据导出功能
- 无提醒/通知功能
