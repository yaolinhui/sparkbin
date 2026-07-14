<p align="center">
  <img src="docs/assets/banner.svg" alt="SparkBin Banner" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/yaolinhui/sparkbin/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen" alt="Build"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Elastic%202.0-blue" alt="License"></a>
  <a href="./SELF_HOSTING.md"><img src="https://img.shields.io/badge/docker-ready-blue" alt="Docker"></a>
  <a href="https://sparkbin.wanchun.me"><img src="https://img.shields.io/badge/live-demo-green" alt="Live Demo"></a>
  <br/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/DeepSeek-AI-orange" alt="DeepSeek">
</p>

<p align="center">
  <b>An AI-native project coach for indie hackers and vibe coders.</b><br/>
  Validate before you build. From idea to monetization in 6 structured stages.
</p>

<p align="center">
  <a href="https://sparkbin.wanchun.me"><b>Live Demo</b></a> ·
  <a href="./SELF_HOSTING.md">Self-Hosting Guide</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>

---

<!-- 核心演示动图 -->
<p align="center">
  <img src="docs/assets/demo-login-board.gif" alt="SparkBin Demo" width="90%" />
</p>

> <i><sub>演示动图需录制补充，参见 <a href="docs/assets/recording-guide.md">录制指南</a></sub></i>

## Why SparkBin?

> Most projects die because nobody wants them.

SparkBin forces you to **validate your idea through 6 structured stages** before writing production code. Each stage has AI-powered coaching, GO/NO-GO decision gates, and actionable deliverables.

```mermaid
graph LR
    A[Idea] -->|Validate| B[Validate]
    B -->|GO Gate| C[Prototype]
    C -->|GO Gate| D[Ship]
    D -->|GO Gate| E[Grow]
    E -->|GO Gate| F[Monetize]
```

## Features

| Feature | Description |
|---------|-------------|
| **6-Stage Framework** | Idea → Validate → Prototype → Ship → Grow → Monetize. GO/NO-GO gates prevent building the wrong thing. |
| **AI Project Coach** | DeepSeek-powered AI chat with streaming responses. Coaches you through each stage with context-aware suggestions. |
| **Pixel Pet Companion** | Animated pixel-art AI pet (10 types, 4 personalities) that reacts to your progress and coaches you along the way. |
| **Structured Validation** | Kanban-style validation board with surveys, interviews, community posts, and competitor analysis tools. |
| **Multi-Platform Launch** | Auto-generate marketing copy for Xiaohongshu, Twitter, ProductHunt, V2EX, Jike, and more. |
| **Monetization Playground** | Design pricing tiers, simulate Stripe checkout flows, track MRR and conversion funnels. |
| **GitHub Import** | Connect GitHub, select a repo, and let AI analyze the README to suggest the right stage and pre-fill project fields. |
| **Local AI (Ollama)** | Run AI completely offline with llama3.2, qwen2.5, or any Ollama-compatible model. No API keys needed. |
| **Multi-Auth** | Local JWT + Google OAuth + GitHub OAuth + email registration with verification and honeypot anti-bot protection. |
| **7 Languages** | Chinese, Japanese, Korean, Spanish, French, German, English with i18n support. |
| **Brutalist UI** | Zero border-radius, high contrast, JetBrains Mono typography. Dark/Light theme with system preference detection. |

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/yaolinhui/sparkbin.git
cd sparkbin
cp .env.example .env
# Edit .env: set SECRET_KEY, ENCRYPTION_KEY, DEFAULT_PASSWORD
docker compose up -d
# Open http://localhost
# Login: admin / your-DEFAULT_PASSWORD
```

See [SELF_HOSTING.md](./SELF_HOSTING.md) for manual setup, production deployment, and Ollama local AI configuration.

## Screenshots

<!-- 六阶段截图网格 -->
<p align="center">
  <img src="docs/assets/screenshot-idea.png" alt="Idea Stage" width="48%" />
  <img src="docs/assets/screenshot-validate.png" alt="Validate Stage" width="48%" />
</p>
<p align="center">
  <i>Idea & Validate Stages — 截图待补充，参见 <a href="docs/assets/recording-guide.md">录制指南</a></i>
</p>

<p align="center">
  <img src="docs/assets/screenship-prototype.png" alt="Prototype Stage" width="48%" />
  <img src="docs/assets/screenshot-ship.png" alt="Ship Stage" width="48%" />
</p>
<p align="center">
  <i>Prototype & Ship Stages — 截图待补充</i>
</p>

## Architecture

```mermaid
graph TB
    User[<img src='https://cdn.jsdelivr.net/gh/devicons/devicon/icons/chrome/chrome-original.svg' width='20'/> User Browser]
    -->|HTTPS| Nginx[Nginx Reverse Proxy]
    Nginx -->|Proxy Pass| FastAPI[FastAPI Backend]
    FastAPI -->|SQLAlchemy| Postgres[(PostgreSQL)]
    FastAPI -->|HTTP| DeepSeek[DeepSeek API]
    FastAPI -->|HTTP| Google[Google OAuth]
    FastAPI -->|HTTP| GitHub[GitHub API]
    
    subgraph "Docker Compose"
        Nginx
        FastAPI
        Postgres
    end
    
    style FastAPI fill:#009688,color:#fff
    style Postgres fill:#4169E1,color:#fff
    style Nginx fill:#009639,color:#fff
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Zustand |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic |
| **Database** | PostgreSQL (production) / SQLite (development) |
| **AI** | DeepSeek, Kimi, Doubao, OpenAI, Ollama (unified proxy) |
| **Auth** | JWT with refresh token rotation, bcrypt, rate limiting, honeypot |
| **Payments** | Stripe Test Mode (optional) |
| **Email** | Resend (optional) |
| **i18n** | 7 languages with localStorage persistence |
| **Deploy** | Docker, Docker Compose, Nginx |

## AI Chat Demo

<p align="center">
  <img src="docs/assets/demo-ai-chat.gif" alt="AI Chat Demo" width="80%" />
</p>

> <i><sub>AI 聊天演示动图需录制补充，参见 <a href="docs/assets/recording-guide.md">录制指南</a></sub></i>

## Roadmap

- [x] 6-stage project framework
- [x] AI chat with streaming
- [x] Pixel Pet companion
- [x] Multi-auth (JWT, Google, GitHub, Email)
- [x] GitHub project import
- [x] Local AI (Ollama)
- [x] i18n (7 languages)
- [x] Stripe payment simulation
- [ ] Mobile App (React Native)
- [ ] Team collaboration
- [ ] Public project gallery

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting and security best practices.

## License

[Elastic License 2.0](./LICENSE)

You are free to use, modify, and self-host SparkBin. The Elastic License prevents cloud providers from offering SparkBin as a managed service without permission, protecting the project's sustainability while keeping it open for individual developers and small teams.
