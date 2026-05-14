# DocFlow MCP Tracker

## Purpose

This is the live build tracker for DocFlow MCP. We will keep requirements, implementation notes, decisions, and next actions here as the project evolves.

## Current Phase

MVP `v0.1` is now product-ready in both `stdio` and HTTP (`/mcp`) modes. Current focus is real-client validation and public release hardening.

## Requirements (MVP)

- Build a TypeScript MCP server (`stdio` + Streamable HTTP transport) using `@modelcontextprotocol/sdk`.
- Provide one primary tool: `extract_docs_context`.
- Tool input: `url`, `goal`, optional `stack`, optional `maxChars`.
- Fetch documentation HTML from URL.
- Clean page content to reduce chrome/noise.
- Convert relevant content to markdown.
- Detect implementation-relevant sections (auth/endpoints/params/errors/etc).
- Detect and remove suspicious prompt-injection-like instructions.
- Generate compact context-pack markdown suitable for AI coding assistants.
- Return structured JSON payload with warnings and compression stats.
- Add tests for core behavior.
- Provide open-source friendly setup docs and run scripts.

## Notes

- Keep architecture narrow and demoable in under one minute.
- Avoid frontend, auth, database, crawler, and extension work for v0.1.
- Preserve source URL and important implementation details.
- HTTP server now exposed at `/mcp` with `GET/POST/DELETE` handlers and `/healthz`.
- Tool registration now uses `registerTool` + annotations for connector-friendly metadata.

## Decisions Log

- 2026-05-14: Project folder created at `/Users/dhruvtoprani/Desktop/Projects/docflow-mcp`.
- 2026-05-14: Using npm scripts and NodeNext TypeScript module config.
- 2026-05-14: Keeping extraction logic in `src/core` and MCP wiring in `src/server`.
- 2026-05-14: Added dedicated tool module at `src/server/tools/extractDocsContextTool.ts` to keep server registration clean.
- 2026-05-14: Added Streamable HTTP runtime (`src/server/httpServer.ts`) and HTTP entrypoint (`src/http.ts`).
- 2026-05-14: Standardized tool metadata with `registerTool` annotations (`readOnlyHint`, `openWorldHint`).
- 2026-05-14: Added open-source packaging files (`LICENSE`, `CONTRIBUTING.md`, docs, examples, Dockerfile).

## Session Log (2026-05-14)

- Scaffolded full repo structure and MVP file layout from starter brief.
- Copied starter brief into repo as `PROJECT_START.md`.
- Installed dependencies successfully with `npm install`.
- Verified TypeScript compile with `npm run build`.
- Verified tests with `npm test` (3 files, 4 tests passing).
- Ran end-to-end extraction smoke test with `npm run dev:extract`.
- Expanded `detectDocSections` heuristics for overview-heavy documentation language.
- Added integration tests for `extractDocsContext` with mocked `fetch` and content-type errors.
- Added tool-level `isError` response wrapper for `extract_docs_context` failures.
- Added tests for MCP tool success and error response shape.
- Updated local demo to read input JSON from `examples/sample-input.json`.
- Added `--json` mode to local demo script for inspecting full structured output.
- Validated focused docs extraction against GitHub auth docs with all section flags detected.
- Added HTTP transport mode and lifecycle management for MCP sessions.
- Added `/healthz` endpoint and HTTP server tests.
- Added connector setup doc and `mcp-servers` config example for fast onboarding.
- Smoke-tested HTTP runtime: `npm run dev:http` + `GET /healthz` returned healthy response.
- Added MCP harness test that lists and calls `extract_docs_context` through linked client/server transports.
- Added public landing page scaffold in `docs/` with simple install and connector instructions.
- Added GitHub Pages deployment workflow at `.github/workflows/deploy-pages.yml`.
- Added non-technical release checklist file: `DEPLOY_STEPS_FOR_ANYONE.md`.
- Verified current local blocker for auto-push: GitHub CLI token needs re-authentication.

## Action Items

- [x] Scaffold repository structure and core files.
- [x] Install dependencies and validate build.
- [x] Run tests and fix issues.
- [x] Smoke-test extraction on one real docs URL.
- [x] Improve section detection heuristics for overview-heavy docs pages.
- [x] Add integration tests around `extractDocsContext` with mocked fetch responses.
- [x] Add robust error formatting for MCP tool responses (`isError` path).
- [ ] Validate the HTTP `/mcp` server in ChatGPT connector flow.
- [x] Add CLI switch for printing structured JSON output from local demo script.
- [x] Add end-to-end MCP tool invocation harness over stdio transport.
- [ ] Add end-to-end MCP tool invocation harness over HTTP transport.
- [ ] Replace placeholder `websiteUrl` with real GitHub repo URL before launch.
- [ ] Re-authenticate GitHub CLI (`gh auth login`) and push initial public repo.
- [ ] Enable GitHub Pages in repo settings (GitHub Actions source).

## Next Steps

1. Validate ChatGPT connector end-to-end using deployed HTTPS `/mcp` URL.
2. Test extraction quality against two additional providers (email + payments docs).
3. Add HTTP-level MCP call test (initialize + tool call against `/mcp`).
4. Replace placeholder repository metadata (`websiteUrl`, README clone URL) with real org/repo.
5. Cut v0.1.0 release notes and publish repository.
