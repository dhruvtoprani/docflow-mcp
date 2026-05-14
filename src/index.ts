import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDocFlowMcpServer } from "./server/mcpServer.js";

async function main() {
  const server = createDocFlowMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("DocFlow MCP server failed to start:", error);
  process.exit(1);
});
