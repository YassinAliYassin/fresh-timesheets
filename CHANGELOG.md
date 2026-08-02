# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Removed hardcoded JWT secret fallback; `JWT_SECRET` is now required in production
  (dev-only marked fallback retained for local runs).

### Added
- Production documentation: README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY,
  CHANGELOG, AUDIT; `.editorconfig`, `.prettierrc`, Dependabot, issue/PR templates.

## [1.0.0] - Initial release

Timesheet, billing, quotation, invoice, and reporting manager for event staffing.
