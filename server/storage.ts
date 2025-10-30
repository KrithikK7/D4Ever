import { 
  type User, 
  type InsertUser,
  type Chapter,
  type InsertChapter,
  type Section,
  type InsertSection,
  type Page,
  type InsertPage,
  type ReadingProgress,
  type InsertReadingProgress,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type LikedSection,
  type InsertLikedSection,
  users,
  chapters,
  sections,
  pages,
  readingProgress,
  analyticsEvents,
  likedSections,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chapter methods
  getChapters(): Promise<Chapter[]>;
  getChapter(id: string): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: string, chapter: Partial<InsertChapter>): Promise<Chapter | undefined>;
  deleteChapter(id: string): Promise<void>;
  
  // Section methods
  getAllSections(): Promise<Section[]>;
  getSectionsByChapter(chapterId: string): Promise<Section[]>;
  getSection(id: string): Promise<Section | undefined>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: string, section: Partial<InsertSection>): Promise<Section | undefined>;
  deleteSection(id: string): Promise<void>;
  reorderSections(sectionOrders: { id: string; order: number }[]): Promise<void>;
  
  // Page methods
  getAllPages(): Promise<Page[]>;
  getPagesBySection(sectionId: string): Promise<Page[]>;
  getPage(id: string): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: string, page: Partial<InsertPage>): Promise<Page | undefined>;
  deletePage(id: string): Promise<void>;
  
  // Reading progress methods
  getReadingProgress(userId: string, sectionId: string): Promise<ReadingProgress | undefined>;
  getUserReadingProgress(userId: string): Promise<ReadingProgress[]>;
  upsertReadingProgress(progress: InsertReadingProgress): Promise<ReadingProgress>;
  getLastReadSection(userId: string): Promise<ReadingProgress | undefined>;
  getChapterProgress(userId: string, chapterId: string): Promise<{ completed: boolean; inProgress: boolean; totalSections: number; completedSections: number }>;
  
  // Analytics methods
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsByUser(userId: string): Promise<AnalyticsEvent[]>;
  getAnalyticsByPage(pageId: string): Promise<AnalyticsEvent[]>;
  getAnalyticsBySection(sectionId: string): Promise<AnalyticsEvent[]>;
  getAnalyticsByChapter(chapterId: string): Promise<AnalyticsEvent[]>;
  getAllAnalytics(): Promise<AnalyticsEvent[]>;
  getAnalyticsSummary(): Promise<any>;
  getAnalyticsDashboard(): Promise<any>;
  
  // Liked sections methods
  likeSection(userId: string, sectionId: string): Promise<LikedSection>;
  unlikeSection(userId: string, sectionId: string): Promise<void>;
  getLikedSectionsByUser(userId: string): Promise<Section[]>;
  isLikedByUser(userId: string, sectionId: string): Promise<boolean>;
  getLikedSectionsCount(sectionId: string): Promise<number>;
}

