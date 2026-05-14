import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createDocFlowMcpServer } from "../src/server/mcpServer.js";

function mockHtmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  });
}

describe("MCP harness", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lists and invokes extract_docs_context through MCP client/server transport", async () => {
    const html = `
<!doctype html>
<html>
  <head><title>API Docs</title></head>
  <body>
    <main>
      <h1>Send Email</h1>
      <p>Authorization: Bearer token</p>
      <p>POST /emails</p>
      <p>Request body: from, to, subject, html</p>
      <p>Response: 201 JSON</p>
    </main>
  </body>
</html>
`;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => mockHtmlResponse(html))
    );

    const server = createDocFlowMcpServer();
    const client = new Client({
      name: "docflow-test-client",
      version: "0.1.0"
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.some((tool) => tool.name === "extract_docs_context")).toBe(true);

    const result = await client.callTool({
      name: "extract_docs_context",
      arguments: {
        url: "https://docs.example.com/send-email",
        goal: "Send transactional email from backend",
        stack: "Node.js + TypeScript",
        maxChars: 2000
      }
    });

    const typedResult = result as { content: Array<{ type: string; text?: string }> };
    const textContent = typedResult.content.find((item) => item.type === "text");
    expect(textContent?.type).toBe("text");
    expect(textContent && "text" in textContent ? textContent.text : "").toContain(
      '"title": "API Docs"'
    );
    expect(textContent && "text" in textContent ? textContent.text : "").toContain(
      '"sourceUrl": "https://docs.example.com/send-email"'
    );

    await client.close();
    await server.close();
  });
});
