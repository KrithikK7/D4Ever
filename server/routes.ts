import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { storage } from "./storage";
import { insertUserSchema, insertChapterSchema, insertSectionSchema, insertPageSchema, insertReadingProgressSchema, insertAnalyticsEventSchema } from "@shared/schema";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      // Use 'media' prefix for both images and videos
      cb(null, `media-${uniqueSuffix}${ext}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (covers both images and videos)
  },
  fileFilter: (req, file, cb) => {
    // Allow both image and video files
    const imageTypes = /jpeg|jpg|png|gif|webp/;
    const videoTypes = /mp4|webm|mov|avi|wmv|ogg|quicktime|x-msvideo|x-ms-wmv/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    // Check if it's an image
    const isImage = imageTypes.test(file.mimetype) || imageTypes.test(ext);
    // Check if it's a video
    const isVideo = videoTypes.test(file.mimetype) || videoTypes.test(ext) || 
                    file.mimetype.startsWith('video/');
    
    if (isImage || isVideo) {
      return cb(null, true);
    }
    cb(new Error('Only image and video files are allowed'));
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // File upload endpoint
  app.post("/api/upload/image", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Return the URL path to the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
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

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Session validation endpoint
  app.post("/api/auth/validate", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID required", invalidSession: true });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ 
          error: "Session expired. Please log in again.", 
          invalidSession: true 
        });
      }

      res.json({
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(500).json({ error: "Failed to validate session" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map((u: any) => ({ id: u.id, username: u.username, role: u.role })));
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Chapter routes
  app.get("/api/chapters", async (req, res) => {
    try {
      const allChapters = await storage.getChapters();
      res.json(allChapters);
    } catch (error) {
      console.error("Get chapters error:", error);
      res.status(500).json({ error: "Failed to fetch chapters" });
    }
  });

  app.get("/api/chapters/:id", async (req, res) => {
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

  app.post("/api/chapters", async (req, res) => {
    try {
      const validatedData = insertChapterSchema.parse(req.body);
      const chapter = await storage.createChapter(validatedData);
      res.status(201).json(chapter);
    } catch (error) {
      console.error("Create chapter error:", error);
      res.status(400).json({ error: "Invalid chapter data" });
    }
  });

  app.patch("/api/chapters/:id", async (req, res) => {
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

  app.delete("/api/chapters/:id", async (req, res) => {
    try {
      await storage.deleteChapter(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete chapter error:", error);
      res.status(500).json({ error: "Failed to delete chapter" });
    }
  });

  // Section routes
  app.get("/api/sections", async (req, res) => {
    try {
      const allSections = await storage.getAllSections();
      res.json(allSections);
    } catch (error) {
      console.error("Get all sections error:", error);
      res.status(500).json({ error: "Failed to fetch sections" });
    }
  });

  app.get("/api/chapters/:chapterId/sections", async (req, res) => {
    try {
      const allSections = await storage.getSectionsByChapter(req.params.chapterId);
      res.json(allSections);
    } catch (error) {
      console.error("Get sections error:", error);
      res.status(500).json({ error: "Failed to fetch sections" });
    }
  });

  app.get("/api/sections/:id", async (req, res) => {
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

  app.post("/api/sections", async (req, res) => {
    try {
      // Validate input data first
      const validatedData = insertSectionSchema.parse(req.body);
      
      // Create section
      const section = await storage.createSection(validatedData);
      
      // Create a default first page with empty content
      try {
        await storage.createPage({
          sectionId: section.id,
          content: "",
          pageNumber: 1,
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
  app.patch("/api/sections/reorder", async (req, res) => {
    try {
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

      const chapterIds = new Set(sections.map(s => s!.chapterId));
      if (chapterIds.size > 1) {
        return res.status(400).json({ error: "All sections must belong to the same chapter" });
      }

      // Validate order values are unique and sequential
      const orders = sectionOrders.map(so => so.order).sort((a, b) => a - b);
      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        return res.status(400).json({ error: "Order values must be unique" });
      }

      await storage.reorderSections(sectionOrders);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Reorder sections error:", error);
      res.status(500).json({ error: "Failed to reorder sections" });
    }
  });

  app.patch("/api/sections/:id", async (req, res) => {
    try {
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

  app.delete("/api/sections/:id", async (req, res) => {
    try {
      await storage.deleteSection(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete section error:", error);
      res.status(500).json({ error: "Failed to delete section" });
    }
  });

  app.get("/api/sections/:sectionId/progress", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      const progress = await storage.getReadingProgress(userId, req.params.sectionId);
      res.json(progress || null);
    } catch (error) {
      console.error("Get section progress error:", error);
      res.status(500).json({ error: "Failed to fetch section progress" });
    }
  });

  // Page routes
  app.get("/api/pages", async (req, res) => {
    try {
      const allPages = await storage.getAllPages();
      res.json(allPages);
    } catch (error) {
      console.error("Get all pages error:", error);
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  app.get("/api/sections/:sectionId/pages", async (req, res) => {
    try {
      const allPages = await storage.getPagesBySection(req.params.sectionId);
      res.json(allPages);
    } catch (error) {
      console.error("Get pages error:", error);
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  app.get("/api/pages/:id", async (req, res) => {
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

  app.post("/api/pages", async (req, res) => {
    try {
      const validatedData = insertPageSchema.parse(req.body);
      const page = await storage.createPage(validatedData);
      res.status(201).json(page);
    } catch (error) {
      console.error("Create page error:", error);
      res.status(400).json({ error: "Invalid page data" });
    }
  });

  app.patch("/api/pages/:id", async (req, res) => {
    try {
      const page = await storage.updatePage(req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Update page error:", error);
      res.status(500).json({ error: "Failed to update page" });
    }
  });

  app.delete("/api/pages/:id", async (req, res) => {
    try {
      await storage.deletePage(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete page error:", error);
      res.status(500).json({ error: "Failed to delete page" });
    }
  });

  // Reading progress routes
  app.get("/api/reading-progress", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      const progress = await storage.getUserReadingProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Get reading progress error:", error);
      res.status(500).json({ error: "Failed to fetch reading progress" });
    }
  });

  app.get("/api/reading-progress/last", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      const progress = await storage.getLastReadSection(userId);
      res.json(progress || null);
    } catch (error) {
      console.error("Get last read error:", error);
      res.status(500).json({ error: "Failed to fetch last read section" });
    }
  });

  app.post("/api/reading-progress", async (req, res) => {
    try {
      const validatedData = insertReadingProgressSchema.parse(req.body);
      
      // Validate that user exists
      const user = await storage.getUser(validatedData.userId);
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

  app.get("/api/chapters/:chapterId/progress", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      const progress = await storage.getChapterProgress(userId, req.params.chapterId);
      res.json(progress);
    } catch (error) {
      console.error("Get chapter progress error:", error);
      res.status(500).json({ error: "Failed to fetch chapter progress" });
    }
  });

  // Liked sections routes
  app.post("/api/sections/:sectionId/like", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      
      // Validate that user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ 
          error: "Your session has expired. Please log in again.", 
          invalidSession: true 
        });
      }
      
      const liked = await storage.likeSection(userId, req.params.sectionId);
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

  app.delete("/api/sections/:sectionId/like", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      
      // Validate that user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ 
          error: "Your session has expired. Please log in again.", 
          invalidSession: true 
        });
      }
      
      await storage.unlikeSection(userId, req.params.sectionId);
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

  app.get("/api/users/:userId/progress", async (req, res) => {
    try {
      const progress = await storage.getUserReadingProgress(req.params.userId);
      res.json(progress);
    } catch (error) {
      console.error("Get user progress error:", error);
      res.status(500).json({ error: "Failed to fetch user progress" });
    }
  });

  app.get("/api/users/:userId/liked-sections", async (req, res) => {
    try {
      const sections = await storage.getLikedSectionsByUser(req.params.userId);
      res.json(sections);
    } catch (error) {
      console.error("Get liked sections error:", error);
      res.status(500).json({ error: "Failed to fetch liked sections" });
    }
  });

  app.get("/api/sections/:sectionId/like-status", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      const isLiked = await storage.isLikedByUser(userId, req.params.sectionId);
      res.json({ isLiked });
    } catch (error) {
      console.error("Get like status error:", error);
      res.status(500).json({ error: "Failed to fetch like status" });
    }
  });

  app.get("/api/sections/:sectionId/like-count", async (req, res) => {
    try {
      const count = await storage.getLikedSectionsCount(req.params.sectionId);
      res.json({ count });
    } catch (error) {
      console.error("Get like count error:", error);
      res.status(500).json({ error: "Failed to fetch like count" });
    }
  });

  // Analytics routes
  app.post("/api/analytics", async (req, res) => {
    try {
      const validatedData = insertAnalyticsEventSchema.parse(req.body);
      const event = await storage.createAnalyticsEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Create analytics event error:", error);
      res.status(400).json({ error: "Invalid analytics data" });
    }
  });

  app.get("/api/analytics/summary", async (req, res) => {
    try {
      const summary = await storage.getAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error("Get analytics summary error:", error);
      res.status(500).json({ error: "Failed to fetch analytics summary" });
    }
  });

  app.get("/api/analytics/user/:userId", async (req, res) => {
    try {
      const events = await storage.getAnalyticsByUser(req.params.userId);
      res.json(events);
    } catch (error) {
      console.error("Get user analytics error:", error);
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  app.get("/api/analytics/chapter/:chapterId", async (req, res) => {
    try {
      const events = await storage.getAnalyticsByChapter(req.params.chapterId);
      res.json(events);
    } catch (error) {
      console.error("Get chapter analytics error:", error);
      res.status(500).json({ error: "Failed to fetch chapter analytics" });
    }
  });

  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const dashboardData = await storage.getAnalyticsDashboard();
      res.json(dashboardData);
    } catch (error) {
      console.error("Get analytics dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch analytics dashboard" });
    }
  });

  app.get("/api/analytics/activity-log", async (req, res) => {
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
