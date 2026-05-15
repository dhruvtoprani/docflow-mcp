# DocFlow Clipper Chrome Extension (Wrapper)

This extension wraps DocFlow's clip endpoint so users can clip docs pages directly from Chrome.

## What it does

- Clip current tab or any URL
- Choose output mode (`LLM Context`, `Markdown`, `Plain Text`)
- Copy cleaned output from popup
- Configure backend endpoint in options page

## Install quickly

See full guide: [`INSTALL_AND_UPLOAD.md`](./INSTALL_AND_UPLOAD.md)

Short path:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder

## Default endpoint

`https://docflow-mcp.vercel.app/api/clip`
