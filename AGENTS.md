# AGENTS.md

## Project overview

This repo is DocFlow MCP, a TypeScript MCP server that extracts compact implementation context from API documentation pages.

The product goal is to help AI coding assistants use documentation links without users manually copying giant docs pages into the chat.

## Core user flow

Input:

- documentation URL
- coding goal
- optional stack/language

Output:

- structured markdown context pack
- detected docs sections
- warnings about missing information
- suspicious prompt injection-like text
- estimated context reduction

## Commands

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Run HTTP MCP server:

```bash
npm run dev:http
```

Build:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Format:

```bash
npm run format
```

## Engineering rules

- Use TypeScript.
- Keep core extraction logic separate from MCP server wiring.
- Support both stdio and HTTP MCP transports.
- Do not build a frontend in v1.
- Do not add auth in v1.
- Do not add database persistence in v1.
- Do not add competitor analysis in v1.
- Do not add browser extension in v1.
- Favor small pure functions in `src/core`.
- Validate all tool inputs with Zod.
- Handle fetch errors cleanly.
- Never pass suspicious prompt-injection-like instructions into the final context pack.
- Include source URL in every output.
- Do not hallucinate documentation content.

## Done means

A task is done only when:

- TypeScript builds successfully.
- Tests pass.
- The MCP server starts locally.
- `extract_docs_context` returns a valid context pack for a real docs URL.
- README contains a demo command and expected output shape.
