# Simple Setup Steps (Non-Technical)

This is the shortest path.

## What is already done

- GitHub repo is live.
- Landing page is live.
- Vercel server is live.
- MCP endpoint is live.

## Live links

- GitHub repo: https://github.com/dhruvtoprani/docflow-mcp
- Landing page: https://dhruvtoprani.github.io/docflow-mcp/
- MCP endpoint: https://docflow-mcp.vercel.app/mcp
- Health check: https://docflow-mcp.vercel.app/healthz

## Turn this into a ChatGPT connector

1. Open ChatGPT.
2. Go to `Settings`.
3. Click `Connectors`.
4. Click `Create`.
5. Fill in:
   - Name: `DocFlow MCP`
   - Description: `Extract implementation context from documentation URLs`
   - URL: `https://docflow-mcp.vercel.app/mcp`
6. Save.

## Quick test prompt to run in ChatGPT

Use this prompt:

```txt
Use DocFlow MCP to extract implementation context from this docs page:
https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api
Goal: Implement authenticated GitHub REST API requests in Node.js.
```

## If it does not work

1. Confirm health URL opens:
   - https://docflow-mcp.vercel.app/healthz
2. Re-open connector settings and make sure URL is exactly:
   - `https://docflow-mcp.vercel.app/mcp`
3. If still broken, open:
   - https://vercel.com/dhruv-kekin-topranis-projects/docflow-mcp
     and check latest deployment status.
