import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

type WorkflowSummary = {
  ranAt?: string;
  avgBaselineTotalScore: number;
  avgDocflowTotalScore: number;
  avgBaselineJudgeOverall: number;
  avgDocflowJudgeOverall: number;
  avgBaselineInputChars: number;
  avgDocflowInputChars: number;
  avgInputReductionPercentVsBaseline: number;
  baselineWins: number;
  docflowWins: number;
  ties: number;
  completedTaskCount: number;
  failedTaskCount: number;
};

type TriageReport = {
  ranAt: string;
  sourceFiles: string[];
  sampleSize: number;
  thresholds: {
    minQualityDelta: number;
    minInputReductionPercent: number;
    maxFailedTasksPerRun: number;
  };
  aggregates: {
    avgQualityDelta: number;
    avgJudgeDelta: number;
    avgInputReductionPercent: number;
    avgDocflowWins: number;
    avgBaselineWins: number;
    avgFailedTasks: number;
  };
  gate: {
    pass: boolean;
    failures: string[];
  };
};

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isWorkflowSummary(value: unknown): value is WorkflowSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<WorkflowSummary>;
  return (
    typeof item.avgBaselineTotalScore === "number" &&
    typeof item.avgDocflowTotalScore === "number" &&
    typeof item.avgBaselineJudgeOverall === "number" &&
    typeof item.avgDocflowJudgeOverall === "number" &&
    typeof item.avgInputReductionPercentVsBaseline === "number" &&
    typeof item.docflowWins === "number" &&
    typeof item.baselineWins === "number" &&
    typeof item.failedTaskCount === "number"
  );
}

async function getLatestWorkflowReports(resultsDir: string, sampleSize: number): Promise<string[]> {
  const files = await readdir(resultsDir);

  return files
    .filter((file) => file.startsWith("workflow-eval-") && file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .slice(-sampleSize)
    .map((file) => path.join(resultsDir, file));
}

async function loadSummaries(files: string[]): Promise<WorkflowSummary[]> {
  const summaries: WorkflowSummary[] = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isWorkflowSummary(parsed)) {
      throw new Error(`Invalid workflow summary shape: ${file}`);
    }
    summaries.push(parsed);
  }

  return summaries;
}

function buildGate(report: TriageReport): TriageReport["gate"] {
  const failures: string[] = [];

  if (report.aggregates.avgQualityDelta < report.thresholds.minQualityDelta) {
    failures.push(
      `avgQualityDelta ${report.aggregates.avgQualityDelta.toFixed(3)} < minQualityDelta ${report.thresholds.minQualityDelta.toFixed(3)}`
    );
  }

  if (report.aggregates.avgInputReductionPercent < report.thresholds.minInputReductionPercent) {
    failures.push(
      `avgInputReductionPercent ${report.aggregates.avgInputReductionPercent.toFixed(2)}% < minInputReductionPercent ${report.thresholds.minInputReductionPercent.toFixed(2)}%`
    );
  }

  if (report.aggregates.avgFailedTasks > report.thresholds.maxFailedTasksPerRun) {
    failures.push(
      `avgFailedTasks ${report.aggregates.avgFailedTasks.toFixed(2)} > maxFailedTasksPerRun ${report.thresholds.maxFailedTasksPerRun.toFixed(2)}`
    );
  }

  return {
    pass: failures.length === 0,
    failures
  };
}

async function main() {
  const sampleSize = Math.max(1, Math.floor(toNumber(process.env.EVAL_TRIAGE_SAMPLE_SIZE, 3)));
  const minQualityDelta = toNumber(process.env.EVAL_TRIAGE_MIN_QUALITY_DELTA, 0);
  const minInputReductionPercent = toNumber(process.env.EVAL_TRIAGE_MIN_INPUT_REDUCTION, 20);
  const maxFailedTasksPerRun = toNumber(process.env.EVAL_TRIAGE_MAX_FAILED_TASKS, 0);
  const failOnRegression = process.env.EVAL_TRIAGE_FAIL_ON_REGRESSION === "1";

  const resultsDir = path.join(process.cwd(), "eval", "results");
  const latestFiles = await getLatestWorkflowReports(resultsDir, sampleSize);

  if (latestFiles.length === 0) {
    throw new Error("No workflow eval reports found in eval/results.");
  }

  const summaries = await loadSummaries(latestFiles);

  const qualityDeltas = summaries.map((item) => item.avgDocflowTotalScore - item.avgBaselineTotalScore);
  const judgeDeltas = summaries.map(
    (item) => item.avgDocflowJudgeOverall - item.avgBaselineJudgeOverall
  );

  const report: TriageReport = {
    ranAt: new Date().toISOString(),
    sourceFiles: latestFiles,
    sampleSize: summaries.length,
    thresholds: {
      minQualityDelta,
      minInputReductionPercent,
      maxFailedTasksPerRun
    },
    aggregates: {
      avgQualityDelta: mean(qualityDeltas),
      avgJudgeDelta: mean(judgeDeltas),
      avgInputReductionPercent: mean(
        summaries.map((item) => item.avgInputReductionPercentVsBaseline)
      ),
      avgDocflowWins: mean(summaries.map((item) => item.docflowWins)),
      avgBaselineWins: mean(summaries.map((item) => item.baselineWins)),
      avgFailedTasks: mean(summaries.map((item) => item.failedTaskCount))
    },
    gate: {
      pass: true,
      failures: []
    }
  };

  report.gate = buildGate(report);

  const filename = `workflow-triage-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const outPath = path.join(resultsDir, filename);
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== Workflow Triage ===");
  console.log(`Reports analyzed: ${report.sampleSize}`);
  console.log(`Avg quality delta (docflow-baseline): ${report.aggregates.avgQualityDelta.toFixed(3)}`);
  console.log(`Avg judge delta (docflow-baseline): ${report.aggregates.avgJudgeDelta.toFixed(2)}`);
  console.log(
    `Avg input reduction: ${report.aggregates.avgInputReductionPercent.toFixed(2)}%`
  );
  console.log(`Avg docflow wins: ${report.aggregates.avgDocflowWins.toFixed(2)}`);
  console.log(`Avg baseline wins: ${report.aggregates.avgBaselineWins.toFixed(2)}`);
  console.log(`Avg failed tasks: ${report.aggregates.avgFailedTasks.toFixed(2)}`);
  console.log(`Gate: ${report.gate.pass ? "PASS" : "FAIL"}`);

  if (!report.gate.pass) {
    for (const failure of report.gate.failures) {
      console.log(`- ${failure}`);
    }
  }

  console.log(`Saved triage report: ${outPath}`);

  if (failOnRegression && !report.gate.pass) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Eval triage failed:", error);
  process.exit(1);
});
