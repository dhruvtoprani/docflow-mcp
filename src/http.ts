import { startHttpServer } from "./server/httpServer.js";

async function main() {
  const runtime = await startHttpServer();
  let shuttingDown = false;

  const handleShutdown = async () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    await runtime.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void handleShutdown();
  });
  process.on("SIGTERM", () => {
    void handleShutdown();
  });
}

main().catch((error) => {
  console.error("DocFlow MCP HTTP server failed to start:", error);
  process.exit(1);
});
