# Self-Hosting Guide

## Quick Start (Docker) - Recommended

The fastest way to self-host SparkBin is with Docker Compose. No manual Python/Node installation required.

### 1. Clone and Configure

```bash
git clone https://github.com/yaolinhui/sparkbin.git
cd sparkbin

# Copy environment template
cp .env.example .env

# Edit .env - at minimum change these:
# SECRET_KEY=your-random-32-char-key
# ENCRYPTION_KEY=your-random-32-char-key
# DEFAULT_PASSWORD=your-secure-password
```

### 2. Launch

```bash
docker compose up -d
```

### 3. Access

- Open http://localhost
- Login with `admin` / the `DEFAULT_PASSWORD` you set
- **Important**: Change the default password immediately after first login

### 4. Upgrade

```bash
docker compose pull
docker compose up -d
```

### 5. Backup

```bash
# Database backup
docker exec sparkbin-postgres pg_dump -U sparkbin sparkbin > backup.sql

# Restore
docker exec -i sparkbin-postgres psql -U sparkbin sparkbin < backup.sql
```

---

## Manual Setup (Development / Advanced)

### Requirements

- Python 3.11+
- Node.js 18+
- SQLite (built-in) or PostgreSQL 14+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/yaolinhui/sparkbin.git
cd sparkbin
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate
# Linux/Mac:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

#### Configure Environment Variables

Edit `.env` and set at minimum these required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | JWT signing key. Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ENCRYPTION_KEY` | Yes | API key encryption. Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `DEFAULT_PASSWORD` | Yes | Initial admin password. Change immediately after first login |
| `DATABASE_URL` | No | Default: `sqlite:///./sparkbin.db`. For PostgreSQL: `postgresql://user:pass@localhost/sparkbin` |
| `CORS_ORIGINS` | No | Comma-separated list of frontend URLs |

**Security**: The application will refuse to start if `SECRET_KEY` or `ENCRYPTION_KEY` uses the default value.

#### Initialize Database

```bash
# Run Alembic migrations to create tables
cd backend
alembic upgrade head

# Or let the application auto-create on first startup (SQLite only)
# The app includes compatibility patches for SQLite column additions
```

#### Start Backend

```bash
# Development (with auto-reload)
python start.py

# The API will be available at http://localhost:8000
# Swagger UI docs at http://localhost:8000/docs
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# The frontend will be available at http://localhost:5173
```

### 4. First Login

Open http://localhost:5173 and log in with:
- Username: `admin`
- Password: The `DEFAULT_PASSWORD` you set in `.env`

**Important**: Change the default password immediately after first login.

---

## Optional Features Configuration

### AI Provider Setup

To use AI features, configure at least one provider in the Admin dashboard (`/admin`):

1. Log in as admin
2. Navigate to Admin -> AI Service Configuration
3. Add your API key for DeepSeek, Kimi, Doubao, or OpenAI

API keys are encrypted at rest using Fernet (your `ENCRYPTION_KEY`).

### Local AI with Ollama (Self-Hosted / Offline)

SparkBin supports running AI completely offline via Ollama:

1. Uncomment the `ollama` service in `docker-compose.yml`
2. Start the stack: `docker compose up -d`
3. Pull a model: `docker exec -it sparkbin-ollama ollama pull llama3.2`
4. In Admin -> AI Service Configuration, enable "Ollama (Local)"
5. Set Base URL to `http://ollama:11434` (Docker internal network)

No API keys required. All project data stays on your server.

### GitHub Backup

Add to `.env`:
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_OWNER=your-username
GITHUB_REPO=your-backup-repo
GITHUB_FILE_PATH=data/projects.json
```

Then configure in the app via Settings -> GitHub Backup.

### Stripe Payment (Optional)

For testing monetization features locally:
```
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx
APP_URL=http://localhost:5173
```

Leave empty to disable payment features.

### Email Service (Optional)

For email registration and password reset:
```
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=SparkBin <noreply@yourdomain.com>
```

### OAuth Login (Optional)

For Google/GitHub login:
```
GOOGLE_CLIENT_ID=xxxxxxxx
GOOGLE_CLIENT_SECRET=xxxxxxxx
GITHUB_CLIENT_ID=xxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxx
FRONTEND_URL=http://localhost:5173
```

---

## Production Deployment

### Docker Production

Use the production compose file with pre-built images and Caddy auto-HTTPS:

```bash
# 1. Configure your domain in docker/Caddyfile
cp docker/Caddyfile.example docker/Caddyfile
# Edit: replace example.com with your domain

# 2. Set production environment variables in .env

# 3. Deploy
docker compose -f docker-compose.production.yml up -d
```

### Manual Production

#### 1. Use Production ASGI Server

Do **not** use `python start.py` with `reload=True` in production.

```bash
cd backend

# Option A: Uvicorn (single worker)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Option B: Gunicorn with Uvicorn workers
# Install: pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### 2. Nginx Reverse Proxy Example

```nginx
server {
    listen 80;
    server_name sparkbin.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sparkbin.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend static files (after npm run build)
    location / {
        root /path/to/sparkbin/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. Enable HTTPS Security Headers

Edit `backend/app/main.py` and update the HSTS header:

```python
# Change from (development):
response.headers["Strict-Transport-Security"] = "max-age=0"

# To (production):
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
```

#### 4. Production Checklist

- [ ] Changed `SECRET_KEY` from default
- [ ] Changed `ENCRYPTION_KEY` from default
- [ ] Changed `DEFAULT_PASSWORD` from default
- [ ] Using PostgreSQL instead of SQLite (recommended)
- [ ] HSTS header enabled
- [ ] HTTPS configured
- [ ] CORS origins restricted to actual domains
- [ ] Database backed up regularly
- [ ] Stripe keys are test keys (if testing) or live keys (if real)

---

## Database Migration

When upgrading to a new version:

```bash
cd backend
source venv/bin/activate

# Pull latest code
git pull origin master

# Run migrations
alembic upgrade head

# Restart backend
```

For Docker:
```bash
docker compose pull
docker compose up -d
# Migrations run automatically on container start
```

---

## Troubleshooting

### Backend fails to start with "SECRET_KEY is using the default value"

Generate new keys and update `.env`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Frontend shows "Failed to fetch"

- Ensure backend is running on port 8000
- Check `CORS_ORIGINS` in backend `.env` includes your frontend URL
- Check browser console for CORS errors

### Database locked (SQLite)

SQLite `check_same_thread=False` is already configured. If you see locking errors, switch to PostgreSQL.

### Playwright E2E tests fail

```bash
cd frontend
npx playwright install  # Download browsers
npm run test:e2e
```

### Docker: "connection refused" to postgres

Wait for postgres healthcheck to pass. The backend depends on postgres being healthy.

```bash
docker compose logs -f postgres
```

### Docker: "Permission denied" on volumes (Linux)

```bash
# Fix ownership for postgres data
sudo chown -R 999:999 ./postgres_data
```
