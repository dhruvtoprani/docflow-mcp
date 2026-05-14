import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { JSDOM } from "jsdom";
import { extractDocsContext } from "../core/extractDocsContext.js";
import { fetchPage } from "../core/fetchPage.js";

type EvalTask = {
  id: string;
  url: string;
  goal: string;
  stack?: string;
  mustInclude: string[];
  mustAvoid?: string[];
};

type BaselineMode = "rendered_browser_copy" | "naive_html_text";

type ModelRun = {
  label: "baseline_rendered_copy" | "baseline_naive_paste" | "docflow";
  inputChars: number;
  outputChars: number;
  latencyMs: number;
  includeHits: number;
  avoidHits: number;
  score: number;
  output: string;
};

type TaskResult = {
  taskId: string;
  baseline: ModelRun;
  docflow: ModelRun;
  winner: "baseline" | "docflow" | "tie";
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function normalizeApiKey(raw: string): string {
  let key = raw.trim();

  // Allow users to paste either "sk-..." or "Bearer sk-..."
  if (key.toLowerCase().startsWith("bearer ")) {
    key = key.slice(7).trim();
  }

  // Remove accidental whitespace/newlines from clipboard pastes.
  const withoutWhitespace = key.replace(/\s+/g, "");
  if (withoutWhitespace !== key) {
    console.warn("OPENAI_API_KEY contained whitespace/newlines. Auto-cleaned before request.");
  }

  if (!withoutWhitespace.startsWith("sk-")) {
    throw new Error("OPENAI_API_KEY format looks invalid. It should start with 'sk-'.");
  }

  if (withoutWhitespace.length < 20) {
    throw new Error("OPENAI_API_KEY looks too short after cleanup.");
  }

  return withoutWhitespace;
}

function extractOutputText(payload: OpenAIResponse): string {
  if (typeof payload.output_text === "string" && payload.output_text.length > 0) {
    return payload.output_text;
  }

  const chunks: string[] = [];
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" || typeof content.text === "string") {
        if (content.text) {
          chunks.push(content.text);
        }
      }
    }
  }

  return chunks.join("\n").trim();
}

function scoreOutput(
  task: EvalTask,
  output: string
): {
  includeHits: number;
  avoidHits: number;
  score: number;
} {
  const text = output.toLowerCase();
  const includeHits = task.mustInclude.filter((needle) =>
    text.includes(needle.toLowerCase())
  ).length;
  const avoidHits = (task.mustAvoid ?? []).filter((needle) =>
    text.includes(needle.toLowerCase())
  ).length;

  const includeScore = task.mustInclude.length > 0 ? includeHits / task.mustInclude.length : 0;
  const penalty = avoidHits * 0.25;
  const score = Math.max(0, includeScore - penalty);

  return { includeHits, avoidHits, score };
}

