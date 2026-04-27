# Contributing to SparkBin

Thank you for your interest in contributing! This project is built by and for indie hackers/vibe coders.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Follow [SELF_HOSTING.md](./SELF_HOSTING.md) to set up the development environment
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Backend

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python start.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# E2E tests (Playwright)
cd frontend
npx playwright test

# TypeScript type checking
cd frontend && npx tsc --noEmit
```

### Before Submitting a PR

1. Ensure the backend starts without errors: `cd backend && python start.py`
2. Ensure frontend TypeScript compiles: `cd frontend && npx tsc --noEmit`
3. Run E2E tests if your change affects UI flows: `cd frontend && npx playwright test`
4. Test your changes manually in the browser
5. Update documentation if your change affects setup or usage

## Code Style

- **Frontend**: Named exports, `interface` over `type`, minimal comments (explain "why", not "what")
- **Backend**: Type hints, dependency injection for DB sessions, Result pattern over try-catch where appropriate
- **No hardcoded secrets**: All API keys, passwords, and tokens must come from environment variables
- **No emojis in code**: Unless explicitly requested
- **No default exports**: Use named exports for all components and functions
- **Dependency size check**: When adding new frontend dependencies, check bundle size impact
- **Database migrations**: Do not modify existing migration files. Create new migrations with `alembic revision --autogenerate -m "description"`

## Commit Message Style

Follow conventional commits:

```
feat: add new feature
fix: fix a bug
docs: update documentation
refactor: code refactoring
chore: maintenance tasks
```

## Reporting Issues

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/backend environment details

## Security Issues

Please do NOT open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for responsible disclosure.
