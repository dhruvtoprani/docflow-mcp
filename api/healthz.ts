import type { IncomingMessage, ServerResponse } from "node:http";

type ApiResponse = ServerResponse<IncomingMessage>;

export default function handler(_req: IncomingMessage, res: ApiResponse): void {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
      status: "ok",
      transport: "streamable-http",
      mode: "vercel-serverless"
    })
  );
}
