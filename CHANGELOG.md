# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub project import: connect GitHub account via incremental OAuth (`public_repo` scope), select public repository, AI auto-analyzes README/metadata to suggest stage and pre-fill project fields
- `GitHubImportModal` component with 3-step flow: repo selection → AI preview → project creation
- Backend GitHub import service with rule-based + AI stage recognition
- OAuth 2.0 login support (Google and GitHub)
- Email registration and verification flow
- Password reset via email
- Free/Pro/Team tier feature gating system
- AI pet configuration persistence (stored in database)
- Login audit logging

### Removed
- Legacy GitHub backup sync feature (frontend PAT storage was a security risk in multi-user scenarios; will be replaced by backend-proxied project-level repo binding in future)
- `GitHubConfigModal`, `github.ts`, and `GitHubConfig` type from first-version localStorage architecture

### Security
- Rate limiting on login endpoints (5 attempts per 5 minutes per IP)
- RBAC enforcement on `/admin/*` routes
- Dual token rotation (access token + refresh token)
- Password complexity validation
- Security response headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)
- Default SECRET_KEY and ENCRYPTION_KEY validation at startup

## [0.2.0] - 2026-04-27

### Added
- Feature gating: Free/Pro/Team subscription tiers
- OAuth login (Google, GitHub)
- Email registration with verification
- Password reset flow
- Login audit logs
- AI pet config persistence to database
- Theme preference persistence

### Changed
- Refactored CreateProjectModal with three-step wizard
- Enhanced AI suggestion modal with visual mode selection
- Upgraded authentication to dual-token (access + refresh) rotation

### Fixed
- AI call log user_id type mismatch (string vs UUID)
- Frontend UI contrast and layout issues
- ValidateStage drag-and-drop ghosting artifacts
- AI fallback response formatting

## [0.1.0] - 2026-04-13

### Added
- Six-stage Vibe workflow: Idea -> Validate -> Prototype -> Ship -> Grow -> Monetize
- AI chat with SSE streaming (DeepSeek, Kimi, Doubao, OpenAI proxy)
- Stage-native AI response format (Facts / Gaps / Actions / Sync JSON)
- Kanban-style validation board with GO/NO-GO decision gates
- Prototype planning with P0/P1/P2 prioritization
- Multi-platform launch copy generation (Xiaohongshu, Twitter, ProductHunt, etc.)
- Content calendar with weekly/monthly views
- Monetization playground with Stripe Test Mode checkout
- Project Blueprint health dashboard
- GitHub backup sync
- Brutalist UI design system (zero border-radius, JetBrains Mono)
- Dark/Light theme switching
- i18n (Chinese and English)
- JWT authentication with bcrypt
- Admin dashboard with operation logs
- Playwright E2E test suite
