import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { startHttpServer } from "../src/server/httpServer.js";

const runtimes: Array<{ shutdown: () => Promise<void> }> = [];

afterEach(async () => {
  while (runtimes.length > 0) {
    const runtime = runtimes.pop();
    if (runtime) {
      await runtime.shutdown();
    }
  }
});

describe("httpServer", () => {
  it("serves health endpoint and rejects invalid session requests", async () => {
    const runtime = await startHttpServer({
      host: "127.0.0.1",
      port: 0
    });
    runtimes.push(runtime);

    const address = runtime.server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${baseUrl}/healthz`);
    const healthJson = (await health.json()) as {
      status: string;
      transport: string;
      activeSessions: number;
    };

    expect(health.status).toBe(200);
    expect(healthJson.status).toBe("ok");
    expect(healthJson.transport).toBe("streamable-http");

    const invalidMcpGet = await fetch(`${baseUrl}/mcp`);
    expect(invalidMcpGet.status).toBe(400);
  });
});
