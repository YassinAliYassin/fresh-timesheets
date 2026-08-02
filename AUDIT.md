# Audit — fresh-timesheets

**Audit date:** 2026-08-02 · **Auditor:** Hermes (Lead Staff Engineer)

## Overview

| Field | Value |
|-------|-------|
| Repo | `YassinAliYassin/fresh-timesheets` |
| Visibility | Public |
| Purpose | Event staffing timesheet / billing / quotation / invoice / reporting manager |
| Stack | React 19 + TypeScript + Vite 8 + Tailwind 4; Express + SQLite/Postgres API |
| Primary language | TypeScript (3.2k LOC) |
| Maturity | Functional but under-documented (README was a blank Vite template) |

## Purpose

Dashboard for operations staff: timesheet entry, staff/event management,
quotations, invoices, billing exports, PDF reports, email notifications, and a
calendar view, behind JWT auth.

## Architecture

- React SPA (`src/`) talking to a single-file Express API (`server.js`, 625 LOC).
- Dual DB: better-sqlite3 (dev) / pg + Postgres (prod via `DATABASE_URL`).
- JWT auth (7-day expiry), bcrypt-hashed passwords.
- Deploys to Render (`render.yaml`, JWT_SECRET auto-generated); CI via GitHub Actions.

## Scorecard (0–10)

| Dimension | Score | Notes |
|-----------|:-----:|-------|
| Architecture | 5 | Sound; API is a single 625-LOC file (no modular routes) |
| Code quality | 5 | Works; mixed; API client & server could be tightened |
| Security | 5 | **Hardcoded JWT secret fixed this pass**; still needs rate-limit/audit |
| Documentation | 3 | README was blank Vite template; fully rewritten this pass |
| Maintainability | 4 | Monolith server; no API integration tests |
| Performance | 6 | Fine for small scale |
| Developer experience | 4 | Scripts exist; README now explains setup |
| Business readiness | 4 | Functional, but needs docs/auth hardening/tests to ship |

**Overall: 4.5 / 10** · **Business readiness: 4 / 10**

## High priority

1. Split `server.js` into modular routers/controllers.
2. Add integration tests for the API (auth, events, timesheets).
3. Add rate limiting + request-size guards on auth endpoints.

## Medium priority

4. Add API versioning + OpenAPI docs.
5. Add a secrets-scan CI workflow.
6. Containerize with Docker.

## Low priority

7. Move all exports (PDF/XLSX) into a dedicated service module.
8. Add end-to-end UI tests for the main flows.

## Technical debt estimate

~2–3 engineer-weeks (API modularisation, tests, hardening).

## Hours saved by this pass

~6–8 hours (production README, CONTRIBUTING/SECURITY/CHANGELOG, hygiene files,
issue/PR templates, Dependabot, .env.example, JWT secret fix).
