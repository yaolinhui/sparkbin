# Self-Hosting Guide

## Requirements

- Python 3.11+
- Node.js 18+
- SQLite (built-in) or PostgreSQL

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate
# Activate (Windows)
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your settings (especially SECRET_KEY and DEFAULT_PASSWORD)
# vim .env

# Start development server
python start.py
```

The API will be available at `http://localhost:8000`.
API documentation (Swagger UI) at `http://localhost:8000/docs`.

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## Production Deployment

For production, use a proper ASGI server without reload:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or use the provided Procfile with a process manager like gunicorn:

```bash
cd backend
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Docker (Community Contribution Welcome)

A Dockerfile and docker-compose.yml are welcome contributions. If you create one, please submit a PR.

## Important Security Notes

1. **Change default credentials immediately**: The default admin account is a security risk if left unchanged.
2. **Generate strong secrets**: Use `secrets.token_hex(32)` for SECRET_KEY.
3. **Enable HTTPS in production**: The HSTS header is disabled by default for development. Enable it when serving over HTTPS.
4. **Stripe is optional**: If you don't configure Stripe keys, the payment features are automatically disabled. This is the recommended setup for personal self-hosting.
