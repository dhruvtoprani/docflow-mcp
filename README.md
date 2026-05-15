# DocFlow MCP

**The missing context layer for AI-assisted development.**

DocFlow MCP is an open-source **MCP server** that converts noisy API documentation pages into compact, implementation-ready context packs for coding assistants like ChatGPT, Claude, Cursor, and other MCP clients.

## What It Is

DocFlow is an **AI context optimization utility** for developer workflows.

It is not a generic scraper, crawler, or markdown conversion tool.

It is designed to improve one thing: **implementation quality per token** when building against external docs.

## Why It Exists

Most AI coding failures on API tasks are context failures.

Raw docs include navigation clutter, repeated headers, irrelevant examples, and marketing content. Copy-pasting that directly into coding assistants:

- increases token usage
- lowers signal density
- reduces implementation reliability

DocFlow compresses docs into high-signal context that preserves the API contract details required to ship code.

## Jobs To Be Done (JTBD)

When I ask an AI coding assistant to implement against external docs, help me:

- pull only task-relevant context instead of full-page dumps
- preserve exact contract details (method, path, headers, auth, pagination/signature tokens)
- generate reusable implementation patterns, not one-off snippets
- reduce hallucination risk by grounding responses in extracted docs evidence
- reduce token spend without sacrificing implementation quality

## Core Value

DocFlow improves:

- **Quality**: better implementation correctness and runnable readiness
- **Efficiency**: smaller context payloads and lower token cost
- **Reliability**: stronger contract-anchor preservation for auth/webhooks/pagination-heavy tasks

## Before vs After (Conceptual)

### Raw copy/paste docs context
- full page chrome
- repeated headings/navigation
- mixed relevance examples
- low signal density for the current coding task

### DocFlow context pack
- task-aware, compact implementation context
- preserved API anchors (headers, paths, params, signature fields)
- warnings + context hygiene signals
- optimized for AI coding assistant consumption

## MCP Tool

### `extract_docs_context`

Input:

- `url`
- `goal`
- optional `stack`

Output:

- compact implementation context pack (markdown)
- detected section coverage (auth/endpoints/params/errors/security)
- warnings and suspicious instruction filtering
- context-size reduction stats

## How It Works

1. Fetch docs page
2. Normalize and clean content
3. Convert to structured markdown
4. Remove suspicious prompt-injection-like instructions
5. Apply task-aware context compression
6. Preserve/backfill critical API contract anchors
7. Return MCP-native context pack output

## Benchmarking and Evaluation

DocFlow is measured against a rendered browser copy/paste baseline.

### Scoring dimensions

- implementation correctness
- security hygiene
- runnable readiness
- hallucination risk

### Efficiency metric

- input context reduction vs baseline

### Recent 3-run trend

| Run | DocFlow wins | Baseline wins | DocFlow avg total | Baseline avg total | DocFlow judge overall | Baseline judge overall | Input reduction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `2026-05-14T22-41-42-713Z` | 1 | 9 | 0.668 | 0.767 | 62.1 | 75.9 | 10.52% |
| `2026-05-14T23-14-12-041Z` | 3 | 7 | 0.715 | 0.734 | 68.5 | 70.4 | 30.24% |
| `2026-05-14T23-29-35-940Z` | 8 | 2 | 0.794 | 0.666 | 76.8 | 63.2 | 29.15% |

Interpretation:

- Quality improved from regression to strong benchmark lead
- Context stayed materially smaller while quality increased
- Repeat runs remain important for variance and overfitting control

Reports are stored in `eval/results/workflow-eval-*.json`.

## Quickstart

### 1) Install

```bash
git clone https://github.com/dhruvtoprani/docflow-mcp.git
cd docflow-mcp
npm install
npm run build
```

### 2) Run local stdio MCP server

```bash
npm run dev
```

### 3) Run Streamable HTTP MCP server

```bash
npm run dev:http
```

Default URL: `http://127.0.0.1:3000/mcp`  
Health check: `http://127.0.0.1:3000/healthz`

## Local Demo

```bash
npm run dev:extract
```

Custom input file:

```bash
npm run dev:extract -- examples/sample-input.json
```

Full JSON output:

```bash
npm run dev:extract -- --json
```

## Run Evaluations

Workflow evaluator:

```bash
npm run eval:workflow
```

Fast A/B evaluator:

```bash
npm run eval:ab
```

## Compatibility

DocFlow is designed for MCP-native workflows and works well with:

- ChatGPT MCP connectors
- Claude MCP clients
- Cursor + MCP-hosted toolchains
- custom MCP-compatible coding agents

## Live URLs

- Landing page: `https://dhruvtoprani.github.io/docflow-mcp/`
- Live MCP endpoint: `https://docflow-mcp.vercel.app/mcp`
- Live health check: `https://docflow-mcp.vercel.app/healthz`

## Connect to ChatGPT (Custom MCP Connector)

1. Ensure your MCP endpoint is publicly reachable via HTTPS.
2. Use `/mcp` as connector URL path.
3. In ChatGPT: `Settings -> Connectors -> Create`.
4. Set URL to `https://docflow-mcp.vercel.app/mcp`.
5. Test `extract_docs_context`.

## Environment Variables

Use `.env.example` as reference.

- `DOCFLOW_HTTP_HOST` (default: `127.0.0.1`)
- `DOCFLOW_HTTP_PORT` (default: `3000`)
- `DOCFLOW_USER_AGENT` (optional outbound fetch user-agent)

## MCP Client Config Example (stdio)

See [examples/mcp-servers.example.json](examples/mcp-servers.example.json).

## Scripts

- `npm run dev` - stdio MCP server
- `npm run dev:http` - Streamable HTTP MCP server
- `npm run dev:extract` - local extraction runner
- `npm run eval:workflow` - rubric-based workflow evaluation
- `npm run eval:ab` - keyword-based A/B evaluation
- `npm run build` - compile TypeScript
- `npm run test` - run tests
- `npm run lint` - lint source and tests
- `npm run format` - format repository

## Roadmap

- Multi-page docs context packs
- Host-optimized output modes for major MCP clients
- CI benchmark regression gates
- Docs-to-implementation validation checks
- Richer MCP ecosystem integrations

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT - see [LICENSE](LICENSE).
