import "dotenv/config";
import { logInfo } from "./utils/logger.js";
import { loadEnvConfig } from "./config/env.js";
import { createApp } from "./app.js";
export { createApp };
import { register, metricsMiddleware } from "./metrics.js";
import { startScheduler } from "./scheduler/reminderScheduler.js";

const config = loadEnvConfig();
const PORT = config.port;

const app = createApp({
  enableDocs: true,
  enableTestRoutes: config.nodeEnv !== "production"
});

// Add metrics middleware
app.use(metricsMiddleware);

/**
 * @api {get} /metrics Get Prometheus metrics
 * @apiName GetMetrics
 * @apiGroup Monitoring
 * @apiDescription Exposes application metrics in Prometheus format.
 */
app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err instanceof Error ? err.message : String(err));
  }
});

if (config.nodeEnv !== "test") {
  startScheduler();

  app.listen(PORT, () => {
    logInfo(`ChronoPay API listening on http://localhost:${PORT}`, {
      port: PORT,
      environment: config.nodeEnv,
    });
  });
}

export default app;
