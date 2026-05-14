import { readFile } from "node:fs/promises";
import { extractDocsContext } from "../core/extractDocsContext.js";
import type { ExtractDocsContextInput } from "../types/docflow.js";

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const inputPath = args.find((arg) => !arg.startsWith("--")) || "examples/sample-input.json";
  const rawInput = await readFile(inputPath, "utf8");
  const input = JSON.parse(rawInput) as ExtractDocsContextInput;

  const result = await extractDocsContext(input);
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.contextPackMarkdown);
}

main().catch((error) => {
  console.error("Local extraction demo failed:", error);
  process.exit(1);
});
