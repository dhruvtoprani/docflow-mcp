import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { cleanHtml } from "../core/cleanHtml.js";
import { extractDocsContext } from "../core/extractDocsContext.js";
import { fetchPage } from "../core/fetchPage.js";
import { htmlToMarkdown } from "../core/htmlToMarkdown.js";

type EvalTask = {
  id: string;
  url: string;
  goal: string;
  stack?: string;
  mustInclude: string[];
  mustAvoid?: string[];
};

type ModelRun = {
  label: "baseline" | "docflow";
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
  const cleaned = cleanHtml(page.html, page.url);
  const markdown = htmlToMarkdown(cleaned.contentHtml);
  return markdown.slice(0, maxChars);
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
}): Promise<TaskResult> {
  const baselineContext = await buildBaselineContext(args.task.url);
  const docflow = await extractDocsContext({
    url: args.task.url,
    goal: args.task.goal,
    stack: args.task.stack,
    maxChars: 12000
  });

  const baselinePrompt = buildPrompt(args.task, baselineContext);
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
    label: "baseline",
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
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.EVAL_MODEL || "gpt-5.5";
  const tasksPath = process.env.EVAL_TASKS_PATH || path.join(process.cwd(), "eval", "tasks.json");

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Set it in your shell before running eval.");
  }

  const raw = await readFile(tasksPath, "utf8");
  const tasks = JSON.parse(raw) as EvalTask[];

  const results: TaskResult[] = [];
  for (const task of tasks) {
    console.log(`Running task: ${task.id}`);
    const taskResult = await runTask({ apiKey, model, task });
    results.push(taskResult);

    console.log(
      `[${task.id}] baseline=${taskResult.baseline.score.toFixed(2)} docflow=${taskResult.docflow.score.toFixed(2)} winner=${taskResult.winner}`
    );
  }

  const summary = {
    model,
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
  console.log(`Saved report: ${outPath}`);
}

main().catch((error) => {
  console.error("A/B eval failed:", error);
  process.exit(1);
});
