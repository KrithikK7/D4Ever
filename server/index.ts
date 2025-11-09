import './bootstrap-env';
import { db } from './db';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureSchemaColumns } from "./ensure-schema";
import { createServer as createNetServer } from "net";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files from public/uploads directory
app.use('/uploads', express.static('public/uploads'));

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
