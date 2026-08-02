# Contributing to Fresh Timesheets

Thanks for contributing! 🎉

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

```bash
git clone https://github.com/YassinAliYassin/fresh-timesheets.git
cd fresh-timesheets
npm install
npm run dev
```

## How to contribute

1. Open/pick an issue.
2. Create a branch: `git checkout -b feat/my-change`.
3. Make focused changes and test (`npm run test`, `npm run lint`, `npm run build`).
4. Open a Pull Request against `main`.

## Guidelines

- **Never commit secrets.** `JWT_SECRET` must come from env; in production it is
  required. Render auto-generates it.
- **Keep the API client contract (`src/components/api.ts`) backward compatible.**
- Types: prefer TypeScript types defined in `src/types.ts`.
- Keep `server.js` working; large refactors belong in a dedicated PR with tests.

## Testing

```bash
npm run test    # existing test suite
npm run lint
npm run build
```
