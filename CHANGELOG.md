# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Docker support**: Full containerization with `docker-compose.yml`, multi-stage frontend build, Nginx reverse proxy, PostgreSQL with health checks
- **Ollama local AI**: Run AI completely offline without API keys. Supports any Ollama-compatible model via OpenAI-compatible API. Optional `ollama` service in Docker Compose
- `.env.example` with all configuration options documented
- GitHub project import: connect GitHub account via incremental OAuth (`public_repo` scope), select public repository, AI auto-analyzes README/metadata to suggest stage and pre-fill project fields
- `GitHubImportModal` component with 3-step flow: repo selection → AI preview → project creation
- Backend GitHub import service with rule-based + AI stage recognition
- OAuth 2.0 login support (Google and GitHub)
- Email registration and verification flow
- Password reset via email
- Free/Pro/Team tier feature gating system
- AI pet configuration persistence (stored in database)
- Login audit logging
- PixelPet pixel-art animated pet system (idle/blink/happy/celebrate animations, 8-bit rendering, integrated into AIChat and ProjectBoard)
- 7-language i18n support (Chinese, Japanese, Korean, Spanish, French, German, English)
- `ValidateSuggestModal` for AI-powered validation suggestions with append/overwrite modes
- Admin AI config page: two-column adaptive layout
- Logout confirmation dialog with pet retention animation
- Login modal: grid dot background, micro-animations, real-time password strength indicator
- Registration honeypot anti-bot protection
- Project title inline editing
- Landing page with grid dot pattern
- **AI credits system**: `ai_credits` and `ai_credits_total_consumed` fields on User model
- **`CreditTransaction` table**: Audit trail for all credit grants, purchases, consumptions, and refunds
- **Stripe one-time payments**: `purchase-credits` endpoint creates Checkout Session for credit packs ($5/100, $10/250, $20/600)
- **Credit balance APIs**: `GET /payments/credits-status`, `GET /payments/credit-transactions`, `GET /payments/credit-packs`
- **AI quota enforcement**: All AI endpoints check credits before processing; return 402 when exhausted; deduct 1 credit per successful call with transaction logging
- **Registration bonus**: New users automatically receive 20 free AI credits on sign-up
- **Feature flags**: `ENABLE_PAYMENTS`, `ENABLE_SAAS_FEATURES`, `CREDITS_GRANT_ON_REGISTER`, `CREDITS_PACKS` environment variables for self-hosted vs SaaS differentiation
- **Webhook handler**: `checkout.session.completed` processes credit purchases and updates user balance
- **Next question auto-fill**: After AI stream completes, if `nextQuestion` is present, input field is pre-filled for seamless stage loop progression
- Database migration: `b299dc1b311c` adds `ai_credits` columns and `credit_transactions` table

### Changed
- `LanguageSwitcher` changed from button to dropdown panel, unified placement across all pages
- Elastic layout fix: replaced `h-full` abuse with `flex-1` for proper viewport filling in Stage components
- **Business model**: Replaced monthly subscription with "Free unlimited projects + AI credits prepaid" model. Projects are always free; AI calls consume prepaid credits (1 per conversation). Credits never expire
- **Pricing**: Landing site Pricing section updated from 3-tier subscription (Free/Pro/Team) to 2-tier (Free + Pay-as-you-go)
- `UpgradePromptModal` redesigned as credit purchase modal with Stripe Checkout one-time payment
- `AIChat` displays real-time AI credit balance, optimistic deduction, 30s polling sync, and low-credit warnings
- `PaymentResultModal` updated to show credit balance instead of subscription status
- `ProfilePage` quota section migrated from monthly AI call limits to credit balance display
- `MonetizeStage` test mode now queries credit status instead of subscription status
- **Project limits removed**: All users can create unlimited projects regardless of tier

### Removed
- Legacy GitHub backup sync feature (frontend PAT storage was a security risk in multi-user scenarios; will be replaced by backend-proxied project-level repo binding in future)
- `GitHubConfigModal`, `github.ts`, and `GitHubConfig` type from first-version localStorage architecture
- Free/Pro/Team tier subscription system (replaced by AI credits prepaid model)

### Security
- Rate limiting on login endpoints (5 attempts per 5 minutes per IP)
- RBAC enforcement on `/admin/*` routes
- Dual token rotation (access token + refresh token)
- Password complexity validation
- Security response headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)
- Default SECRET_KEY and ENCRYPTION_KEY validation at startup
- **Security audit P0+P1**: AI config admin-only enforcement, Stripe open redirect whitelist, OAuth account takeover protection (409 conflict check), promotion suggestion horizontal privilege fix, Token Version mechanism, Refresh Token Rotation, OAuth State one-time validation, proxy real IP detection, httpx redirect disabled, HTML email escaping, sensitive log regex masking
- **Frontend performance optimization**: React.lazy route loading, Vite page-level code splitting, AIChat SSE 200ms throttling, ProjectCard React.memo, API GET 3s cache, ProjectDetail request cancellation + isLoading deadlock fix, RichTextEditor useMemo extensions
- **DotGridBackground**: Canvas 2D spring physics ripple effect for LoginModal and LandingPage
- **ProfilePage**: Independent user profile management component
- **Landing site**: Next.js standalone marketing website with i18n (`landing/`)
- License changed from MIT to Elastic License 2.0

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
