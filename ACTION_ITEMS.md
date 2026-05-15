# DocFlow MCP Action Items

## Core Action Item (Primary)

Reuse the existing DocFlow extraction and compaction pipeline to ship a Clipper product that can synthesize documentation pages effortlessly.

## Product Scope

- Turn DocFlow into a clipper-first MCP product.
- Keep token usage low while preserving implementation-critical anchors.
- Support both single-page clip and multi-page synthesis workflows.

## Shipping Checklist

### P0 - Clipper Core
- [x] Add `clip_docs_page` MCP tool with copy-ready output modes.
- [x] Add `synthesize_docs_pages` MCP tool for multi-page synthesis.
- [x] Reuse current extraction pipeline (cleaning, safety filtering, compaction).
- [x] Keep legacy `extract_docs_context` for compatibility.

### P0 - Proof + Messaging
- [x] Rewrite README to clipper-first positioning.
- [x] Add landing-page working proof with copyable output demo.
- [x] Update MCP server registration to expose clipper tools.

### P1 - Reliability
- [x] Add tests for new tools.
- [x] Ensure lint, test, and build pass after pivot.
- [ ] Run eval workflow + triage on clipper-centric task set and publish results.

### P1 - Wrapper Readiness
- [ ] Add extension-facing API contract doc (`clip_docs_page` payload conventions).
- [ ] Add Chrome extension wrapper scaffold using current MCP outputs.

## Current Status

DocFlow MCP is now functionally clipper-first and ready to move into Chrome extension wrapper implementation.