export class DBStorage implements IStorage {
  private async touchSectionPublishedDate(sectionId: string) {
    await db
      .update(sections)
      .set({ publishedAt: new Date() })
      .where(and(eq(sections.id, sectionId), eq(sections.publishedDateManual, false)));
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Chapter methods
  async getChapters(): Promise<Chapter[]> {
    return db.select().from(chapters).orderBy(chapters.order);
  }

  async getChapter(id: string): Promise<Chapter | undefined> {
    const result = await db.select().from(chapters).where(eq(chapters.id, id)).limit(1);
    return result[0];
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const result = await db.insert(chapters).values(chapter).returning();
    return result[0];
  }

  async updateChapter(id: string, chapter: Partial<InsertChapter>): Promise<Chapter | undefined> {
    const result = await db.update(chapters).set(chapter).where(eq(chapters.id, id)).returning();
    return result[0];
  }

  async deleteChapter(id: string): Promise<void> {
    await db.delete(chapters).where(eq(chapters.id, id));
  }

  // Section methods
  async getAllSections(): Promise<Section[]> {
    return db.select().from(sections).orderBy(sections.chapterId, sections.order);
  }

  async getSectionsByChapter(chapterId: string): Promise<Section[]> {
    return db.select().from(sections).where(eq(sections.chapterId, chapterId)).orderBy(sections.order);
  }

  async getSection(id: string): Promise<Section | undefined> {
    const result = await db.select().from(sections).where(eq(sections.id, id)).limit(1);
    return result[0];
  }

  async createSection(section: InsertSection): Promise<Section> {
    const result = await db.insert(sections).values(section).returning();
    return result[0];
  }

  async updateSection(id: string, section: Partial<InsertSection>): Promise<Section | undefined> {
    const result = await db.update(sections).set(section).where(eq(sections.id, id)).returning();
    const updatedSection = result[0];

    if (!updatedSection) {
      return undefined;
    }

    const manualFieldsTouched = Object.prototype.hasOwnProperty.call(section, "publishedAt") ||
      Object.prototype.hasOwnProperty.call(section, "publishedDateManual");

    if (!manualFieldsTouched && !updatedSection.publishedDateManual) {
      await this.touchSectionPublishedDate(id);
      return await this.getSection(id);
    }

    return updatedSection;
  }

  async deleteSection(id: string): Promise<void> {
    await db.delete(sections).where(eq(sections.id, id));
  }

  async reorderSections(sectionOrders: { id: string; order: number }[]): Promise<void> {
    // Update each section's order in a transaction
    for (const { id, order } of sectionOrders) {
      await db.update(sections).set({ order }).where(eq(sections.id, id));
    }
  }

  // Page methods
  async getAllPages(): Promise<Page[]> {
    return db.select().from(pages).orderBy(pages.sectionId, pages.pageNumber);
  }

  async getPagesBySection(sectionId: string): Promise<Page[]> {
    return db.select().from(pages).where(eq(pages.sectionId, sectionId)).orderBy(pages.pageNumber);
  }

  async getPage(id: string): Promise<Page | undefined> {
    const result = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
    return result[0];
  }

  async createPage(page: InsertPage): Promise<Page> {
    const result = await db.insert(pages).values(page).returning();
    const newPage = result[0];

    if (newPage) {
      await this.touchSectionPublishedDate(newPage.sectionId);
    }

    return newPage;
  }

  async updatePage(id: string, page: Partial<InsertPage>): Promise<Page | undefined> {
    const result = await db.update(pages).set(page).where(eq(pages.id, id)).returning();
    const updatedPage = result[0];

    if (updatedPage) {
      await this.touchSectionPublishedDate(updatedPage.sectionId);
    }

    return updatedPage;
  }

  async deletePage(id: string): Promise<void> {
    const page = await db.select({ sectionId: pages.sectionId }).from(pages).where(eq(pages.id, id)).limit(1);
    await db.delete(pages).where(eq(pages.id, id));

    if (page[0]) {
      await this.touchSectionPublishedDate(page[0].sectionId);
    }
  }

  // Reading progress methods
  async getReadingProgress(userId: string, sectionId: string): Promise<ReadingProgress | undefined> {
    const result = await db.select()
      .from(readingProgress)
      .where(and(eq(readingProgress.userId, userId), eq(readingProgress.sectionId, sectionId)))
      .limit(1);
    return result[0];
  }

  async getUserReadingProgress(userId: string): Promise<ReadingProgress[]> {
    return db.select().from(readingProgress).where(eq(readingProgress.userId, userId)).orderBy(desc(readingProgress.lastReadAt));
  }

  async upsertReadingProgress(progress: InsertReadingProgress): Promise<ReadingProgress> {
    const existing = await this.getReadingProgress(progress.userId, progress.sectionId);
    
    if (existing) {
      const result = await db
        .update(readingProgress)
        .set({ ...progress, lastReadAt: new Date() })
        .where(eq(readingProgress.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(readingProgress).values(progress).returning();
      return result[0];
    }
  }

  async getLastReadSection(userId: string): Promise<ReadingProgress | undefined> {
    const result = await db
      .select()
      .from(readingProgress)
      .where(eq(readingProgress.userId, userId))
      .orderBy(desc(readingProgress.lastReadAt))
      .limit(1);
    return result[0];
  }

  async getChapterProgress(userId: string, chapterId: string): Promise<{ completed: boolean; inProgress: boolean; totalSections: number; completedSections: number }> {
    // Get all sections for this chapter
    const chapterSections = await this.getSectionsByChapter(chapterId);
    const totalSections = chapterSections.length;
    
    if (totalSections === 0) {
      return { completed: false, inProgress: false, totalSections: 0, completedSections: 0 };
    }
    
    // Get all reading progress for this user in this chapter
    const sectionIds = chapterSections.map(s => s.id);
    const progressRecords = await db
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, userId),
          sql`${readingProgress.sectionId} IN ${sectionIds}`
        )
      );
    
    const completedSections = progressRecords.filter(p => p.completed).length;
    const inProgressSections = progressRecords.filter(p => !p.completed).length;
    
    return {
      completed: completedSections === totalSections && totalSections > 0,
      inProgress: inProgressSections > 0 || (completedSections > 0 && completedSections < totalSections),
      totalSections,
      completedSections
    };
  }

