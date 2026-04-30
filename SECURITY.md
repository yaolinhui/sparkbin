# Security Policy

## Supported Versions

Only the latest version of SparkBin receives security updates. Please ensure you are running the most recent commit from the `master` branch.

| Version | Supported |
|---------|-----------|
| latest  | Yes       |
| < latest| No        |

---

## Reporting a Vulnerability

If you discover a security vulnerability in SparkBin, please follow responsible disclosure:

1. **Do NOT open a public issue** or discuss the vulnerability in public forums.
2. Email the details to: **1582216546@qq.com** (project maintainer)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix Release**: As soon as possible, depending on severity
- **Public Disclosure**: After the fix is released and users have had time to update

---

## Security Audit History

### 2026-04-28 — Full Security Audit (P0 + P1)

A comprehensive security audit was conducted covering authentication, authorization, request handling, and resource control.

#### P0 — Critical Vulnerabilities Fixed

| Issue | Fix | Files |
|-------|-----|-------|
| AI config interface privilege escalation | `list_configs`, `update_config`, `test_ai_config` changed to `require_admin` | `backend/app/routers/ai.py` |
| Stripe open redirect | Added domain whitelist validation for `success_url` / `cancel_url` | `backend/app/routers/payments.py` |
| OAuth account takeover | Added 409 conflict check when binding OAuth to existing user | `backend/app/routers/auth.py` |
| Promotion suggestion horizontal privilege | `generate_promote_suggestions` now validates project ownership | `backend/app/routers/ai.py` |

#### P1 — Authentication & Token Lifecycle

| Issue | Fix | Files |
|-------|-----|-------|
| Token invalidation on password change | Introduced **Token Version** mechanism (`users.token_version`). JWT contains `tv` claim. Password change / reset / logout increments version, invalidating all existing tokens. | `backend/app/auth.py`, `backend/app/routers/auth.py` |
| Long-lived refresh tokens | **Refresh Token Rotation**: each refresh returns a new token pair. Old refresh token is immediately invalid. | `backend/app/routers/auth.py`, `frontend/src/services/api.ts` |
| OAuth State replay attack | State JWT uses `jti` claim and is tracked in `_used_oauth_states` memory set (one-time use) | `backend/app/routers/auth.py` |
| Rate limiting bypass | Fixed unconditional `record_rate_limit_failure` on registration | `backend/app/routers/auth.py` |
| Proxy IP spoofing | Real client IP extracted from `X-Forwarded-For` / `X-Real-IP` with proxy trust configuration | `backend/app/main.py`, `backend/app/config.py` |
| OAuth token exchange hang | Added `timeout=10.0` to OAuth token exchange HTTP calls | `backend/app/routers/auth.py` |
| Empty env variable bypass | Added empty string and minimum length validation for critical env vars | `backend/app/config.py` |

#### P1 — Resource Control & Request Security

| Issue | Fix | Files |
|-------|-----|-------|
| Unbounded AI suggestion cache | AI idea suggestion cache changed to bounded LRU (capacity 128) | `backend/app/services/ai_proxy.py` |
| Unbounded pagination | `limit` parameter capped at 1000 for `/ai/call-logs` and `/admin/logs` | `backend/app/routers/ai.py`, `backend/app/routers/admin.py` |
| HTTP client open redirect | `httpx.AsyncClient` configured with `follow_redirects=False` | `backend/app/services/ai_proxy.py` |
| HTML injection in emails | Email templates use `html.escape` for user-controlled content | `backend/app/email.py` |
| Sensitive data in logs | Regex-based masking for `password`, `api_key`, `secret`, `token` fields in all logs | `backend/app/routers/admin.py` |
| OAuth token leakage | OAuth access token changed from URL query param to URL fragment | `frontend/src/App.tsx`, `backend/app/routers/auth.py` |

---

## Security Best Practices for Self-Hosters

1. **Change default credentials immediately** after first login
2. **Use strong secrets** for `SECRET_KEY` and `ENCRYPTION_KEY` (generate with `secrets.token_hex(32)`)
3. **Enable HTTPS** in production (configure HSTS header in `backend/app/main.py`)
4. **Keep dependencies updated** by running `pip install -r requirements.txt --upgrade` regularly
5. **Review audit logs** periodically at `/admin`
6. **Set `CORS_ORIGINS`** explicitly in `.env` instead of using `*` in production
7. **Run behind a reverse proxy** (Nginx / Caddy) to handle TLS termination and rate limiting
8. **Use PostgreSQL in production** instead of SQLite for better concurrency and reliability
9. **Monitor failed login attempts** — repeated 429 responses may indicate brute-force attacks
