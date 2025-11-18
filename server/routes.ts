import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import multer from "multer";
import { storage } from "./storage";
import { insertUserSchema, insertChapterSchema, insertSectionSchema, insertPageSchema, insertReadingProgressSchema, insertAnalyticsEventSchema, type InsertPage, type User, type InsertUser, type Section, type Page } from "@shared/schema";
import { requireAuth, SESSION_COOKIE_NAME, requirePermission, type UserPrivileges } from "./auth";
import { sanitizeRichText } from "./sanitize";
import { ensureCsrfToken, csrfProtection, loginRateLimiter } from "./security";
import { persistUpload } from "./uploads";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("audio/") ||
      file.mimetype.startsWith("video/")
    ) {
      return cb(null, true);
    }
    cb(new Error("Only image, audio, or video files are allowed"));
  },
});

const requireAuthenticated = requireAuth();
const requireAdmin = requireAuth({ roles: ["admin"] });

const privilegesSchema = z.object({
  canCreateSections: z.boolean().optional(),
  canEditSections: z.boolean().optional(),
  canEditOwnSections: z.boolean().optional(),
  canDeleteSections: z.boolean().optional(),
  canDeleteOwnSections: z.boolean().optional(),
});

const createUserRequestSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["admin", "reader"]),
}).merge(privilegesSchema);

const updateUserRequestSchema = privilegesSchema.extend({
  password: z.string().min(6).optional(),
  role: z.enum(["admin", "reader"]).optional(),
});

const getUserPrivileges = (user: User): UserPrivileges => ({
  canCreateSections: Boolean(user.canCreateSections),
  canEditSections: Boolean(user.canEditSections),
  canEditOwnSections: Boolean(user.canEditOwnSections),
  canDeleteSections: Boolean(user.canDeleteSections),
  canDeleteOwnSections: Boolean(user.canDeleteOwnSections),
});

const toUserResponse = (user: User) => ({
  id: user.id,
  username: user.username,
  role: user.role,
  privileges: getUserPrivileges(user),
});

const ownsSection = (userId: string, section?: Section | null) =>
  Boolean(section?.createdBy && section.createdBy === userId);

const ownsPage = (userId: string, page?: Page | null, section?: Section | null) =>
  Boolean(page?.createdBy && page.createdBy === userId) || ownsSection(userId, section);

const canEditSectionResource = (authUser: Express.Request["authUser"], section?: Section | null) => {
  if (!section || !authUser) return false;
  if (authUser.role === "admin" || authUser.privileges.canEditSections) return true;
  if (authUser.privileges.canEditOwnSections && ownsSection(authUser.id, section)) return true;
  return false;
};

const canDeleteSectionResource = (authUser: Express.Request["authUser"], section?: Section | null) => {
  if (!section || !authUser) return false;
  if (authUser.role === "admin" || authUser.privileges.canDeleteSections) return true;
  if (authUser.privileges.canDeleteOwnSections && ownsSection(authUser.id, section)) return true;
  return false;
};

const canEditPageResource = (
  authUser: Express.Request["authUser"],
  page?: Page | null,
  section?: Section | null,
) => {
  if (!authUser) return false;
  if (authUser.role === "admin" || authUser.privileges.canEditSections) return true;
  if (authUser.privileges.canEditOwnSections && ownsPage(authUser.id, page, section)) return true;
  return false;
};

