import rateLimit from "express-rate-limit";
import crypto from "crypto";
import type { Request, RequestHandler } from "express";

const CSRF_HEADER = "x-csrf-token";

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

export function ensureCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  return req.session.csrfToken;
}

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const sessionToken = req.session.csrfToken;
  if (!sessionToken) {
    return res.status(401).json({ error: "Invalid session", invalidSession: true });
  }

  const requestToken =
    (req.headers[CSRF_HEADER] as string | undefined) ||
    (req.headers[CSRF_HEADER.toUpperCase() as keyof typeof req.headers] as string | undefined);

  if (!requestToken || requestToken !== sessionToken) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  return next();
};
