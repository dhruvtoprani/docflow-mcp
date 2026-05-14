# DocFlow MCP

DocFlow MCP is an open-source Model Context Protocol server that converts large docs pages into compact, implementation-ready context packs for AI coding assistants.

## Why it exists

Developers waste context windows by pasting entire docs pages into AI chats.

DocFlow MCP takes:

- `url`
- `goal`
- optional `stack`

and returns a structured payload with:

- compact markdown context pack
- detected implementation coverage (auth, endpoints, params, errors, etc.)
- warnings for missing info
- suspicious prompt-injection line detection
- size-reduction stats

## Tool

`extract_docs_context`

## Quickstart

### 1. Install

```bash
git clone https://github.com/dhruvtoprani/docflow-mcp.git
cd docflow-mcp
npm install
npm run build
```

### 2. Run as local stdio MCP server

```bash
npm run dev
```

### 3. Run as HTTP MCP server (`/mcp`)

```bash
npm run dev:http
```

Default URL: `http://127.0.0.1:3000/mcp`  
Health check: `http://127.0.0.1:3000/healthz`

## Live URLs

- Landing page: `https://dhruvtoprani.github.io/docflow-mcp/`
- Live MCP endpoint: `https://docflow-mcp.vercel.app/mcp`
- Live health check: `https://docflow-mcp.vercel.app/healthz`

## Local extraction demo

Run with sample input:

```bash
npm run dev:extract
```

Use a custom input file:

```bash
npm run dev:extract -- examples/sample-input.json
```

Print full JSON instead of markdown:

```bash
npm run dev:extract -- --json
```

## Evaluate real usefulness vs copy/paste

Run the workflow evaluator:

```bash
npm run eval:workflow
```

This compares:

- rendered browser copy/paste baseline
- DocFlow context pack

and scores both on practical implementation quality (correctness, security, runnable readiness, hallucination risk).

Reports are saved in `eval/results/`.

## Testing & Evaluation

DocFlow is evaluated against a rendered browser-copy baseline on implementation quality, safety, and readiness.

- Quality dimensions: implementation correctness, security hygiene, runnable readiness, hallucination risk
- Efficiency dimension: input context size reduction
- Result files: `eval/results/workflow-eval-*.json`

### Recent 3-run trend

| Run | DocFlow wins | Baseline wins | DocFlow avg total | Baseline avg total | DocFlow judge overall | Baseline judge overall | Input reduction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `2026-05-14T22-41-42-713Z` | 1 | 9 | 0.668 | 0.767 | 62.1 | 75.9 | 10.52% |
| `2026-05-14T23-14-12-041Z` | 3 | 7 | 0.715 | 0.734 | 68.5 | 70.4 | 30.24% |
| `2026-05-14T23-29-35-940Z` | 8 | 2 | 0.794 | 0.666 | 76.8 | 63.2 | 29.15% |

Interpretation:

- The project improved from regression to strong positive benchmark performance.
- Context stayed compact while quality increased.
- Continued repeated runs are recommended to monitor variance and guard against overfitting.

## Jobs To Be Done (JTBD)

When I ask an AI coding assistant to implement against external docs, help me:

- Pull only task-relevant documentation context, not entire pages.
- Preserve critical API anchors (methods, paths, headers, pagination/signature tokens).
- Produce reusable backend implementation patterns instead of one-off snippets.
- Reduce hallucination risk by grounding outputs in extracted docs evidence.
- Improve delivery speed and cost by shrinking prompt/context size.

## Environment variables

Use `.env.example` as reference.

- `DOCFLOW_HTTP_HOST` (default: `127.0.0.1`)
- `DOCFLOW_HTTP_PORT` (default: `3000`)
- `DOCFLOW_USER_AGENT` (optional custom outbound fetch user-agent)

## Connect to ChatGPT as a custom MCP connector

1. Deploy or tunnel the HTTP server so it is publicly reachable over HTTPS.
2. Ensure your connector URL points to `/mcp`.
3. In ChatGPT: `Settings -> Connectors -> Create`.
4. Set:

- Name: `DocFlow MCP`
- Description: `Documentation context compressor for coding assistants`
- URL: `https://docflow-mcp.vercel.app/mcp`

5. Save and test `extract_docs_context`.

## MCP client config example (stdio)

See [examples/mcp-servers.example.json](examples/mcp-servers.example.json).

## Scripts

- `npm run dev` - run stdio MCP server
- `npm run dev:http` - run Streamable HTTP MCP server
- `npm run dev:extract` - local extraction runner
- `npm run eval:workflow` - rubric-based workflow usefulness evaluation
- `npm run eval:ab` - fast keyword-based A/B evaluation
- `npm run build` - compile TypeScript
- `npm run test` - run tests
- `npm run lint` - lint source and tests
- `npm run format` - format repository

## Development

```bash
npm run lint
npm run build
npm test
```

## Scope (v0.1)

- Single-page documentation extraction
- MCP tool output for implementation context
- No frontend, no auth layer, no persistence

## Roadmap

- v0.2: docs map crawling (`crawl_docs_map`)
- v0.3: multi-page context pack generation
- v0.4: code-vs-doc validation tools
- v0.5: richer app integrations

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT - see [LICENSE](LICENSE).
