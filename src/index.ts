import { createServer, type Server, IncomingMessage, ServerResponse } from "http";
import { loadEnvConfig, type EnvConfig } from "./config/env.js";

export const SHUTDOWN_TIMEOUT_MS = 10_000;

let server: Server | undefined;
let isShuttingDown = false;
const activeRequests = new Set<IncomingMessage>();

export function setServer(s: Server | undefined): void {
  server = s;
}

export function resetShutdownFlag(): void {
  isShuttingDown = false;
}

export function getActiveRequestCount(): number {
  return activeRequests.size;
}

export function startServer(
  listener: { listen: (port: number, callback?: () => void) => unknown },
  config: EnvConfig,
) {
  return listener.listen(config.port, () => {
    console.log(`ChronoPay API listening on http://localhost:${config.port}`);
  });
}

loadEnvConfig();
const app = createApp();

  stopScheduler();

  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }

  const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
  while (activeRequests.size > 0 && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  await closePool();
}

async function shutdownWithTimeout(): Promise<void> {
  let forceExit = false;
  const timer = setTimeout(() => {
    forceExit = true;
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    await gracefulShutdown();
  } finally {
    clearTimeout(timer);
    if (!forceExit) {
      process.exit(0);
    }
  }
}

if (process.env.NODE_ENV !== "test") {
  const { createApp } = await import("./app.js");
  const config = loadEnvConfig();
  const app = createApp();
  server = createServer(app);

  server.on("request", (req: IncomingMessage, res: ServerResponse) => {
    activeRequests.add(req);
    const cleanup = () => activeRequests.delete(req);
    res.on("finish", cleanup);
    res.on("close", cleanup);
  });

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });

  const handleSignal = () => {
    if (!isShuttingDown) {
      void shutdownWithTimeout();
    }
  };

  process.on("SIGTERM", handleSignal);
  process.on("SIGINT", handleSignal);
}

export default server;
