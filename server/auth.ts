import type { RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

export type UserRole = "admin" | "reader";
export type UserPrivileges = {
  canCreateSections: boolean;
  canEditSections: boolean;
  canEditOwnSections: boolean;
  canDeleteSections: boolean;
  canDeleteOwnSections: boolean;
};

const defaultPrivileges: UserPrivileges = {
  canCreateSections: false,
  canEditSections: false,
  canEditOwnSections: false,
  canDeleteSections: false,
  canDeleteOwnSections: false,
};

function normalizePrivileges(
  privileges?: Partial<UserPrivileges> | null,
): UserPrivileges {
  return {
    ...defaultPrivileges,
    ...(privileges ?? {}),
  };
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: UserRole;
    csrfToken?: string;
    privileges?: UserPrivileges;
  }
}

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        role: UserRole;
        privileges: UserPrivileges;
      };
    }
  }
}

export const SESSION_COOKIE_NAME = "sid";
const PgSessionStore = connectPgSimple(session);

export function createSessionMiddleware() {
  const envSecret = process.env.SESSION_SECRET;
  if (!envSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  } else if (!envSecret) {
    console.warn("SESSION_SECRET is not set; using insecure development secret");
  }
  const secret = envSecret ?? "dev-secret-change-me";

  return session({
    store: new PgSessionStore({
      pool,
      createTableIfMissing: true,
    }),
    secret,
    name: SESSION_COOKIE_NAME,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  });
}

export function requireAuth(options?: { roles?: UserRole[] }): RequestHandler {
  return (req, res, next) => {
    const { userId, role } = req.session;
    if (!userId || !role) {
      return res
        .status(401)
        .json({ error: "Authentication required", invalidSession: true });
    }

    const normalizedRole = role;
    const privileges = normalizePrivileges(req.session.privileges);

    if (options?.roles && !options.roles.includes(normalizedRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.authUser = { id: userId, role: normalizedRole, privileges };
    return next();
  };
}

export function requireSelfOrAdmin(paramName: "userId" = "userId"): RequestHandler {
  return (req, res, next) => {
    const authUser = req.authUser;
    if (!authUser) {
      return res
        .status(401)
        .json({ error: "Authentication required", invalidSession: true });
    }

    const requestedId = req.params[paramName];
    if (!requestedId) {
      return res.status(400).json({ error: "User ID required" });
    }

    if (authUser.role === "admin" || authUser.id === requestedId) {
      return next();
    }

    return res.status(403).json({ error: "Forbidden" });
  };
}

type Permission = keyof UserPrivileges;

export function requirePermission(
  permission: Permission | Permission[],
): RequestHandler {
  const permissions = Array.isArray(permission) ? permission : [permission];
  return (req, res, next) => {
    const authUser = req.authUser;
    if (!authUser) {
      return res
        .status(401)
        .json({ error: "Authentication required", invalidSession: true });
    }

    if (
      authUser.role === "admin" ||
      permissions.some((perm) => authUser.privileges[perm])
    ) {
      return next();
    }
    return res.status(403).json({ error: "Forbidden" });
  };
}
