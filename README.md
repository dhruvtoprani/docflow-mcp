# DocFlow Clipper MCP

DocFlow is an MCP-native documentation clipper for AI coding workflows.

It turns noisy docs pages into clean, copy-ready context for ChatGPT, Claude, Cursor, and agentic coding tools.

## Why it exists

Most docs pages are full of UI chrome, repeated nav text, and irrelevant blocks. That wastes tokens and hurts answer quality.

DocFlow keeps only implementation-relevant content.

## What you get

- `clip_docs_page`: clip one docs URL into AI-ready context
- `synthesize_docs_pages`: merge multiple docs pages into one implementation pack
- output modes: `clipper_context`, `clipper_markdown`, `clipper_text`
- HTTP clip endpoint for demos, extensions, and app integrations

## Quick start (local)

```bash
git clone https://github.com/dhruvtoprani/docflow-mcp.git
cd docflow-mcp
npm install
npm run build
npm run dev:http
```

Endpoints:

- MCP: `http://127.0.0.1:3000/mcp`
- Clip API: `http://127.0.0.1:3000/clip`
- Health: `http://127.0.0.1:3000/healthz`

## Live links

- Landing page with demo: `https://dhruvtoprani.github.io/docflow-mcp/`
- Live MCP endpoint: `https://docflow-mcp.vercel.app/mcp`
- Live clip endpoint: `https://docflow-mcp.vercel.app/api/clip`

## Chrome extension (quick load)

A lightweight extension wrapper lives in [`extension/`](./extension).

For handing this off to someone else, use:

- [`extension/INSTALL_AND_UPLOAD.md`](./extension/INSTALL_AND_UPLOAD.md)

## Minimal tool input examples

### `clip_docs_page`

```json
{
  "url": "https://docs.stripe.com/api/pagination",
  "mode": "clipper_context",
  "maxChars": 12000
}
```

### `synthesize_docs_pages`

```json
{
  "urls": [
    "https://docs.stripe.com/api/pagination",
    "https://docs.stripe.com/api/errors"
  ],
  "mode": "clipper_context",
  "maxChars": 16000
}
```

## Scripts

- `npm run dev` - stdio MCP server
- `npm run dev:http` - HTTP MCP server
- `npm run test` - test suite
- `npm run lint` - lint
- `npm run build` - compile

## Tiny eval note

Evaluation artifacts live in `eval/` and can be run with `npm run eval:workflow`.

## License

MIT.
