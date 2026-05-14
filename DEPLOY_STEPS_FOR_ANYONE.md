# Deploy Steps (Very Simple)

This file is written for someone with zero technical background.

## What is already done for you

- The app is built.
- A landing page exists in `docs/`.
- A GitHub Pages auto-deploy workflow exists.

## What you still need to do

### 1. Reconnect GitHub on your machine

Copy and run:

```bash
gh auth login -h github.com
```

Follow the prompts. Choose your normal GitHub account.

### 2. Create a GitHub repo and push this project

From this project folder, run:

```bash
git init
git add .
git commit -m "Initial DocFlow MCP release"
git branch -M main
gh repo create docflow-mcp --public --source=. --remote=origin --push
```

### 3. Turn on GitHub Pages

In your GitHub repo:

1. Click `Settings`
2. Click `Pages`
3. Under `Build and deployment`, choose `GitHub Actions`

That is it. Your landing page will deploy automatically.

### 4. Find your landing page URL

It will usually be:

```txt
https://YOUR_GITHUB_USERNAME.github.io/docflow-mcp/
```

### 5. Fix placeholder links

Open and edit these files:

- `README.md`
- `docs/index.html`
- `src/server/mcpServer.ts`

Replace:

```txt
https://github.com/your-username/docflow-mcp
```

with your real repo URL.

### 6. (Optional) Connect to ChatGPT as MCP connector

When you host the HTTP server publicly (not localhost), use:

```txt
https://your-domain.com/mcp
```

Then in ChatGPT:

1. Settings
2. Connectors
3. Create
4. Paste that `/mcp` URL

## If something fails

Run these and paste the error output:

```bash
npm run build
npm test
gh auth status
```
