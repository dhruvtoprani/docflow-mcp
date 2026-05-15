import type { IncomingMessage, ServerResponse } from "node:http";
import { clipDocsPage } from "../src/core/clipDocsPage.js";

type ApiRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type ClipBody = {
  url?: string;
  goal?: string;
  stack?: string;
  maxChars?: number;
  mode?: "clipper_context" | "clipper_markdown" | "clipper_text";
};

function setCorsHeaders(res: ApiResponse): void {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

function sendJson(res: ApiResponse, statusCode: number, payload: unknown): void {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function parseBody(raw: unknown): ClipBody {
  if (!raw) {
    return {};
  }

  if (typeof raw === "string") {
    return JSON.parse(raw) as ClipBody;
  }

  if (typeof raw === "object") {
    return raw as ClipBody;
  }

  return {};
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("allow", "POST, OPTIONS");
    res.end("Method Not Allowed");
    return;
  }

  try {
    const body = parseBody(req.body);
    const url = String(body.url || "").trim();

    if (!url) {
      sendJson(res, 400, { error: "Provide a documentation URL." });
      return;
    }

    const result = await clipDocsPage({
      url,
      goal: body.goal,
      stack: body.stack,
      maxChars: body.maxChars,
      mode: body.mode
    });

    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Clip request failed."
    });
  }
}
