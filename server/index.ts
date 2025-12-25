import './bootstrap-env';
import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import crypto from "crypto";
import { type IncomingMessage, type ServerResponse } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureSchemaColumns } from "./ensure-schema";
import { createServer as createNetServer } from "net";
import { createSessionMiddleware } from "./auth";
import { apiRateLimiter } from "./security";
import { createUploadsRouter } from "./uploads";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

declare global {
  namespace Express {
    interface Locals {
      cspNonce?: string;
    }
  }
}

const isProduction = app.get("env") === "production";

const nonceDirective = (_req: IncomingMessage, res: ServerResponse): string => {
  const expressRes = res as Response;
  return `'nonce-${expressRes.locals.cspNonce ?? ""}'`;
};

app.use((_, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.use(helmet({
  contentSecurityPolicy: isProduction
    ? {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            nonceDirective,
            "https://www.youtube.com",
            "https://player.vimeo.com",
          ],
          scriptSrcAttr: ["'none'"],
          styleSrc: [
            "'self'",
            nonceDirective,
            "https://fonts.googleapis.com",
          ],
          styleSrcElem: [
            "'self'",
            nonceDirective,
            "https://fonts.googleapis.com",
          ],
          styleSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com"],
          mediaSrc: ["'self'", "data:", "blob:", "https://*.scdn.co", "https://*.spotifycdn.com", "https://open.spotify.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          connectSrc: ["'self'", "https://graph.instagram.com", "https://www.instagram.com", "https://open.spotify.com"],
          frameSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com", "https://www.instagram.com", "https://open.spotify.com"],
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  referrerPolicy: { policy: "no-referrer" },
}));
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(createSessionMiddleware());
app.use("/api", apiRateLimiter);

app.use("/uploads", createUploadsRouter());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await ensureSchemaColumns();
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const envPort = process.env.PORT;
  const preferredPort = parseInt(envPort || '5000', 10);
  const usingExplicitPort = Boolean(envPort);

  const pickPort = async () => {
    if (usingExplicitPort) {
      return preferredPort;
    }

    let candidate = preferredPort;
    for (let attemptsLeft = 10; attemptsLeft > 0; attemptsLeft--) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tester = createNetServer()
            .once("error", (err: NodeJS.ErrnoException) => {
              reject(err);
            })
            .once("listening", () => {
              tester.close(() => resolve());
            })
            .listen(candidate, "0.0.0.0");
        });

        return candidate;
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === "EADDRINUSE" && attemptsLeft > 1) {
          const nextPort = candidate + 1;
          log(`port ${candidate} busy, retrying on ${nextPort}`);
          candidate = nextPort;
          continue;
        }

        throw error;
      }
    }

    throw new Error("No available ports found");
  };

  const port = await pickPort();

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