async function callOpenAI(args: {
  apiKey: string;
  model: string;
  prompt: string;
}): Promise<{ output: string; latencyMs: number }> {
  const started = Date.now();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${args.apiKey}`
    },
    body: JSON.stringify({
      model: args.model,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: args.prompt }]
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as OpenAIResponse;
  const output = extractOutputText(payload);
  const latencyMs = Date.now() - started;

  return { output, latencyMs };
}

async function buildBaselineContext(url: string, maxChars = 12000): Promise<string> {
  const page = await fetchPage(url);
  const dom = new JSDOM(page.html, { url: page.url });
  const fullText = dom.window.document.body?.textContent || "";
  const normalized = fullText.replace(/\s+/g, " ").trim();
  return normalized.slice(0, maxChars);
}

async function buildRenderedBaselineContext(url: string, maxChars = 12000): Promise<string> {
  const { chromium } = await import("playwright");
  const browserChannel = process.env.EVAL_BROWSER_CHANNEL?.trim();
  const browser = await chromium.launch({
    headless: true,
    ...(browserChannel ? { channel: browserChannel } : {})
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 45000
    });

    // Expand common collapsible docs blocks before copy extraction.
    await page.evaluate(() => {
      document.querySelectorAll("details").forEach((el) => {
        const details = el as HTMLDetailsElement;
        details.open = true;
      });
    });

    const renderedText = await page.evaluate(() => {
      const text = document.body?.innerText || "";
      return text.replace(/\s+/g, " ").trim();
    });

    return renderedText.slice(0, maxChars);
  } finally {
    await browser.close();
  }
}

async function buildBaselineContextByMode(
  url: string,
  mode: BaselineMode,
  maxChars = 12000
): Promise<{ context: string; label: "baseline_rendered_copy" | "baseline_naive_paste" }> {
  if (mode === "rendered_browser_copy") {
    try {
      return {
        context: await buildRenderedBaselineContext(url, maxChars),
        label: "baseline_rendered_copy"
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        [
          `Rendered baseline failed: ${message}`,
          "Install browser runtime and retry:",
          "  npx playwright install chromium",
          "Or force naive mode:",
          "  EVAL_BASELINE_MODE=naive_html_text npm run eval:ab"
        ].join("\n")
      );
    }
  }

  return {
    context: await buildBaselineContext(url, maxChars),
    label: "baseline_naive_paste"
  };
}

function buildPrompt(task: EvalTask, context: string): string {
  return [
    "You are implementing a backend integration using documentation context.",
    `Goal: ${task.goal}`,
    task.stack ? `Stack: ${task.stack}` : "",
    "Return:",
    "1) A concise implementation summary",
    "2) A complete TypeScript code snippet",
    "3) Key error handling + security notes",
    "Only use information supported by the provided context.",
    "",
    "Documentation Context:",
    context
  ]
    .filter(Boolean)
    .join("\n");
}

async function runTask(args: {
  apiKey: string;
  model: string;
  task: EvalTask;
  baselineMode: BaselineMode;
}): Promise<TaskResult> {
  const baselineData = await buildBaselineContextByMode(args.task.url, args.baselineMode);
  const docflow = await extractDocsContext({
    url: args.task.url,
    goal: args.task.goal,
    stack: args.task.stack,
    maxChars: 12000
  });

  const baselinePrompt = buildPrompt(args.task, baselineData.context);
  const docflowPrompt = buildPrompt(args.task, docflow.contextPackMarkdown);

  const baselineCall = await callOpenAI({
    apiKey: args.apiKey,
    model: args.model,
    prompt: baselinePrompt
  });

  const docflowCall = await callOpenAI({
    apiKey: args.apiKey,
    model: args.model,
    prompt: docflowPrompt
  });

  const baselineScore = scoreOutput(args.task, baselineCall.output);
  const docflowScore = scoreOutput(args.task, docflowCall.output);

  const baseline: ModelRun = {
    label: baselineData.label,
    inputChars: baselinePrompt.length,
    outputChars: baselineCall.output.length,
    latencyMs: baselineCall.latencyMs,
    includeHits: baselineScore.includeHits,
    avoidHits: baselineScore.avoidHits,
    score: baselineScore.score,
    output: baselineCall.output
  };

  const docflowRun: ModelRun = {
    label: "docflow",
    inputChars: docflowPrompt.length,
    outputChars: docflowCall.output.length,
    latencyMs: docflowCall.latencyMs,
    includeHits: docflowScore.includeHits,
    avoidHits: docflowScore.avoidHits,
    score: docflowScore.score,
    output: docflowCall.output
  };

  const winner =
    docflowRun.score > baseline.score
      ? "docflow"
      : baseline.score > docflowRun.score
        ? "baseline"
        : "tie";

  return {
    taskId: args.task.id,
    baseline,
    docflow: docflowRun,
    winner
  };
}

async function main() {
  const rawApiKey = process.env.OPENAI_API_KEY;
  const model = process.env.EVAL_MODEL || "gpt-5.5";
  const tasksPath = process.env.EVAL_TASKS_PATH || path.join(process.cwd(), "eval", "tasks.json");
  const baselineModeEnv = (process.env.EVAL_BASELINE_MODE || "rendered_browser_copy").trim();
  const baselineMode: BaselineMode =
    baselineModeEnv === "naive_html_text" ? "naive_html_text" : "rendered_browser_copy";

  if (!rawApiKey) {
    throw new Error("Missing OPENAI_API_KEY. Set it in your shell before running eval.");
  }
  const apiKey = normalizeApiKey(rawApiKey);

  const raw = await readFile(tasksPath, "utf8");
  const tasks = JSON.parse(raw) as EvalTask[];

  const results: TaskResult[] = [];
  console.log(`Baseline mode: ${baselineMode}`);
  for (const task of tasks) {
    console.log(`Running task: ${task.id}`);
    const taskResult = await runTask({ apiKey, model, task, baselineMode });
    results.push(taskResult);

    console.log(
      `[${task.id}] baseline=${taskResult.baseline.score.toFixed(2)} docflow=${taskResult.docflow.score.toFixed(2)} winner=${taskResult.winner}`
    );
  }

  const summary = {
    model,
    baselineMode,
    ranAt: new Date().toISOString(),
    taskCount: results.length,
    baselineWins: results.filter((r) => r.winner === "baseline").length,
    docflowWins: results.filter((r) => r.winner === "docflow").length,
    ties: results.filter((r) => r.winner === "tie").length,
    avgBaselineScore:
      results.reduce((acc, r) => acc + r.baseline.score, 0) / Math.max(results.length, 1),
    avgDocflowScore:
      results.reduce((acc, r) => acc + r.docflow.score, 0) / Math.max(results.length, 1),
    avgBaselineInputChars:
      results.reduce((acc, r) => acc + r.baseline.inputChars, 0) / Math.max(results.length, 1),
    avgDocflowInputChars:
      results.reduce((acc, r) => acc + r.docflow.inputChars, 0) / Math.max(results.length, 1),
    avgInputReductionPercentVsBaseline:
      results.reduce(
        (acc, r) =>
          acc + ((r.baseline.inputChars - r.docflow.inputChars) / r.baseline.inputChars) * 100,
        0
      ) / Math.max(results.length, 1) || 0,
    results
  };

  const outDir = path.join(process.cwd(), "eval", "results");
  await mkdir(outDir, { recursive: true });

  const filename = `ab-eval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const outPath = path.join(outDir, filename);
  await writeFile(outPath, JSON.stringify(summary, null, 2), "utf8");

  console.log("\n=== Summary ===");
  console.log(`Model: ${summary.model}`);
  console.log(`DocFlow wins: ${summary.docflowWins}`);
  console.log(`Baseline wins: ${summary.baselineWins}`);
  console.log(`Ties: ${summary.ties}`);
  console.log(`Avg baseline score: ${summary.avgBaselineScore.toFixed(3)}`);
  console.log(`Avg docflow score: ${summary.avgDocflowScore.toFixed(3)}`);
  console.log(`Avg baseline input chars: ${Math.round(summary.avgBaselineInputChars)}`);
  console.log(`Avg docflow input chars: ${Math.round(summary.avgDocflowInputChars)}`);
  console.log(
    `Avg input reduction vs baseline: ${summary.avgInputReductionPercentVsBaseline.toFixed(2)}%`
  );
  console.log(`Saved report: ${outPath}`);
}

main().catch((error) => {
  console.error("A/B eval failed:", error);
  process.exit(1);
});