const canDeletePageResource = (
  authUser: Express.Request["authUser"],
  page?: Page | null,
  section?: Section | null,
) => {
  if (!authUser) return false;
  if (authUser.role === "admin" || authUser.privileges.canDeleteSections) return true;
  if (authUser.privileges.canDeleteOwnSections && ownsPage(authUser.id, page, section)) return true;
  return false;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // File upload endpoint
  app.post("/api/upload/image", requireAdmin, csrfProtection, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const result = await persistUpload(req.file, "image");
      res.json(result);
    } catch (error) {
      console.error("Upload error:", error);
      const message =
        error instanceof Error && error.message.includes("Unsupported")
          ? "Unsupported file type"
          : "Failed to upload file";
      res.status(message === "Unsupported file type" ? 400 : 500).json({ error: message });
    }
  });

  app.post("/api/upload/audio", requireAdmin, csrfProtection, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const result = await persistUpload(req.file, "audio");
      res.json(result);
    } catch (error) {
      console.error("Audio upload error:", error);
      const message =
        error instanceof Error && error.message.includes("Unsupported")
          ? "Unsupported file type"
          : "Failed to upload audio";
      res.status(message === "Unsupported file type" ? 400 : 500).json({ error: message });
    }
  });


  // Authentication routes
  app.post("/api/auth/login", loginRateLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const privileges = getUserPrivileges(user);

      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((regenerateErr) => {
          if (regenerateErr) {
            return reject(regenerateErr);
          }
          req.session.userId = user.id;
          req.session.role = user.role === "admin" ? "admin" : "reader";
          req.session.privileges = privileges;
          req.session.save((saveErr) => {
            if (saveErr) {
              return reject(saveErr);
            }
            resolve();
          });
        });
      });

      const csrfToken = ensureCsrfToken(req);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          privileges,
        },
        csrfToken,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Session validation endpoint
  app.get("/api/auth/validate", requireAuthenticated, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const storedUser = await storage.getUser(authUser.id);
      
      if (!storedUser) {
        req.session.destroy(() => undefined);
        return res.status(401).json({ 
          error: "Session expired. Please log in again.", 
          invalidSession: true 
        });
      }

      const privileges = getUserPrivileges(storedUser);
      req.session.privileges = privileges;
      const csrfToken = ensureCsrfToken(req);

      res.json({
        valid: true,
        user: {
          id: storedUser.id,
          username: storedUser.username,
          role: storedUser.role,
          privileges,
        },
        csrfToken,
      });
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(500).json({ error: "Failed to validate session" });
    }
  });

  app.get("/api/auth/csrf", requireAuthenticated, async (req, res) => {
    const csrfToken = ensureCsrfToken(req);
    res.json({ csrfToken });
  });

  app.post("/api/auth/logout", requireAuthenticated, csrfProtection, async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to log out" });
      }

      res.clearCookie(SESSION_COOKIE_NAME);
      res.status(204).send();
    });
  });

  // User routes
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(toUserResponse));
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAdmin, csrfProtection, async (req, res) => {
    try {
      const data = createUserRequestSchema.parse(req.body);
      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        username: data.username,
        password: hashedPassword,
        role: data.role,
        canCreateSections: data.canCreateSections ?? false,
        canEditSections: data.canEditSections ?? false,
        canEditOwnSections: data.canEditOwnSections ?? false,
        canDeleteSections: data.canDeleteSections ?? false,
        canDeleteOwnSections: data.canDeleteOwnSections ?? false,
      });
      res.status(201).json(toUserResponse(user));
    } catch (error) {
      console.error("Create user error:", error);
      res.status(400).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", requireAdmin, csrfProtection, async (req, res) => {
    try {
      const payload = updateUserRequestSchema.parse(req.body);
      const updateData: Partial<InsertUser> = {};

      if (payload.role) {
        updateData.role = payload.role;
      }
      if (payload.password) {
        updateData.password = await bcrypt.hash(payload.password, 10);
      }

      if (typeof payload.canCreateSections === "boolean") {
        updateData.canCreateSections = payload.canCreateSections;
      }
      if (typeof payload.canEditSections === "boolean") {
        updateData.canEditSections = payload.canEditSections;
      }
      if (typeof payload.canEditOwnSections === "boolean") {
        updateData.canEditOwnSections = payload.canEditOwnSections;
      }
      if (typeof payload.canDeleteSections === "boolean") {
        updateData.canDeleteSections = payload.canDeleteSections;
      }
      if (typeof payload.canDeleteOwnSections === "boolean") {
        updateData.canDeleteOwnSections = payload.canDeleteOwnSections;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No updates provided" });
      }

      const updated = await storage.updateUser(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      if (req.session.userId === updated.id) {
        req.session.role = updated.role === "admin" ? "admin" : "reader";
        req.session.privileges = getUserPrivileges(updated);
      }

      res.json(toUserResponse(updated));
    } catch (error) {
      console.error("Update user error:", error);
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  // Chapter routes
  app.get("/api/chapters", requireAuthenticated, async (req, res) => {
    try {
      const allChapters = await storage.getChapters();
      res.json(allChapters);
    } catch (error) {
      console.error("Get chapters error:", error);
      res.status(500).json({ error: "Failed to fetch chapters" });
    }
  });

  app.get("/api/chapters/:id", requireAuthenticated, async (req, res) => {
    try {
      const chapter = await storage.getChapter(req.params.id);
      if (!chapter) {
        return res.status(404).json({ error: "Chapter not found" });
      }
      res.json(chapter);
    } catch (error) {
      console.error("Get chapter error:", error);
      res.status(500).json({ error: "Failed to fetch chapter" });
    }
  });

  app.post("/api/chapters", requireAdmin, csrfProtection, async (req, res) => {
    try {
      const validatedData = insertChapterSchema.parse(req.body);
      const chapter = await storage.createChapter(validatedData);
      res.status(201).json(chapter);
    } catch (error) {
      console.error("Create chapter error:", error);
      res.status(400).json({ error: "Invalid chapter data" });
    }
  });

  app.patch("/api/chapters/:id", requireAdmin, csrfProtection, async (req, res) => {
    try {
      const chapter = await storage.updateChapter(req.params.id, req.body);
      if (!chapter) {
        return res.status(404).json({ error: "Chapter not found" });
      }
      res.json(chapter);
    } catch (error) {
      console.error("Update chapter error:", error);
      res.status(500).json({ error: "Failed to update chapter" });
    }
  });

  app.delete("/api/chapters/:id", requireAdmin, csrfProtection, async (req, res) => {
    try {
      await storage.deleteChapter(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete chapter error:", error);
      res.status(500).json({ error: "Failed to delete chapter" });
    }
  });

  // Section routes
  app.get("/api/sections", requireAuthenticated, async (req, res) => {
    try {
      const allSections = await storage.getAllSections();
      res.json(allSections);
    } catch (error) {
      console.error("Get all sections error:", error);
      res.status(500).json({ error: "Failed to fetch sections" });
    }
  });

  app.get("/api/chapters/:chapterId/sections", requireAuthenticated, async (req, res) => {
    try {
      const allSections = await storage.getSectionsByChapter(req.params.chapterId);
      res.json(allSections);
    } catch (error) {
      console.error("Get sections error:", error);
      res.status(500).json({ error: "Failed to fetch sections" });
    }
  });

  app.get("/api/sections/:id", requireAuthenticated, async (req, res) => {
    try {
      const section = await storage.getSection(req.params.id);
      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }
      res.json(section);
    } catch (error) {
      console.error("Get section error:", error);
      res.status(500).json({ error: "Failed to fetch section" });
    }
  });

  app.post("/api/sections", requireAuthenticated, requirePermission("canCreateSections"), csrfProtection, async (req, res) => {
    try {
      // Validate input data first
      const authUser = req.authUser!;
      const validatedData = insertSectionSchema.parse(req.body);
      
      // Create section
      const section = await storage.createSection({
        ...validatedData,
        createdBy: authUser.id,
      });
      
      // Create a default first page with empty content
      try {
        await storage.createPage({
          sectionId: section.id,
          content: "",
          pageNumber: 1,
          createdBy: authUser.id,
        });
      } catch (pageError) {
        // Rollback: Delete the section if page creation fails
        console.error("Failed to create default page, rolling back section:", pageError);
        try {
          await storage.deleteSection(section.id);
        } catch (deleteError) {
          console.error("Failed to rollback section deletion:", deleteError);
        }
        throw new Error("Failed to create section with default page");
      }
      
      res.status(201).json(section);
    } catch (error) {
      console.error("Create section error:", error);
      // Differentiate validation errors from storage failures
      if (error instanceof Error && error.message === "Failed to create section with default page") {
        res.status(500).json({ error: "Server error creating section" });
      } else if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({ error: "Invalid section data" });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  });

  // Reorder route must come before :id route to prevent "reorder" being treated as an ID
  app.patch("/api/sections/reorder", requireAuthenticated, csrfProtection, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const { sectionOrders } = req.body;
      if (!Array.isArray(sectionOrders) || sectionOrders.length === 0) {
        return res.status(400).json({ error: "sectionOrders must be a non-empty array" });
      }

      // Validate that all sections belong to the same chapter
      const sectionIds = sectionOrders.map(so => so.id);
      const sections = await Promise.all(sectionIds.map(id => storage.getSection(id)));
      
      if (sections.some(s => !s)) {
        return res.status(404).json({ error: "One or more sections not found" });
      }

      const concreteSections = sections.map((section) => section!);

      const chapterIds = new Set(concreteSections.map(s => s.chapterId));
      if (chapterIds.size > 1) {
        return res.status(400).json({ error: "All sections must belong to the same chapter" });
      }

      // Validate order values are unique and sequential
      const orders = sectionOrders.map(so => so.order).sort((a, b) => a - b);
      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        return res.status(400).json({ error: "Order values must be unique" });
      }

      const allSections = concreteSections;
      const hasGlobalEdit = authUser.role === "admin" || authUser.privileges.canEditSections;
      if (!hasGlobalEdit) {
        if (!authUser.privileges.canEditOwnSections) {
          return res.status(403).json({ error: "Forbidden" });
        }
        const ownsAll = allSections.every((section) => ownsSection(authUser.id, section));
        if (!ownsAll) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      await storage.reorderSections(sectionOrders);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Reorder sections error:", error);
      res.status(500).json({ error: "Failed to reorder sections" });
    }
  });

  app.patch("/api/sections/:id", requireAuthenticated, csrfProtection, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const existingSection = await storage.getSection(req.params.id);
      if (!existingSection) {
        return res.status(404).json({ error: "Section not found" });
      }
      if (!canEditSectionResource(authUser, existingSection)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      // Validate input - use partial schema to allow updating only some fields
      const validatedData = insertSectionSchema.partial().parse(req.body);

      if (Object.prototype.hasOwnProperty.call(req.body, "publishedAt")) {
        validatedData.publishedDateManual =
          validatedData.publishedDateManual ?? (validatedData.publishedAt !== null);
      }

      const section = await storage.updateSection(req.params.id, validatedData);
      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }
      res.json(section);
    } catch (error) {
      console.error("Update section error:", error);
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({ error: "Invalid section data" });
      } else {
        res.status(500).json({ error: "Failed to update section" });
      }
    }
  });

  app.delete("/api/sections/:id", requireAuthenticated, csrfProtection, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const section = await storage.getSection(req.params.id);
      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }
      if (!canDeleteSectionResource(authUser, section)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await storage.deleteSection(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete section error:", error);
      res.status(500).json({ error: "Failed to delete section" });
    }
  });

  app.get("/api/sections/:sectionId/progress", requireAuthenticated, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const requestedUserId = req.query.userId as string | undefined;
      if (requestedUserId && requestedUserId !== authUser.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const progress = await storage.getReadingProgress(authUser.id, req.params.sectionId);
      res.json(progress || null);
    } catch (error) {
      console.error("Get section progress error:", error);
      res.status(500).json({ error: "Failed to fetch section progress" });
    }
  });

  // Page routes
  app.get("/api/pages", requireAdmin, async (req, res) => {
    try {
      const allPages = await storage.getAllPages();
      res.json(allPages);
    } catch (error) {
      console.error("Get all pages error:", error);
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  app.get("/api/sections/:sectionId/pages", requireAuthenticated, async (req, res) => {
    try {
      const allPages = await storage.getPagesBySection(req.params.sectionId);
      res.json(allPages);
    } catch (error) {
      console.error("Get pages error:", error);
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  app.get("/api/pages/:id", requireAdmin, async (req, res) => {
    try {
      const page = await storage.getPage(req.params.id);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Get page error:", error);
      res.status(500).json({ error: "Failed to fetch page" });
    }
  });

  app.post("/api/pages", requireAuthenticated, csrfProtection, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const validatedData = insertPageSchema.parse(req.body);
      const parentSection = await storage.getSection(validatedData.sectionId);
      if (!parentSection) {
        return res.status(404).json({ error: "Section not found" });
      }
      if (!canEditSectionResource(authUser, parentSection)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const sanitizedContent = sanitizeRichText(validatedData.content);
      const page = await storage.createPage({
        ...validatedData,
        createdBy: authUser.id,
        content: sanitizedContent,
      });
      res.status(201).json(page);
    } catch (error) {
      console.error("Create page error:", error);
      res.status(400).json({ error: "Invalid page data" });
    }
  });

  app.patch("/api/pages/:id", requireAuthenticated, csrfProtection, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const existingPage = await storage.getPage(req.params.id);
      if (!existingPage) {
        return res.status(404).json({ error: "Page not found" });
      }
      const parentSection = await storage.getSection(existingPage.sectionId);
      if (!canEditPageResource(authUser, existingPage, parentSection)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updatePayload: Partial<InsertPage> = { ...req.body };
      if (typeof updatePayload.content === "string") {
        updatePayload.content = sanitizeRichText(updatePayload.content);
      }

      const page = await storage.updatePage(req.params.id, updatePayload);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Update page error:", error);
      res.status(500).json({ error: "Failed to update page" });
    }
  });

  app.delete("/api/pages/:id", requireAuthenticated, csrfProtection, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const existingPage = await storage.getPage(req.params.id);
      if (!existingPage) {
        return res.status(404).json({ error: "Page not found" });
      }
      const parentSection = await storage.getSection(existingPage.sectionId);
      if (!canDeletePageResource(authUser, existingPage, parentSection)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await storage.deletePage(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete page error:", error);
      res.status(500).json({ error: "Failed to delete page" });
    }
  });

  // Reading progress routes
  app.get("/api/reading-progress", requireAuthenticated, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const requestedUserId = req.query.userId as string | undefined;
      if (requestedUserId && requestedUserId !== authUser.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const progress = await storage.getUserReadingProgress(authUser.id);
      res.json(progress);
    } catch (error) {
      console.error("Get reading progress error:", error);
      res.status(500).json({ error: "Failed to fetch reading progress" });
    }
  });

  app.get("/api/reading-progress/last", requireAuthenticated, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const requestedUserId = req.query.userId as string | undefined;
      if (requestedUserId && requestedUserId !== authUser.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const progress = await storage.getLastReadSection(authUser.id);
      res.json(progress || null);
    } catch (error) {
      console.error("Get last read error:", error);
      res.status(500).json({ error: "Failed to fetch last read section" });
    }
  });

  app.post("/api/reading-progress", requireAuthenticated, csrfProtection, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const validatedData = insertReadingProgressSchema.parse({
        ...req.body,
        userId: authUser.id,
      });
      
      // Validate that user exists
      const user = await storage.getUser(authUser.id);
      if (!user) {
        return res.status(401).json({ 
          error: "Your session has expired. Please log in again.", 
          invalidSession: true 
        });
      }
      
      const progress = await storage.upsertReadingProgress(validatedData);
      res.json(progress);
    } catch (error: any) {
      console.error("Save reading progress error:", error);
      
      // Check for foreign key constraint errors
      if (error.code === '23503' && error.detail?.includes('user_id')) {
        return res.status(401).json({ 
          error: "Your session has expired. Please log in again.", 
          invalidSession: true 
        });
      }
      
      res.status(400).json({ error: "Invalid progress data" });
    }
  });

  app.get("/api/chapters/:chapterId/progress", requireAuthenticated, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const requestedUserId = req.query.userId as string | undefined;
      if (requestedUserId && requestedUserId !== authUser.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const progress = await storage.getChapterProgress(authUser.id, req.params.chapterId);
      res.json(progress);
    } catch (error) {
      console.error("Get chapter progress error:", error);
      res.status(500).json({ error: "Failed to fetch chapter progress" });
    }
  });

  // Liked sections routes
  app.post("/api/sections/:sectionId/like", requireAuthenticated, csrfProtection, async (req, res) => {
    try {
      const authUser = req.authUser!;
      
      // Validate that user exists
      const user = await storage.getUser(authUser.id);
      if (!user) {
        return res.status(401).json({ 
          error: "Your session has expired. Please log in again.", 
          invalidSession: true 
        });
      }
      
      const liked = await storage.likeSection(authUser.id, req.params.sectionId);
      res.json(liked);
    } catch (error: any) {
      console.error("Like section error:", error);
      
      // Check for foreign key constraint errors
      if (error.code === '23503' && error.detail?.includes('user_id')) {
        return res.status(401).json({ 
          error: "Your session has expired. Please log in again.", 
          invalidSession: true 
        });
      }
      
      res.status(500).json({ error: "Failed to like section. Please try again." });
    }
  });

  app.delete("/api/sections/:sectionId/like", requireAuthenticated, csrfProtection, async (req, res) => {
    try {
      const authUser = req.authUser!;
      
      // Validate that user exists
      const user = await storage.getUser(authUser.id);
      if (!user) {
        return res.status(401).json({ 
          error: "Your session has expired. Please log in again.", 
          invalidSession: true 
        });
      }
      
      await storage.unlikeSection(authUser.id, req.params.sectionId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Unlike section error:", error);
      
      // Check for foreign key constraint errors  
      if (error.code === '23503' && error.detail?.includes('user_id')) {
        return res.status(401).json({ 
          error: "Your session has expired. Please log in again.", 
          invalidSession: true 
        });
      }
      
      res.status(500).json({ error: "Failed to unlike section. Please try again." });
    }
  });

  app.get("/api/users/:userId/progress", requireAuthenticated, async (req, res) => {
    try {
      const authUser = req.authUser!;
      if (authUser.role !== "admin" && authUser.id !== req.params.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const progress = await storage.getUserReadingProgress(req.params.userId);
      res.json(progress);
    } catch (error) {
      console.error("Get user progress error:", error);
      res.status(500).json({ error: "Failed to fetch user progress" });
    }
  });

  app.get("/api/users/:userId/liked-sections", requireAuthenticated, async (req, res) => {
    try {
      const authUser = req.authUser!;
      if (authUser.role !== "admin" && authUser.id !== req.params.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const sections = await storage.getLikedSectionsByUser(req.params.userId);
      res.json(sections);
    } catch (error) {
      console.error("Get liked sections error:", error);
      res.status(500).json({ error: "Failed to fetch liked sections" });
    }
  });

  app.get("/api/sections/:sectionId/like-status", requireAuthenticated, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const requestedUserId = req.query.userId as string | undefined;
      if (requestedUserId && requestedUserId !== authUser.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const isLiked = await storage.isLikedByUser(authUser.id, req.params.sectionId);
      res.json({ isLiked });
    } catch (error) {
      console.error("Get like status error:", error);
      res.status(500).json({ error: "Failed to fetch like status" });
    }
  });

  app.get("/api/sections/:sectionId/like-count", requireAuthenticated, async (req, res) => {
    try {
      const count = await storage.getLikedSectionsCount(req.params.sectionId);
      res.json({ count });
    } catch (error) {
      console.error("Get like count error:", error);
      res.status(500).json({ error: "Failed to fetch like count" });
    }
  });

  // Analytics routes
  app.post("/api/analytics", requireAuthenticated, csrfProtection, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const validatedData = insertAnalyticsEventSchema.parse({
        ...req.body,
        userId: authUser.id,
      });
      const event = await storage.createAnalyticsEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Create analytics event error:", error);
      res.status(400).json({ error: "Invalid analytics data" });
    }
  });

  app.get("/api/analytics/summary", requireAdmin, async (req, res) => {
    try {
      const summary = await storage.getAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error("Get analytics summary error:", error);
      res.status(500).json({ error: "Failed to fetch analytics summary" });
    }
  });

  app.get("/api/analytics/user/:userId", requireAdmin, async (req, res) => {
    try {
      const events = await storage.getAnalyticsByUser(req.params.userId);
      res.json(events);
    } catch (error) {
      console.error("Get user analytics error:", error);
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  app.get("/api/analytics/chapter/:chapterId", requireAdmin, async (req, res) => {
    try {
      const events = await storage.getAnalyticsByChapter(req.params.chapterId);
      res.json(events);
    } catch (error) {
      console.error("Get chapter analytics error:", error);
      res.status(500).json({ error: "Failed to fetch chapter analytics" });
    }
  });

  app.get("/api/analytics/dashboard", requireAdmin, async (req, res) => {
    try {
      const dashboardData = await storage.getAnalyticsDashboard();
      res.json(dashboardData);
    } catch (error) {
      console.error("Get analytics dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch analytics dashboard" });
    }
  });

  app.get("/api/analytics/activity-log", requireAdmin, async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId as string | undefined,
        chapterId: req.query.chapterId as string | undefined,
        sectionId: req.query.sectionId as string | undefined,
        eventType: req.query.eventType as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };
      const activityLog = await storage.getActivityLog(filters);
      res.json(activityLog);
    } catch (error) {
      console.error("Get activity log error:", error);
      res.status(500).json({ error: "Failed to fetch activity log" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
