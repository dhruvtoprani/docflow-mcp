# Automated A/B Eval

This runs a programmed comparison between:

- `baseline`: rendered browser copy (or naive HTML text fallback)
- `docflow`: DocFlow context pack

Both are sent to the same model with the same task prompt.

## Setup

```bash
export OPENAI_API_KEY="your_key_here"
export EVAL_MODEL="gpt-5.5"
```

`EVAL_MODEL` is optional. Default is `gpt-5.5`.

Notes:

- Use the raw key value (`sk-...`), not `Bearer sk-...`.
- Keep the key on one line (no line breaks).

Baseline modes:

- `rendered_browser_copy` (default): browser-rendered text, closest to select-all copy/paste.
- `naive_html_text`: quick fallback from raw HTML body text.

Install browser runtime once for rendered mode:

```bash
npx playwright install chromium
```

## Run

```bash
npm run eval:ab
```

Fallback mode:

```bash
EVAL_BASELINE_MODE=naive_html_text npm run eval:ab
```

## Output

A JSON report is saved to:

```txt
eval/results/ab-eval-<timestamp>.json
```

Report includes:

- winner per task
- baseline/docflow score
- include-hit and avoid-hit counts
- prompt input chars
- response chars
- latency in ms

## Customize

Edit:

```txt
eval/tasks.json
```

Fields:

- `url`
- `goal`
- `stack`
- `mustInclude` (strings expected in good output)
- `mustAvoid` (anti-pattern strings)

## Important

Do not paste your API key into chat messages. Keep it in environment variables.
