import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { clipDocsPageTool } from "./tools/clipDocsPageTool.js";
import { extractDocsContextTool } from "./tools/extractDocsContextTool.js";
import { synthesizeDocsPagesTool } from "./tools/synthesizeDocsPagesTool.js";

export function createDocFlowMcpServer() {
  const server = new McpServer({
    name: "docflow-mcp",
    version: "0.2.0",
    websiteUrl: "https://github.com/dhruvtoprani/docflow-mcp"
  });

  server.registerTool(
    clipDocsPageTool.name,
    clipDocsPageTool.config,
    clipDocsPageTool.handler
  );

  server.registerTool(
    synthesizeDocsPagesTool.name,
    synthesizeDocsPagesTool.config,
    synthesizeDocsPagesTool.handler
  );

  server.registerTool(
    extractDocsContextTool.name,
    extractDocsContextTool.config,
    extractDocsContextTool.handler
  );

  return server;
}
