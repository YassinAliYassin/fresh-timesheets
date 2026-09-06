# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | ✅ Active support  |

## Reporting a Vulnerability

Report security vulnerabilities privately to **info@solidsolutions.africa** with
subject prefix `[SECURITY] fresh-timesheets`. Do **not** open a public issue.
Include: description, reproduction steps, affected version/commit, suggested fix.

Acknowledgement within 72 hours.

## Secrets Hygiene

- `JWT_SECRET` is **required in production** and never committed. Render
  auto-generates it (`generateValue: true`); locally it falls back to a dev-only
  value clearly marked as change-me.
- Database credentials load from `DATABASE_URL` only.
- If you ever commit a real secret, rotate it immediately and purge it from history.

## Auth notes

- Passwords are hashed with bcrypt; JWTs expire after 7 days.
- The API uses a per-request auth middleware (Bearer token). Ensure `JWT_SECRET`
  is strong and unique per environment.
