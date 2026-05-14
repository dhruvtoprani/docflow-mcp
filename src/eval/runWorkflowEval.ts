import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { extractDocsContext } from "../core/extractDocsContext.js";
import { fetchPage } from "../core/fetchPage.js";
import { createQuietJSDOM } from "../utils/createQuietJSDOM.js";

type EvalTask = {
  id: string;
  url?: string;
  urls?: string[];
  goal: string;
  stack?: string;
  mustInclude: string[];
  mustAvoid?: string[];
  acceptanceCriteria: string[];
  securityRequirements?: string[];
};

type BaselineMode = "rendered_browser_copy" | "naive_html_text";

type JudgeScore = {
  implementationCorrectness: number;
  securityHygiene: number;
  runnableReadiness: number;
  hallucinationRisk: number;
  overall: number;
  criticalMissingSteps: string[];
  unsafeClaims: string[];
  notes: string[];
};

type ModelRun = {
  label: "baseline_rendered_copy" | "baseline_naive_paste" | "docflow";
  inputChars: number;
  outputChars: number;
  latencyMs: number;
  ruleIncludeHits: number;
  ruleAvoidHits: number;
  ruleScore: number;
  judge: JudgeScore;
  totalScore: number;
  output: string;
};

type TaskResult = {
  taskId: string;
  baseline: ModelRun;
  docflow: ModelRun;
  winner: "baseline" | "docflow" | "tie";
};

type TaskFailure = {
  taskId: string;
  error: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

type EvalGoalProfile = "pagination" | "webhook" | "auth" | "generic";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeApiKey(raw: string): string {
  let key = raw.trim();

  if (key.toLowerCase().startsWith("bearer ")) {
    key = key.slice(7).trim();
  }

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

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      const candidate = trimmed.slice(first, last + 1);
      return JSON.parse(candidate) as Record<string, unknown>;
    }
    throw new Error("Could not parse judge JSON output.");
  }
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string").slice(0, 8);
}

function normalizeJudgeScore(raw: Record<string, unknown>): JudgeScore {
  const implementationCorrectness = clamp(Number(raw.implementationCorrectness ?? 0), 0, 5);
  const securityHygiene = clamp(Number(raw.securityHygiene ?? 0), 0, 5);
  const runnableReadiness = clamp(Number(raw.runnableReadiness ?? 0), 0, 5);
  const hallucinationRisk = clamp(Number(raw.hallucinationRisk ?? 0), 0, 5);
  const overall = clamp(Number(raw.overall ?? 0), 0, 100);

  return {
    implementationCorrectness,
    securityHygiene,
    runnableReadiness,
    hallucinationRisk,
    overall,
    criticalMissingSteps: toStringList(raw.criticalMissingSteps),
    unsafeClaims: toStringList(raw.unsafeClaims),
    notes: toStringList(raw.notes)
  };
}

