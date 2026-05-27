import { createRequire } from "node:module";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { configService } from "./config/config.service.js";
import { requireApiKey } from "./middleware/apiKeyAuth.js";
import { createAuthAwareRateLimiter } from "./middleware/rateLimiter.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import {
  genericErrorHandler,
  jsonParseErrorHandler,
  notFoundHandler,
} from "./middleware/errorHandling.js";
import { validateRequiredFields } from "./middleware/validation.js";
import { createContentNegotiationMiddleware } from "./middleware/contentNegotiation.js";
import { createRequestLogger } from "./middleware/requestLogger.js";
import {
  featureFlagContextMiddleware,
  initializeFeatureFlagsFromEnv,
} from "./middleware/featureFlags.js";
import type { BookingIntentService } from "./modules/booking-intents/booking-intent-service.js";
import type { SlotRepository } from "./modules/slots/slot-repository.js";
import { createBookingIntentsRouter } from "./routes/booking-intents.js";
import checkoutRouter from "./routes/checkout.js";

export interface AppFactoryOptions {
  apiKey?: string;
  enableDocs?: boolean;
  enableTestRoutes?: boolean;
  enableContentNegotiation?: boolean;
  contentNegotiationExcludePaths?: string[];
  slotRepository?: SlotRepository;
  bookingIntentService?: BookingIntentService;
}

function registerSwaggerDocs(app: express.Express) {
  const require = createRequire(import.meta.url);

  try {
    const swaggerUi = require("swagger-ui-express");
    const swaggerJsdoc = require("swagger-jsdoc");

    const options = {
      swaggerDefinition: {
        openapi: "3.0.0",
        info: {
          title: "ChronoPay API",
          version: "1.0.0",
          description: "API for ChronoPay payment and scheduling platform",
        },
        components: {
          securitySchemes: {
            // JWT Bearer token authentication
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description: "JWT token for user authentication (obtained from auth service)",
            },
            // Header-based authentication (current implementation)
            chronoPayAuth: {
              type: "apiKey",
              in: "header",
              name: "x-chronopay-user-id",
              description:
                "User ID header for authentication (must be paired with x-chronopay-role)",
            },
            // API Key authentication
            apiKeyAuth: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
              description: "API key for service-to-service authentication",
            },
            // Admin token authentication
            adminTokenAuth: {
              type: "apiKey",
              in: "header",
              name: "x-chronopay-admin-token",
              description: "Admin token for administrative operations",
            },
          },
          schemas: {
            ErrorEnvelope: {
              type: "object",
              properties: {
                success: {
                  type: "boolean",
                  example: false,
                },
                error: {
                  type: "string",
                  description: "Human-readable error message",
                },
                code: {
                  type: "string",
                  description: "Machine-readable error code for programmatic handling",
                },
              },
              required: ["success"],
            },
            UnauthorizedError: {
              allOf: [
                { $ref: "#/components/schemas/ErrorEnvelope" },
                {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      enum: [
                        "Authentication required",
                        "Missing API key",
                        "Missing required header: x-chronopay-admin-token",
                      ],
                    },
                  },
                },
              ],
            },
            ForbiddenError: {
              allOf: [
                { $ref: "#/components/schemas/ErrorEnvelope" },
                {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                      enum: [
                        "Role is not authorized for this action",
                        "Invalid API key",
                        "Invalid admin token",
                        "Insufficient permissions",
                      ],
                    },
                  },
                },
              ],
            },
          },
          responses: {
            UnauthorizedError: {
              description: "Authentication failed - missing or invalid credentials",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UnauthorizedError" },
                },
              },
            },
            ForbiddenError: {
              description: "Authorization failed - authenticated but insufficient permissions",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ForbiddenError" },
                },
              },
            },
          },
        },
        security: [
          // Default security requirement - can be overridden per endpoint
          { chronoPayAuth: [] },
        ],
      },
      apis: ["./src/routes/*.ts", "./src/index.ts"],
    };

    const specs = swaggerJsdoc(options);
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
  } catch {
    // Keep the service bootable in environments where API docs deps are not installed.
  }
}

function createSlot(req: Request, res: Response) {
  const { professional, startTime, endTime } = req.body;

  if (typeof startTime !== "number" || typeof endTime !== "number") {
    return res.status(422).json({
      success: false,
      error: "startTime and endTime must be numbers",
    });
  }

  if (endTime <= startTime) {
    return res.status(422).json({
      success: false,
      error: "endTime must be greater than startTime",
    });
  }

  return res.status(201).json({
    success: true,
    slot: {
      id: 1,
      professional,
      startTime,
      endTime,
    },
  });
}

export function createApp(options: AppFactoryOptions = {}) {
  const app = express();

  // ── Trust proxy configuration (for correct client IP behind load balancer) ─────
  if (configService.trustProxy) {
    app.set("trust proxy", 1);
  }

  // ── Initialize feature flags from environment ──────────────────────────────
  initializeFeatureFlagsFromEnv();

  // ── Security headers middleware (applied early) ────────────────────────────
  app.use(securityHeaders);

  app.use(cors());

  // Content negotiation BEFORE express.json() to reject invalid Content-Type early
  if (options.enableContentNegotiation !== false) {
    app.use(
      createContentNegotiationMiddleware({
        excludePaths: options.contentNegotiationExcludePaths,
      }),
    );
  }

  app.use(express.json({ limit: "100kb" }));
  app.use(createRequestLogger());

  // ── Feature flag context middleware (makes flags available to routes) ──────
  app.use(featureFlagContextMiddleware);

  if (options.enableDocs !== false) {
    registerSwaggerDocs(app);
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "chronopay-backend" });
  });

  app.get("/api/v1/slots", (_req, res) => {
    // Set cache header (mock implementation - always HIT for simplicity)
    res.set("X-Cache", "MISS");
    res.json({ slots: [] });
  });

  app.post(
    "/api/v1/slots",
    requireApiKey(options.apiKey),
    createAuthAwareRateLimiter(),
    validateRequiredFields(["professional", "startTime", "endTime"]),
    createSlot,
  );

  // ── Booking intents routes ─────────────────────────────────────────────────
  app.use("/api/v1/booking-intents", createBookingIntentsRouter());
  app.use("/api/v1/checkout", checkoutRouter);

  if (options.enableTestRoutes) {
    app.get("/__test__/explode", () => {
      throw new Error("Intentional test fault");
    });
  }

  // Ensure all API responses declare Content-Type: application/json
  app.use((_req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    next();
  });

  app.use(notFoundHandler);
  app.use(jsonParseErrorHandler);
  app.use(genericErrorHandler);

  return app;
}
