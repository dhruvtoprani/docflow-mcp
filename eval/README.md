# Automated Eval Suite

This folder has two scoring modes plus a regression triage gate:

- `eval:ab`: fast A/B compare using keyword hit scoring.
- `eval:workflow`: deeper workflow scoring for implementation usefulness.
- `eval:triage`: aggregates the last N workflow runs and checks release thresholds.

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

## Baseline modes

- `rendered_browser_copy` (default): browser-rendered text, closest to select-all copy/paste.
- `naive_html_text`: fallback from raw HTML body text.

Rendered mode retries page loads with multiple wait strategies (`networkidle`, then `domcontentloaded`, then `load`) for better reliability on heavy docs sites.

Install browser runtime once for rendered mode:

```bash
npx playwright install chromium
```

## Run commands

Fast A/B:

```bash
npm run eval:ab
```

Workflow eval:

```bash
npm run eval:workflow
```

Triage last 3 workflow reports:

```bash
npm run eval:triage
```

## Recommended protocol (for product decisions)

Do not make roadmap decisions from a single run. Use this protocol:

1. Run `npm run eval:workflow` 3 times with the same model/task config.
2. Run `npm run eval:triage` to aggregate those results.
3. Only treat changes as real improvements when triage passes.

Default triage thresholds:

- `avgQualityDelta (docflow-baseline) >= 0`
- `avgInputReductionPercent >= 20`
- `avgFailedTasks <= 0`

You can override thresholds using env vars:

```bash
export EVAL_TRIAGE_SAMPLE_SIZE=3
export EVAL_TRIAGE_MIN_QUALITY_DELTA=0
export EVAL_TRIAGE_MIN_INPUT_REDUCTION=20
export EVAL_TRIAGE_MAX_FAILED_TASKS=0
```

To fail CI/local command on regression:

```bash
export EVAL_TRIAGE_FAIL_ON_REGRESSION=1
npm run eval:triage
```

## Output

JSON reports are saved to:

```txt
eval/results/
```

Files include:

- `ab-eval-<timestamp>.json`
- `workflow-eval-<timestamp>.json`
- `workflow-triage-<timestamp>.json`

## Customize tasks

- Fast A/B tasks: `eval/tasks.json`
- Workflow tasks: `eval/workflow-tasks.json`

Workflow task URL fields:

- `url`: single docs page
- `urls`: multi-page docs bundle (recommended for auth + endpoint + error pages)

If both are present, `urls` is used.

## Interpreting results

If DocFlow regresses, inspect each task's:

- `criticalMissingSteps`
- `unsafeClaims`
- `notes`

These identify where to improve extraction, compaction, and guardrails.

## Important

Do not paste your API key into chat messages. Keep it in environment variables only.
