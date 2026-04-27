# SparkBin

An AI-native project coach for indie hackers and vibe coders. **Validate before you build.** From idea to monetization in 6 structured stages.

[Live Demo](https://sparkbin.dev) · [Self-Hosting Guide](./SELF_HOSTING.md) · [Contributing](./CONTRIBUTING.md)

![Demo](docs/assets/demo.gif)

## Why SparkBin?

Most projects die because nobody wants them. SparkBin forces you to validate your idea through 6 stages before writing production code:

1. **Idea** — Capture and structure your concept with sticky notes (pain point, target user, use case, solution, differentiation)
2. **Validate** — Run real experiments: surveys, interviews, community posts, competitor analysis. GO/NO-GO decision gates prevent you from building the wrong thing
3. **Prototype** — Plan MVP features with P0/P1/P2 prioritization. Select platform (Web/iOS/Android/Desktop) and generate design prompts via AI
4. **Ship** — Track launch readiness, generate multi-platform marketing copy (Xiaohongshu, Twitter, ProductHunt), collect initial feedback
5. **Grow** — Manage content calendars across channels. Track channel performance and conversion rates
6. **Monetize** — Design pricing tiers, simulate Stripe checkout flows, track MRR and conversion funnels

## Features

- **AI Pet** — A customizable AI companion (10 pets, 4 personalities) that coaches you through each stage with context-aware dialogue. Config persists across sessions
- **Structured Validation** — Kanban-style validation board with GO/NO-GO gates. No more "build first, validate never"
- **Brutalist UI** — Zero border-radius, high contrast, JetBrains Mono typography. Dark/Light theme with system preference detection
- **Built-in Monetization Playground** — Test pricing models with real Stripe checkout flows (test mode). MRR tracking and conversion funnel visualization
- **GitHub Backup** — Sync project data to your own repository. Your data, your control
- **Multi-language** — English and Chinese (i18n with localStorage persistence)
- **Project Blueprint** — Health dashboard showing completion rates, blockers, overdue stages, timeline comparison, and actionable next steps
- **Multi-Auth** — Local JWT (with access/refresh token rotation), Google OAuth, GitHub OAuth, plus email registration with verification
- **Feature Gating** — Free/Pro/Team tiers with configurable limits (projects count, AI calls per month)

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, SQLite/PostgreSQL
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Zustand
- **AI Proxy**: DeepSeek, Kimi, Doubao, OpenAI (unified backend proxy with encrypted key storage)
- **Payments**: Stripe Test Mode (optional)
- **Auth**: JWT with access/refresh token rotation, bcrypt, rate limiting, login audit logs
- **OAuth**: Google, GitHub
- **Email**: Resend (optional, for registration/verification)

## Quick Start

### Option 1: Use SparkBin Cloud (Recommended)

Visit [sparkbin.dev](https://sparkbin.dev) and start immediately. Free plan available.

### Option 2: Self-Host

```bash
# Clone
git clone https://github.com/yaolinhui/sparkbin.git
cd sparkbin

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your SECRET_KEY and DEFAULT_PASSWORD
python start.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

See [SELF_HOSTING.md](./SELF_HOSTING.md) for production deployment details.

## Pricing

SparkBin is **open source and free to self-host**.

For a managed solution, try **SparkBin Cloud**:

| Plan | Price | Projects | AI Calls/Month |
|------|-------|----------|----------------|
| Free | $0 | 3 | 30 |
| Pro | $9/mo | Unlimited | 500 |
| Team | $29/mo | Unlimited | 2000 |

Self-hosted users have no limits — you bring your own AI API keys.

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

[MIT](./LICENSE)