function scoreOutputRules(
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

function getTaskUrls(task: EvalTask): string[] {
  const raw =
    Array.isArray(task.urls) && task.urls.length > 0
      ? task.urls
      : task.url
        ? [task.url]
        : [];

  const cleaned = raw.map((item) => item.trim()).filter((item) => item.length > 0);
  const unique = Array.from(new Set(cleaned));
  if (unique.length === 0) {
    throw new Error(`Task ${task.id} must include url or urls.`);
  }

  return unique;
}

function getPerSourceBudget(maxChars: number, sourceCount: number, minimum = 1500): number {
  if (sourceCount <= 0) {
    return maxChars;
  }
  return Math.max(minimum, Math.floor(maxChars / sourceCount));
}

function buildSourceBlock(url: string, text: string, maxChars: number): string {
  const header = `Source URL: ${url}\n`;
  const remaining = Math.max(0, maxChars - header.length);
  return `${header}${text.slice(0, remaining)}`;
}

function stitchBlocks(blocks: string[], maxChars: number): string {
  const parts: string[] = [];
  let remaining = maxChars;

  for (const block of blocks) {
    if (remaining <= 0) {
      break;
    }

    const separator = parts.length > 0 ? "\n\n" : "";
    const candidate = `${separator}${block}`;
    const slice = candidate.slice(0, remaining);
    parts.push(slice);
    remaining -= slice.length;
  }

  return parts.join("");
}

async function buildBaselineContext(urls: string[], maxChars = 12000): Promise<string> {
  const perSourceBudget = getPerSourceBudget(maxChars, urls.length);
  const blocks: string[] = [];

  for (const url of urls) {
    const page = await fetchPage(url);
    const dom = createQuietJSDOM(page.html, { url: page.url });
    const fullText = dom.window.document.body?.textContent || "";
    const normalized = fullText.replace(/\s+/g, " ").trim();
    blocks.push(buildSourceBlock(page.url, normalized, perSourceBudget));
  }

  return stitchBlocks(blocks, maxChars);
}

async function gotoWithFallback(page: {
  goto: (url: string, options: { waitUntil: "networkidle" | "domcontentloaded" | "load"; timeout: number }) => Promise<unknown>;
}, url: string): Promise<void> {
  const attempts: Array<{ waitUntil: "networkidle" | "domcontentloaded" | "load"; timeout: number }> = [
    { waitUntil: "networkidle", timeout: 45000 },
    { waitUntil: "domcontentloaded", timeout: 25000 },
    { waitUntil: "load", timeout: 25000 }
  ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      await page.goto(url, attempt);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${attempt.waitUntil}/${attempt.timeout}ms: ${message}`);
    }
  }

  throw new Error(`Failed to load ${url}\n${errors.join("\n")}`);
}

async function buildRenderedBaselineContext(urls: string[], maxChars = 12000): Promise<string> {
  const { chromium } = await import("playwright");
  const browserChannel = process.env.EVAL_BROWSER_CHANNEL?.trim();
  const browser = await chromium.launch({
    headless: true,
    ...(browserChannel ? { channel: browserChannel } : {})
  });

  try {
    const perSourceBudget = getPerSourceBudget(maxChars, urls.length);
    const blocks: string[] = [];

    for (const url of urls) {
      const page = await browser.newPage();
      await page.route("**/*", async (route) => {
        const type = route.request().resourceType();
        if (type === "image" || type === "media" || type === "font") {
          await route.abort();
          return;
        }
        await route.continue();
      });

      try {
        await gotoWithFallback(page, url);
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
        blocks.push(buildSourceBlock(page.url(), renderedText, perSourceBudget));
      } finally {
        await page.close();
      }
    }

    return stitchBlocks(blocks, maxChars);
  } finally {
    await browser.close();
  }
}

async function buildBaselineContextByMode(
  urls: string[],
  mode: BaselineMode,
  maxChars = 12000
): Promise<{ context: string; label: "baseline_rendered_copy" | "baseline_naive_paste" }> {
  if (mode === "rendered_browser_copy") {
    try {
      return {
        context: await buildRenderedBaselineContext(urls, maxChars),
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
          "  EVAL_BASELINE_MODE=naive_html_text npm run eval:workflow"
        ].join("\n")
      );
    }
  }

  return {
    context: await buildBaselineContext(urls, maxChars),
    label: "baseline_naive_paste"
  };
}

async function buildDocflowContext(task: EvalTask, maxChars = 12000): Promise<string> {
  const urls = getTaskUrls(task);
  const perSourceBudget = getPerSourceBudget(maxChars, urls.length, 2000);
  const blocks: string[] = [];

  for (const url of urls) {
    const extracted = await extractDocsContext({
      url,
      goal: task.goal,
      stack: task.stack,
      maxChars: perSourceBudget
    });
    blocks.push(buildSourceBlock(extracted.sourceUrl, extracted.contextPackMarkdown, perSourceBudget));
  }

  return stitchBlocks(blocks, maxChars);
}

function buildImplementationPrompt(task: EvalTask, context: string): string {
  const profile = detectEvalGoalProfile(task.goal);
  const profileRequirements =
    profile === "pagination"
      ? [
          "Pagination requirements:",
          "- Include a real cursor loop (no placeholder pseudocode).",
          "- Include has_more/next_cursor or equivalent continuation logic.",
          "- Include caller-configurable limit/page_size with guardrails."
        ]
      : profile === "webhook"
        ? [
            "Webhook requirements:",
            "- Provide a framework-ready middleware/helper shape (not only a standalone demo server).",
            "- Verify signature before parsing/processing business logic.",
            "- Include production URL reconstruction notes (proxy/external URL correctness)."
          ]
        : profile === "auth"
          ? [
              "Auth requirements:",
              "- Include exact required auth headers and API version headers.",
              "- Include explicit 401/403/404 handling with actionable messages.",
              "- Keep tokens/secrets server-side and out of logs."
            ]
          : [];

  return [
    "You are implementing a backend integration using documentation context.",
    `Goal: ${task.goal}`,
    task.stack ? `Stack: ${task.stack}` : "",
    "Return:",
    "1) A concise implementation plan with exact execution steps",
    "2) A complete TypeScript snippet that is directly runnable with env vars",
    "3) Failure modes and security notes",
    "4) A short validation checklist for testing",
    "Only use information supported by the provided context.",
    "If context is missing a critical detail, explicitly mark it as missing and do not guess.",
    ...profileRequirements,
    "",
    "Documentation Context:",
    context
  ]
    .filter(Boolean)
    .join("\n");
}

function detectEvalGoalProfile(goal: string): EvalGoalProfile {
  const text = goal.toLowerCase();
  if (/pagination|cursor|has_more|next_cursor|starting_after|ending_before/.test(text)) {
    return "pagination";
  }
  if (/webhook|signature|hmac|timingsafeequal|x-hub-signature|x-slack-signature|x-twilio-signature/.test(text)) {
    return "webhook";
  }
  if (/auth|authorization|token|bearer|oauth|api key/.test(text)) {
    return "auth";
  }
  return "generic";
}

function buildJudgePrompt(args: {
  task: EvalTask;
  candidateLabel: string;
  candidateOutput: string;
  contextExcerpt: string;
}): string {
  return [
    "You are evaluating assistant output quality for real implementation readiness.",
    "Score strictly according to rubric and return JSON only.",
    "",
    "Task:",
    `- id: ${args.task.id}`,
    `- goal: ${args.task.goal}`,
    args.task.stack ? `- stack: ${args.task.stack}` : "",
    "",
    "Acceptance criteria:",
    ...args.task.acceptanceCriteria.map((item, idx) => `- [${idx + 1}] ${item}`),
    "",
    "Security requirements:",
    ...(args.task.securityRequirements ?? ["Do not expose secrets client-side"])
      .map((item, idx) => `- [${idx + 1}] ${item}`),
    "",
    "Keyword anchors expected in good outputs:",
    ...args.task.mustInclude.map((item) => `- ${item}`),
    "",
    "Keyword anchors to avoid:",
    ...((args.task.mustAvoid ?? []).map((item) => `- ${item}`)),
    "",
    "Context excerpt used by the candidate (for hallucination checks):",
    args.contextExcerpt || "(empty)",
    "",
    `Candidate (${args.candidateLabel}) output:`,
    args.candidateOutput,
    "",
    "Rubric dimensions (0-5 each):",
    "- implementationCorrectness: includes critical steps and correct API details",
    "- securityHygiene: handles secrets/tokens safely and avoids insecure advice",
    "- runnableReadiness: code/config is complete and practically executable",
    "- hallucinationRisk: lower unsupported claims -> higher score",
    "",
    "Return strict JSON with this shape:",
    "{",
    '  "implementationCorrectness": number,',
    '  "securityHygiene": number,',
    '  "runnableReadiness": number,',
    '  "hallucinationRisk": number,',
    '  "overall": number,',
    '  "criticalMissingSteps": string[],',
    '  "unsafeClaims": string[],',
    '  "notes": string[]',
    "}",
    "",
    "overall should be 0-100 and reflect practical usefulness for a developer shipping this task."
  ]
    .filter(Boolean)
    .join("\n");
}

async function judgeCandidate(args: {
  apiKey: string;
  judgeModel: string;
  task: EvalTask;
  candidateLabel: string;
  candidateOutput: string;
  contextExcerpt: string;
}): Promise<JudgeScore> {
  const prompt = buildJudgePrompt({
    task: args.task,
    candidateLabel: args.candidateLabel,
    candidateOutput: args.candidateOutput,
    contextExcerpt: args.contextExcerpt
  });

  const response = await callOpenAI({
    apiKey: args.apiKey,
    model: args.judgeModel,
    prompt
  });

  const parsed = parseJsonObject(response.output);
  return normalizeJudgeScore(parsed);
}

function computeTotalScore(ruleScore: number, judgeOverall: number): number {
  const normalizedJudge = clamp(judgeOverall / 100, 0, 1);
  const normalizedRule = clamp(ruleScore, 0, 1);
  return normalizedJudge * 0.8 + normalizedRule * 0.2;
}

async function runTask(args: {
  apiKey: string;
  model: string;
  judgeModel: string;
  task: EvalTask;
  baselineMode: BaselineMode;
  maxChars: number;
}): Promise<TaskResult> {
  const taskUrls = getTaskUrls(args.task);
  const baselineData = await buildBaselineContextByMode(taskUrls, args.baselineMode, args.maxChars);
  const docflowContext = await buildDocflowContext(args.task, args.maxChars);

  const baselinePrompt = buildImplementationPrompt(args.task, baselineData.context);
  const docflowPrompt = buildImplementationPrompt(args.task, docflowContext);

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

  const baselineRule = scoreOutputRules(args.task, baselineCall.output);
  const docflowRule = scoreOutputRules(args.task, docflowCall.output);

  const baselineJudge = await judgeCandidate({
    apiKey: args.apiKey,
    judgeModel: args.judgeModel,
    task: args.task,
    candidateLabel: baselineData.label,
    candidateOutput: baselineCall.output,
    contextExcerpt: baselineData.context.slice(0, 3500)
  });

  const docflowJudge = await judgeCandidate({
    apiKey: args.apiKey,
    judgeModel: args.judgeModel,
    task: args.task,
    candidateLabel: "docflow",
    candidateOutput: docflowCall.output,
    contextExcerpt: docflowContext.slice(0, 3500)
  });

  const baseline: ModelRun = {
    label: baselineData.label,
    inputChars: baselinePrompt.length,
    outputChars: baselineCall.output.length,
    latencyMs: baselineCall.latencyMs,
    ruleIncludeHits: baselineRule.includeHits,
    ruleAvoidHits: baselineRule.avoidHits,
    ruleScore: baselineRule.score,
    judge: baselineJudge,
    totalScore: computeTotalScore(baselineRule.score, baselineJudge.overall),
    output: baselineCall.output
  };

  const docflowRun: ModelRun = {
    label: "docflow",
    inputChars: docflowPrompt.length,
    outputChars: docflowCall.output.length,
    latencyMs: docflowCall.latencyMs,
    ruleIncludeHits: docflowRule.includeHits,
    ruleAvoidHits: docflowRule.avoidHits,
    ruleScore: docflowRule.score,
    judge: docflowJudge,
    totalScore: computeTotalScore(docflowRule.score, docflowJudge.overall),
    output: docflowCall.output
  };

  const winner =
    docflowRun.totalScore > baseline.totalScore
      ? "docflow"
      : baseline.totalScore > docflowRun.totalScore
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
  const model = process.env.EVAL_MODEL || "gpt-5.4-mini";
  const judgeModel = process.env.EVAL_JUDGE_MODEL || "gpt-5.4-mini";
  const maxChars = Number(process.env.EVAL_MAX_CHARS || "12000");
  const tasksPath =
    process.env.EVAL_TASKS_PATH || path.join(process.cwd(), "eval", "workflow-tasks.json");
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
  const failures: TaskFailure[] = [];
  console.log(`Generation model: ${model}`);
  console.log(`Judge model: ${judgeModel}`);
  console.log(`Baseline mode: ${baselineMode}`);

  for (const task of tasks) {
    console.log(`Running workflow task: ${task.id}`);
    try {
      const taskResult = await runTask({
        apiKey,
        model,
        judgeModel,
        task,
        baselineMode,
        maxChars
      });
      results.push(taskResult);

      console.log(
        [
          `[${task.id}]`,
          `baseline_total=${taskResult.baseline.totalScore.toFixed(3)}`,
          `docflow_total=${taskResult.docflow.totalScore.toFixed(3)}`,
          `winner=${taskResult.winner}`
        ].join(" ")
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({
        taskId: task.id,
        error: message
      });
      console.error(`[${task.id}] failed: ${message}`);
    }
  }

  const summary = {
    model,
    judgeModel,
    baselineMode,
    maxChars,
    ranAt: new Date().toISOString(),
    taskCount: tasks.length,
    completedTaskCount: results.length,
    failedTaskCount: failures.length,
    baselineWins: results.filter((r) => r.winner === "baseline").length,
    docflowWins: results.filter((r) => r.winner === "docflow").length,
    ties: results.filter((r) => r.winner === "tie").length,
    avgBaselineTotalScore:
      results.reduce((acc, r) => acc + r.baseline.totalScore, 0) / Math.max(results.length, 1),
    avgDocflowTotalScore:
      results.reduce((acc, r) => acc + r.docflow.totalScore, 0) / Math.max(results.length, 1),
    avgBaselineJudgeOverall:
      results.reduce((acc, r) => acc + r.baseline.judge.overall, 0) / Math.max(results.length, 1),
    avgDocflowJudgeOverall:
      results.reduce((acc, r) => acc + r.docflow.judge.overall, 0) / Math.max(results.length, 1),
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
    results,
    failures
  };

  const outDir = path.join(process.cwd(), "eval", "results");
  await mkdir(outDir, { recursive: true });

  const filename = `workflow-eval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const outPath = path.join(outDir, filename);
  await writeFile(outPath, JSON.stringify(summary, null, 2), "utf8");

  console.log("\n=== Workflow Eval Summary ===");
  console.log(`Model: ${summary.model}`);
  console.log(`Judge: ${summary.judgeModel}`);
  console.log(`Completed tasks: ${summary.completedTaskCount}/${summary.taskCount}`);
  console.log(`Failed tasks: ${summary.failedTaskCount}`);
  console.log(`DocFlow wins: ${summary.docflowWins}`);
  console.log(`Baseline wins: ${summary.baselineWins}`);
  console.log(`Ties: ${summary.ties}`);
  console.log(`Avg baseline total: ${summary.avgBaselineTotalScore.toFixed(3)}`);
  console.log(`Avg docflow total: ${summary.avgDocflowTotalScore.toFixed(3)}`);
  console.log(`Avg baseline judge overall: ${summary.avgBaselineJudgeOverall.toFixed(2)}`);
  console.log(`Avg docflow judge overall: ${summary.avgDocflowJudgeOverall.toFixed(2)}`);
  console.log(`Avg baseline input chars: ${Math.round(summary.avgBaselineInputChars)}`);
  console.log(`Avg docflow input chars: ${Math.round(summary.avgDocflowInputChars)}`);
  console.log(
    `Avg input reduction vs baseline: ${summary.avgInputReductionPercentVsBaseline.toFixed(2)}%`
  );
  console.log(`Saved report: ${outPath}`);
}

main().catch((error) => {
  console.error("Workflow eval failed:", error);
  process.exit(1);
});
