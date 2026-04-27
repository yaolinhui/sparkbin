# Security Policy

## Supported Versions

Only the latest version of SparkBin receives security updates. Please ensure you are running the most recent commit from the `master` branch.

| Version | Supported |
|---------|-----------|
| latest  | Yes       |
| < latest| No        |

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

## Security Best Practices for Self-Hosters

1. **Change default credentials immediately** after first login
2. **Use strong secrets** for SECRET_KEY and ENCRYPTION_KEY
3. **Enable HTTPS** in production (configure HSTS header in `backend/app/main.py`)
4. **Keep dependencies updated** by running `pip install -r requirements.txt --upgrade` regularly
5. **Review audit logs** periodically at `backend/app/routers/admin.py`
