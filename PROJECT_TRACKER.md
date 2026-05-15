# DocFlow MCP Tracker

## Purpose

This is the live build tracker for DocFlow MCP. We will keep requirements, implementation notes, decisions, and next actions here as the project evolves.

## Current Phase

MVP `v0.1` is now product-ready in both `stdio` and HTTP (`/mcp`) modes. Current focus is proving real-world utility vs manual copy/paste, then hardening for public open-source adoption.

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
- Evaluation now has two tracks: quick A/B and rubric-based workflow quality.

## Decisions Log

- 2026-05-14: Project folder created at `/Users/dhruvtoprani/Desktop/Projects/docflow-mcp`.
- 2026-05-14: Using npm scripts and NodeNext TypeScript module config.
- 2026-05-14: Keeping extraction logic in `src/core` and MCP wiring in `src/server`.
- 2026-05-14: Added dedicated tool module at `src/server/tools/extractDocsContextTool.ts` to keep server registration clean.
- 2026-05-14: Added Streamable HTTP runtime (`src/server/httpServer.ts`) and HTTP entrypoint (`src/http.ts`).
- 2026-05-14: Standardized tool metadata with `registerTool` annotations (`readOnlyHint`, `openWorldHint`).
- 2026-05-14: Added open-source packaging files (`LICENSE`, `CONTRIBUTING.md`, docs, examples, Dockerfile).
- 2026-05-14: Added rendered-browser copy baseline mode to better simulate real select-all copy/paste.
- 2026-05-14: Added workflow eval harness focused on practical implementation readiness and safety.
- 2026-05-15: Added OSS hardening plan in `ACTION_ITEMS.md` and started P0 reliability work.
- 2026-05-15: Added workflow triage evaluator (`eval:triage`) to aggregate multi-run quality + compression trends.
- 2026-05-15: Added GitHub CI (`ci.yml`) and manual regression gate (`eval-gate.yml`).

## Session Log (2026-05-14)

- Scaffolded full repo structure and MVP file layout from starter brief.
- Copied starter brief into repo as `PROJECT_START.md`.
- Installed dependencies successfully with `npm install`.
- Verified TypeScript compile with `npm run build`.
- Verified tests with `npm test`.
- Ran end-to-end extraction smoke test with `npm run dev:extract`.
- Expanded `detectDocSections` heuristics for overview-heavy documentation language.
- Added integration tests for `extractDocsContext` with mocked `fetch` and content-type errors.
- Added tool-level `isError` response wrapper for `extract_docs_context` failures.
- Added tests for MCP tool success and error response shape.
- Added HTTP transport mode and lifecycle management for MCP sessions.
- Added `/healthz` endpoint and HTTP server tests.
- Added connector setup doc and `mcp-servers` config example for fast onboarding.
- Added public landing page scaffold in `docs/`.
- Added GitHub Pages deployment workflow at `.github/workflows/deploy-pages.yml`.
- Added non-technical release checklist file: `DEPLOY_STEPS_FOR_ANYONE.md`.
- Fixed docs/link integrity issues (removed local absolute links and stale placeholders).
- Added Vercel serverless API routes: `api/mcp.ts` and `api/healthz.ts`.
- Added `vercel.json` rewrites so `/mcp` and `/healthz` map to serverless endpoints.
- Deployed production URL and validated MCP initialize against live endpoint.
- Added implementation-context compactor and stricter final pack budgeting.
- Added a new workflow eval runner (`eval:workflow`) and real use-case task suite.
- Added workflow eval support for multi-page task inputs (`urls`) to fairly score auth + endpoint tasks.
- Added rendered-baseline navigation fallback strategy (`networkidle` -> `domcontentloaded` -> `load`) for better cross-site reliability.

## Session Log (2026-05-15)

- Added scoped open-source execution plan in `ACTION_ITEMS.md`.
- Added `src/eval/runEvalTriage.ts` + `npm run eval:triage` for multi-run regression detection.
- Added CI workflow for lint/test/build and informational triage output.
- Added manual `eval-gate` workflow to fail on regression when maintainers trigger release checks.
- Updated evaluation documentation with a strict 3-run protocol and threshold-based gate.

## Action Items

### P0 Reliability + Gatekeeping
- [x] Add workflow eval triage command (`eval:triage`) over last N runs.
- [x] Add threshold checks for quality delta, failed tasks, and input reduction.
- [ ] Tune default thresholds from actual repo history (last 10 reports) and freeze them.
- [ ] Add one-command release gate script that runs workflow eval + triage end-to-end.

### P0 OSS Trust Signals
- [x] Add CI for lint/test/build.
- [x] Add manual eval regression workflow.
- [ ] Add CODEOWNERS and issue templates for external contributors.
- [ ] Add changelog template for consistent release notes.

### P1 Product + Messaging Hardening
- [ ] Refresh README sections for positioning, quickstart, and evaluation proof.
- [ ] Add "when DocFlow helps / when it does not" section.
- [ ] Add benchmark table generated from triage output for consistency.

## Next Steps

1. Run workflow eval two more times using the same config to complete a clean 3-run triage window.
2. Run `npm run eval:triage` and inspect gate outputs.
3. Tune threshold defaults using the latest 10 reports to reduce false regressions.
4. Add CODEOWNERS + issue templates + changelog template.
5. Update README with stable benchmark framing from triage outputs.
