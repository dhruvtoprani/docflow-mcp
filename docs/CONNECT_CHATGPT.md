# Connect DocFlow MCP to ChatGPT

## Prerequisites

- Public HTTPS URL reachable by ChatGPT
- MCP endpoint exposed at `/mcp`

## Steps

1. Use this live MCP URL:

```txt
https://docflow-mcp.vercel.app/mcp
```

2. Confirm health endpoint works:

```bash
curl https://docflow-mcp.vercel.app/healthz
```

3. In ChatGPT, open:

- `Settings`
- `Connectors`
- `Create`

4. Enter connector details:

- Name: `DocFlow MCP`
- Description: `Extract implementation context from documentation URLs`
- URL: `https://docflow-mcp.vercel.app/mcp`

5. Save and run a test prompt that triggers `extract_docs_context`.

## Notes

- This repo supports both `stdio` and HTTP transports.
- ChatGPT connector workflows require public HTTPS to `/mcp`.
- Localhost-only servers are not directly reachable by ChatGPT without tunneling.
