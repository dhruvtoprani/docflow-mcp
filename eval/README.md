# Automated Eval Suite

This folder now has two evaluation tracks:

- `eval:ab`: fast A/B compare using keyword hit scoring.
- `eval:workflow`: deeper workflow scoring for real implementation usefulness.

## Setup

```bash
export OPENAI_API_KEY="your_key_here"
export EVAL_MODEL="gpt-5.4-mini"
```

Optional:

```bash
export EVAL_JUDGE_MODEL="gpt-5.4-mini"
export EVAL_BASELINE_MODE="rendered_browser_copy"
export EVAL_MAX_CHARS="12000"
```

Notes:

- Use raw key format `sk-...` (not `Bearer sk-...`).
- Keep the key on one line with no line breaks.

Baseline modes:

- `rendered_browser_copy` (default): browser-rendered text, closest to select-all copy/paste.
- `naive_html_text`: fallback from raw HTML body text.

Rendered mode now retries page loads with multiple wait strategies (`networkidle`, then `domcontentloaded`, then `load`) for better reliability on heavy docs sites.

Install browser runtime once for rendered mode:

```bash
npx playwright install chromium
```

## Run: Fast A/B

```bash
npm run eval:ab
```

## Run: Workflow Eval (Recommended)

```bash
npm run eval:workflow
```

This evaluates each output on:

- implementation correctness
- security hygiene
- runnable readiness
- hallucination risk

It combines rubric judging with rule-based anchors (`mustInclude` / `mustAvoid`) so we can inspect both score and failure reasons.

## Output

JSON reports are saved to:

```txt
eval/results/
```

Files:

- `ab-eval-<timestamp>.json`
- `workflow-eval-<timestamp>.json`

## Customize tasks

- Fast A/B tasks: `eval/tasks.json`
- Workflow tasks: `eval/workflow-tasks.json`

Workflow task URL fields:

- `url`: single docs page
- `urls`: multi-page docs bundle (recommended for auth + endpoint + error pages)

If both are present, `urls` is used.

## Interpreting results

If DocFlow is still worse, inspect each task's `criticalMissingSteps`, `unsafeClaims`, and `notes` fields.
That tells us exactly what product behavior to improve (compaction, section extraction, or warning generation).

## Important

Do not paste your API key into chat messages. Keep it in environment variables only.