  // Analytics methods
  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const result = await db.insert(analyticsEvents).values(event).returning();
    return result[0];
  }

  async getAnalyticsByUser(userId: string): Promise<AnalyticsEvent[]> {
    return db.select().from(analyticsEvents).where(eq(analyticsEvents.userId, userId)).orderBy(desc(analyticsEvents.timestamp));
  }

  async getAnalyticsByPage(pageId: string): Promise<AnalyticsEvent[]> {
    return db.select().from(analyticsEvents).where(eq(analyticsEvents.pageId, pageId)).orderBy(desc(analyticsEvents.timestamp));
  }

  async getAnalyticsBySection(sectionId: string): Promise<AnalyticsEvent[]> {
    return db.select().from(analyticsEvents).where(eq(analyticsEvents.sectionId, sectionId)).orderBy(desc(analyticsEvents.timestamp));
  }

  async getAnalyticsByChapter(chapterId: string): Promise<AnalyticsEvent[]> {
    return db.select().from(analyticsEvents).where(eq(analyticsEvents.chapterId, chapterId)).orderBy(desc(analyticsEvents.timestamp));
  }

  async getAllAnalytics(): Promise<AnalyticsEvent[]> {
    return db.select().from(analyticsEvents).orderBy(desc(analyticsEvents.timestamp));
  }

  async getActivityLog(filters?: {
    userId?: string;
    chapterId?: string;
    sectionId?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any[]> {
    let query = sql`
      SELECT 
        ae.id,
        ae.timestamp,
        ae.event_type,
        ae.duration,
        u.username,
        c.title as chapter_title,
        s.title as section_title,
        p.page_number
      FROM analytics_events ae
      LEFT JOIN users u ON ae.user_id = u.id
      LEFT JOIN chapters c ON ae.chapter_id = c.id
      LEFT JOIN sections s ON ae.section_id = s.id
      LEFT JOIN pages p ON ae.page_id = p.id
      WHERE 1=1
    `;

    if (filters?.userId) {
      query = sql`${query} AND ae.user_id = ${filters.userId}`;
    }
    if (filters?.chapterId) {
      query = sql`${query} AND ae.chapter_id = ${filters.chapterId}`;
    }
    if (filters?.sectionId) {
      query = sql`${query} AND ae.section_id = ${filters.sectionId}`;
    }
    if (filters?.eventType) {
      query = sql`${query} AND ae.event_type = ${filters.eventType}`;
    }
    if (filters?.startDate) {
      query = sql`${query} AND ae.timestamp >= ${filters.startDate}::timestamp`;
    }
    if (filters?.endDate) {
      query = sql`${query} AND ae.timestamp <= ${filters.endDate}::timestamp`;
    }

    query = sql`${query} ORDER BY ae.timestamp DESC LIMIT 1000`;

    const result = await db.execute(query);
    return result.rows;
  }

  async getAnalyticsSummary(): Promise<any> {
    const result = await db.execute(sql`
      SELECT 
        ae.page_id,
        ae.section_id,
        ae.chapter_id,
        p.page_number,
        s.title as section_title,
        c.title as chapter_title,
        COUNT(DISTINCT ae.user_id) as unique_viewers,
        COUNT(*) as total_views,
        AVG(ae.duration) as avg_duration,
        MAX(ae.timestamp) as last_accessed
      FROM analytics_events ae
      JOIN pages p ON ae.page_id = p.id
      JOIN sections s ON ae.section_id = s.id
      JOIN chapters c ON ae.chapter_id = c.id
      GROUP BY ae.page_id, ae.section_id, ae.chapter_id, p.page_number, s.title, c.title
      ORDER BY total_views DESC
    `);
    return result.rows;
  }

  async getAnalyticsDashboard(): Promise<any> {
    // Get overview counts
    const allChapters = await this.getChapters();
    const allSections = await this.getAllSections();
    const allPages = await this.getAllPages();
    const totalReaders = await db.execute(sql`SELECT COUNT(DISTINCT id) as count FROM users WHERE role IN ('reader', 'admin')`);
    const readerCount = Number(totalReaders.rows[0]?.count || 0);

    // Get chapter completion rates
    const chapterCompletionData = await Promise.all(
      allChapters.map(async (chapter) => {
        const chapterSections = await this.getSectionsByChapter(chapter.id);
        const totalSections = chapterSections.length;
        
        if (totalSections === 0) {
          return {
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            totalSections: 0,
            completedCount: 0,
            completionRate: 0,
          };
        }

        // Count how many users completed all sections in this chapter
        const completionResult = await db.execute(sql`
          SELECT COUNT(DISTINCT user_id) as completed_users
          FROM reading_progress
          WHERE section_id IN (${sql.join(chapterSections.map(s => sql`${s.id}`), sql`, `)})
            AND completed = true
          GROUP BY user_id
          HAVING COUNT(DISTINCT section_id) = ${totalSections}
        `);
        
        const completedCount = completionResult.rows.length;
        const completionRate = readerCount > 0 ? (completedCount / readerCount) * 100 : 0;

        return {
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          totalSections,
          completedCount,
          completionRate,
        };
      })
    );

    // Get section views with chapter info
    const sectionViewsResult = await db.execute(sql`
      SELECT 
        s.id as section_id,
        s.title as section_title,
        c.title as chapter_title,
        COUNT(*) as view_count,
        AVG(ae.duration) as avg_duration
      FROM sections s
      LEFT JOIN chapters c ON s.chapter_id = c.id
      LEFT JOIN analytics_events ae ON ae.section_id = s.id
      GROUP BY s.id, s.title, c.title
      ORDER BY view_count DESC
    `);

    const sectionViews = sectionViewsResult.rows.map((row: any) => ({
      sectionId: row.section_id,
      sectionTitle: row.section_title,
      chapterTitle: row.chapter_title,
      viewCount: Number(row.view_count || 0),
      avgDuration: Number(row.avg_duration || 0),
    }));

    // Get activity timeline (last 30 days)
    const activityTimelineResult = await db.execute(sql`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as view_count,
        COUNT(DISTINCT user_id) as unique_readers
      FROM analytics_events
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(timestamp)
      ORDER BY DATE(timestamp) ASC
    `);

    const activityTimeline = activityTimelineResult.rows.map((row: any) => ({
      date: row.date,
      viewCount: Number(row.view_count || 0),
      uniqueReaders: Number(row.unique_readers || 0),
    }));

    return {
      overview: {
        totalChapters: allChapters.length,
        totalSections: allSections.length,
        totalPages: allPages.length,
        totalReaders: readerCount,
      },
      chapterCompletion: chapterCompletionData,
      sectionViews,
      activityTimeline,
    };
  }

  // Liked sections methods
  async likeSection(userId: string, sectionId: string): Promise<LikedSection> {
    // Use INSERT ... ON CONFLICT DO NOTHING to handle race conditions and duplicates
    try {
      const result = await db.insert(likedSections)
        .values({ userId, sectionId })
        .onConflictDoNothing()
        .returning();
      
      // If the insert didn't happen due to conflict (already liked), fetch the existing record
      if (result.length === 0) {
        const existing = await db.select()
          .from(likedSections)
          .where(and(eq(likedSections.userId, userId), eq(likedSections.sectionId, sectionId)))
          .limit(1);
        
        if (existing.length > 0) {
          return existing[0];
        }
        // This shouldn't happen, but handle it gracefully
        throw new Error("Failed to create or retrieve like record");
      }
      
      return result[0];
    } catch (error) {
      // Handle any database errors
      console.error("Error in likeSection:", error);
      throw error;
    }
  }

  async unlikeSection(userId: string, sectionId: string): Promise<void> {
    await db.delete(likedSections)
      .where(and(eq(likedSections.userId, userId), eq(likedSections.sectionId, sectionId)));
  }

  async getLikedSectionsByUser(userId: string): Promise<Section[]> {
    const result = await db.select()
      .from(likedSections)
      .innerJoin(sections, eq(likedSections.sectionId, sections.id))
      .where(eq(likedSections.userId, userId))
      .orderBy(desc(likedSections.likedAt));
    
    return result.map(row => row.sections);
  }

  async isLikedByUser(userId: string, sectionId: string): Promise<boolean> {
    const result = await db.select()
      .from(likedSections)
      .where(and(eq(likedSections.userId, userId), eq(likedSections.sectionId, sectionId)))
      .limit(1);
    
    return result.length > 0;
  }

  async getLikedSectionsCount(sectionId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(likedSections)
      .where(eq(likedSections.sectionId, sectionId));
    
    return Number(result[0]?.count || 0);
  }
}

export const storage = new DBStorage();
