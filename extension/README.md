# DocFlow Clipper Chrome Extension (Wrapper)

This extension is a lightweight wrapper around DocFlow's clip endpoint.

## Current state

- Popup UI for clipping the current tab or any URL
- Output mode switch (LLM context, markdown, plain text)
- Copy output directly from popup
- Configurable backend endpoint via options page

## Load locally

1. Open Chrome -> `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder

## Default endpoint

`https://docflow-mcp.vercel.app/api/clip`

You can change this in extension options.
