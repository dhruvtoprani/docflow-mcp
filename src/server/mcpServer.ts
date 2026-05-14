import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { extractDocsContextTool } from "./tools/extractDocsContextTool.js";

export function createDocFlowMcpServer() {
  const server = new McpServer({
    name: "docflow-mcp",
    version: "0.1.0",
    websiteUrl: "https://github.com/dhruvtoprani/docflow-mcp"
  });

  server.registerTool(
    extractDocsContextTool.name,
    extractDocsContextTool.config,
    extractDocsContextTool.handler
  );

  return server;
}
