import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { clipDocsPage } from "../core/clipDocsPage.js";
import { createDocFlowMcpServer } from "./mcpServer.js";

type SessionRecord = {
  transport: StreamableHTTPServerTransport;
  close: () => Promise<void>;
};

type StartHttpServerOptions = {
  host?: string;
  port?: number;
};

type ClipBody = {
  url?: string;
  goal?: string;
  stack?: string;
  maxChars?: number;
  mode?: "clipper_context" | "clipper_markdown" | "clipper_text";
};

function setCorsHeaders(res: Response): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

export async function startHttpServer(options: StartHttpServerOptions = {}) {
  const host = options.host ?? process.env.DOCFLOW_HTTP_HOST ?? "127.0.0.1";
  const port = options.port ?? parseInt(process.env.DOCFLOW_HTTP_PORT || "3000", 10);
  const app = createMcpExpressApp({ host });
  const sessions: Record<string, SessionRecord> = {};

  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      transport: "streamable-http",
      activeSessions: Object.keys(sessions).length
    });
  });

  app.options("/clip", (_req: Request, res: Response) => {
    setCorsHeaders(res);
    res.status(204).end();
  });

  app.post("/clip", async (req: Request, res: Response) => {
    setCorsHeaders(res);

    try {
      const body = (req.body || {}) as ClipBody;
      const url = String(body.url || "").trim();

      if (!url) {
        res.status(400).json({ error: "Provide a documentation URL." });
        return;
      }

      const result = await clipDocsPage({
        url,
        goal: body.goal,
        stack: body.stack,
        maxChars: body.maxChars,
        mode: body.mode
      });

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Clip request failed."
      });
    }
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"];
    const sessionIdValue = Array.isArray(sessionId) ? sessionId[0] : sessionId;

    try {
      let session: SessionRecord | undefined;

      if (sessionIdValue && sessions[sessionIdValue]) {
        session = sessions[sessionIdValue];
      } else if (!sessionIdValue && isInitializeRequest(req.body)) {
        const server = createDocFlowMcpServer();
        let initializedSessionId: string | undefined;

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            initializedSessionId = newSessionId;
            sessions[newSessionId] = {
              transport,
              close: async () => {
                await transport.close();
                await server.close();
              }
            };
          }
        });

        transport.onclose = () => {
          if (initializedSessionId && sessions[initializedSessionId]) {
            delete sessions[initializedSessionId];
          }
        };

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided"
          },
          id: null
        });
        return;
      }

      await session.transport.handleRequest(req, res, req.body);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal server error"
          },
          id: null
        });
      }
    }
  });

  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"];
    const sessionIdValue = Array.isArray(sessionId) ? sessionId[0] : sessionId;

    if (!sessionIdValue || !sessions[sessionIdValue]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    await sessions[sessionIdValue].transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"];
    const sessionIdValue = Array.isArray(sessionId) ? sessionId[0] : sessionId;

    if (!sessionIdValue || !sessions[sessionIdValue]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    await sessions[sessionIdValue].transport.handleRequest(req, res);
  });

  const server = app.listen(port, host);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const resolvedPort = typeof address === "object" && address ? address.port : port;
  console.log(`DocFlow MCP HTTP server listening at http://${host}:${resolvedPort}/mcp`);

  const shutdown = async () => {
    const sessionIds = Object.keys(sessions);
    for (const sessionId of sessionIds) {
      try {
        await sessions[sessionId].close();
      } finally {
        delete sessions[sessionId];
      }
    }

    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };

  return { app, server, shutdown };
}
