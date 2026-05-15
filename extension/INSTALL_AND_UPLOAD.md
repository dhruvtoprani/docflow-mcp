# DocFlow Chrome Extension: Download + Load Guide

This extension is **not** published to the Chrome Web Store.
Use this guide to install it manually on any Chrome browser.

## Option A: Download from GitHub (recommended)

1. Go to the repo: `https://github.com/dhruvtoprani/docflow-mcp`
2. Click **Code** -> **Download ZIP**
3. Unzip the file
4. Open the unzipped folder and locate: `docflow-mcp/extension/`

## Option B: Get only extension files

If someone sends you only the extension package, make sure this folder contains at least:

- `manifest.json`
- `popup.html`, `popup.js`, `popup.css`
- `options.html`, `options.js`, `options.css`
- `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

## Load into Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Pin **DocFlow Clipper** from the extensions menu

## First run

1. Open any documentation page
2. Click the extension icon
3. Click **Use Current Tab**
4. Choose a mode (`LLM Context`, `Markdown`, `Plain Text`)
5. Click **Clip**
6. Click **Copy** to copy output

## Endpoint configuration

Default backend endpoint:

`https://docflow-mcp.vercel.app/api/clip`

To change it:

1. Open extension popup
2. Click **Options**
3. Enter new endpoint URL
4. Save

## Troubleshooting

- If clip fails, test endpoint in browser:
  - `https://docflow-mcp.vercel.app/healthz`
- If extension does not appear, remove it and re-run **Load unpacked**.
- If popup is blank, ensure all files listed above exist in the folder.
