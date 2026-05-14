# Contributing

Thanks for contributing to DocFlow MCP.

## Local setup

```bash
npm install
npm run build
npm test
```

## Workflow

1. Create a feature branch.
2. Keep changes scoped and test-backed.
3. Run before opening a PR:

```bash
npm run format
npm run lint
npm run build
npm test
```

## Guidelines

- Keep extraction logic in `src/core`.
- Keep MCP wiring in `src/server`.
- Do not add frontend/auth/database in v0.1.
- Preserve source URL in outputs.
- Do not pass suspicious prompt-injection lines into context packs.
