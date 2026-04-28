# SparkBin

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/yaolinhui/sparkbin)
[![License](https://img.shields.io/badge/license-Elastic%202.0-blue)](./LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](./SELF_HOSTING.md)

An AI-native project coach for indie hackers and vibe coders. **Validate before you build.** From idea to monetization in 6 structured stages.

[Live Demo](https://sparkbin.dev) · [Self-Hosting Guide](./SELF_HOSTING.md) · [Contributing](./CONTRIBUTING.md)

![Demo](docs/assets/demo.gif)

## Quick Start (Docker)

The fastest way to run SparkBin locally:

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

## Why SparkBin?

Most projects die because nobody wants them. SparkBin forces you to validate your idea through 6 stages before writing production code:

1. **Idea** — Capture and structure your concept with sticky notes (pain point, target user, use case, solution, differentiation)
2. **Validate** — Run real experiments: surveys, interviews, community posts, competitor analysis. GO/NO-GO decision gates prevent you from building the wrong thing
3. **Prototype** — Plan MVP features with P0/P1/P2 prioritization. Select platform (Web/iOS/Android/Desktop) and generate design prompts via AI
4. **Ship** — Track launch readiness, generate multi-platform marketing copy (Xiaohongshu, Twitter, ProductHunt), collect initial feedback
5. **Grow** — Manage content calendars across channels. Track channel performance and conversion rates
6. **Monetize** — Design pricing tiers, simulate Stripe checkout flows, track MRR and conversion funnels

## Features

- **Pixel Pet** — A pixel-art animated AI companion with idle/blink/happy/celebrate animations that coaches you through each stage. 10 pets, 4 personalities, config persists to database
- **Structured Validation** — Kanban-style validation board with GO/NO-GO gates and AI-powered validation suggestions (append or overwrite). No more "build first, validate never"
- **Brutalist UI** — Zero border-radius, high contrast, JetBrains Mono typography. Dark/Light theme with system preference detection. Landing page with grid dot pattern
- **Built-in Monetization Playground** — Test pricing models with real Stripe checkout flows (test mode). MRR tracking and conversion funnel visualization
- **GitHub Project Import** — Connect your GitHub account, select a public repository, and let AI analyze the README to suggest the right stage and pre-fill project fields
- **Local AI with Ollama** — Run AI completely offline. No API keys, no data leaving your server. Supports llama3.2, qwen2.5, and any Ollama-compatible model
- **7-Language Support** — Chinese, Japanese, Korean, Spanish, French, German, English (i18n with localStorage persistence)
- **Project Blueprint** — Health dashboard showing completion rates, blockers, overdue stages, timeline comparison, and actionable next steps
- **Multi-Auth** — Local JWT (with access/refresh token rotation), Google OAuth, GitHub OAuth, plus email registration with verification. Honeypot anti-bot protection on registration
- **Feature Gating** — Free/Pro/Team tiers with configurable limits (projects count, AI calls per month)
- **Security-First** — Rate limiting, password complexity enforcement, login audit logs, security response headers (CSP/HSTS)

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL (production) / SQLite (development)
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Zustand
- **AI Proxy**: DeepSeek, Kimi, Doubao, OpenAI, **Ollama** (unified backend proxy with encrypted key storage)
- **Payments**: Stripe Test Mode (optional)
- **Auth**: JWT with access/refresh token rotation, bcrypt, rate limiting, login audit logs, honeypot anti-bot
- **OAuth**: Google, GitHub (for login and project import)
- **Email**: Resend (optional, for registration/verification)
- **i18n**: 7 languages (Chinese, Japanese, Korean, Spanish, French, German, English)
- **Container**: Docker, Docker Compose, Nginx

## Screenshots

### Project Board
Terminal-style dashboard showing all projects with status filters (Active / Paused / Archived), metrics bar, and AI pet companion.

### Stage Editor — Idea Phase
Sticky-note wall with drag-and-drop sorting. Five dimensions: pain point, target user, use case, solution, differentiation. Color-coded notes with AI suggestion integration.

### Stage Editor — Validate Phase
Three-column kanban board (Pending / In Progress / Validated) with GO/NO-GO decision gates. Validation tools: surveys, interviews, community posts, competitor analysis.

### Stage Editor — Prototype Phase
Platform selector (Web / iOS / Android / Desktop), feature list with P0/P1/P2 prioritization, design prompt generation via AI.

### Stage Editor — Ship Phase
Launch readiness checklist, multi-platform copy generation (Xiaohongshu, Twitter, ProductHunt, V2EX, Jike), user feedback collection with star ratings.

### Stage Editor — Grow Phase
Weekly / monthly content calendar, channel performance panel (6 channels with conversion tracking), AI-generated content titles.

### Stage Editor — Monetize Phase
MRR dashboard, pricing tier cards, conversion funnel visualization, Stripe Test Mode checkout simulation.

> To add your own screenshots, run the app locally and capture each stage. Place images in `docs/assets/` and update the paths above.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting and security best practices.

## License

[Elastic License 2.0](./LICENSE)

You are free to use, modify, and self-host SparkBin. The Elastic License prevents cloud providers from offering SparkBin as a managed service without permission, protecting the project's sustainability while keeping it open for individual developers and small teams.
