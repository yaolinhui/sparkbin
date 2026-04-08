# SparkBin 后端

基于 FastAPI + PostgreSQL 的 SparkBin 后端服务。

## 功能特性

- **认证系统**：JWT Token 认证，默认账号 admin/admin
- **项目管理**：完整的项目 CRUD，支持 6 个阶段流程
- **AI 代理**：统一接口支持 DeepSeek/Kimi/豆包，API Key 加密存储
- **数据持久化**：PostgreSQL 存储，支持软删除
- **操作日志**：完整的操作审计
- **流式响应**：AI 聊天支持 SSE 流式返回

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接
```

### 3. 创建数据库

```bash
# 使用 psql 或 pgAdmin 创建数据库
createdb sparkbin
```

### 4. 启动服务

```bash
python start.py
```

服务启动后访问：
- API: http://localhost:8000
- 文档: http://localhost:8000/docs

## 初始配置

1. 登录获取 Token：`POST /auth/login` (admin/admin)
2. 配置 AI API Key：`PUT /ai/configs/{provider}`
3. 开始使用其他接口

## 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 入口
│   ├── config.py        # 配置管理
│   ├── database.py      # 数据库连接
│   ├── models.py        # SQLAlchemy 模型
│   ├── schemas.py       # Pydantic 模型
│   ├── auth.py          # 认证工具
│   ├── encryption.py    # 加密工具
│   ├── routers/         # API 路由
│   │   ├── auth.py
│   │   ├── projects.py
│   │   ├── ai.py
│   │   └── admin.py
│   └── services/        # 业务逻辑
│       ├── ai_proxy.py
│       └── logger.py
├── alembic/             # 数据库迁移
├── requirements.txt
├── .env.example
└── start.py
```

## API 概览

### 认证
- `POST /auth/login` - 登录
- `POST /auth/logout` - 登出
- `GET /auth/me` - 获取当前用户
- `POST /auth/change-password` - 修改密码

### 项目
- `GET /projects` - 项目列表
- `POST /projects` - 创建项目
- `GET /projects/{id}` - 项目详情
- `PUT /projects/{id}` - 更新项目
- `DELETE /projects/{id}` - 删除项目
- `PUT /projects/{id}/stages/{stage}/content` - 更新阶段内容
- `POST /projects/{id}/stages/{stage}/complete` - 完成阶段

### AI
- `GET /ai/providers` - 获取可用 AI 提供商
- `GET /ai/configs` - 获取 AI 配置
- `PUT /ai/configs/{provider}` - 更新 AI 配置
- `POST /ai/chat` - 聊天（SSE 流式）
- `POST /ai/promote-suggest` - 生成推广建议

### 管理
- `GET /admin/logs` - 操作日志
