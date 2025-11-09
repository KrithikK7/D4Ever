import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Pencil, Save, X, ArrowUp, ArrowDown, Plus, Trash2, Heart, CheckCircle2, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SectionSidebar } from "@/components/SectionSidebar";
import { RedStringProgress } from "@/components/RedStringProgress";
import { PhotoSwipeGallery } from "@/components/PhotoSwipeGallery";
import { TiptapEditor } from "@/components/TiptapEditor";
import { InstagramEmbed } from "@/components/InstagramEmbed";
import InstagramGallery from "@/components/InstagramGallery";
import { MediaToolbar, ImageEmbedDialog, InstagramEmbedDialog, SpotifyEmbedDialog } from "@/components/admin/MediaEmbedDialogs";
import type { Section, Page, ReadingProgress, Chapter } from "@shared/schema";

export default function SectionReader() {
  const { sectionId } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAdmin } = useAuth();
  const { setCurrentSong } = useMusicPlayer();
  const lastSongRef = useRef<string | null>(null);
  const { toast } = useToast();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [creatingPage, setCreatingPage] = useState(false);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isInstagramDialogOpen, setIsInstagramDialogOpen] = useState(false);
  const [isSpotifyDialogOpen, setIsSpotifyDialogOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [editedTags, setEditedTags] = useState("");
  const [editedMood, setEditedMood] = useState("");
  const [isPublishedDatePopoverOpen, setIsPublishedDatePopoverOpen] = useState(false);
  const [manualPublishedDateDraft, setManualPublishedDateDraft] = useState<Date | undefined>();
  const pageStartTimeRef = useRef<number | null>(null);
  const previousPageIdRef = useRef<string | null>(null);
  const hasCompletedSectionRef = useRef<boolean>(false);
  const progressRestoredRef = useRef<boolean>(false);
  // Removed visitedPages state - now using simple last page completion

  const { data: section, isLoading: isSectionLoading } = useQuery<Section>({
    queryKey: [`/api/sections/${sectionId}`],
  });

  const { data: chapter, isLoading: isChapterLoading } = useQuery<Chapter>({
    queryKey: [`/api/chapters/${section?.chapterId}`],
    enabled: !!section?.chapterId,
  });

  const { data: pages = [], isLoading: isPagesLoading } = useQuery<Page[]>({
    queryKey: [`/api/sections/${sectionId}/pages`],
  });

  // Fetch saved reading progress for this section
  const { data: savedProgress } = useQuery<ReadingProgress | null>({
    queryKey: [`/api/sections/${sectionId}/progress`, user?.id],
    queryFn: () => user?.id ? fetch(`/api/sections/${sectionId}/progress?userId=${user.id}`).then(r => r.json()) : null,
    enabled: !!user?.id && !!sectionId,
  });

  // Fetch all sections for the current chapter to determine position
  const { data: allSections = [] } = useQuery<Section[]>({
    queryKey: [`/api/chapters/${section?.chapterId}/sections`],
    enabled: !!section?.chapterId,
  });

  const publishedDate = useMemo(() => {
    if (!section?.publishedAt) {
      return undefined;
    }

    const value = section.publishedAt as unknown as string | Date;
    const date = typeof value === "string" ? new Date(value) : value;

    return Number.isNaN(date.getTime()) ? undefined : date;
  }, [section?.publishedAt]);

  const publishedDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }),
    [],
  );

  const formattedPublishedDate = publishedDate ? publishedDateFormatter.format(publishedDate) : undefined;
  const isManualPublishedDate = Boolean(section?.publishedDateManual);

  // Check if user has liked this section
  const { data: likeStatus } = useQuery<{ isLiked: boolean }>({
    queryKey: [`/api/sections/${sectionId}/like-status`, user?.id],
    queryFn: () => user?.id 
      ? fetch(`/api/sections/${sectionId}/like-status?userId=${user.id}`).then(r => r.json()) 
      : Promise.resolve({ isLiked: false }),
    enabled: !!user?.id && !!sectionId,
  });

  // Get like count for the section
  const { data: likeCount } = useQuery<{ count: number }>({
    queryKey: [`/api/sections/${sectionId}/like-count`],
    queryFn: () => fetch(`/api/sections/${sectionId}/like-count`).then(r => r.json()),
    enabled: !!sectionId,
  });

  const likeSectionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !sectionId) throw new Error("Missing required data");
      return apiRequest("POST", `/api/sections/${sectionId}/like`, { userId: user.id });
    },
    onSuccess: () => {
      // Invalidate queries to refetch like status and count
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/like-status`, user?.id] });
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/like-count`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/liked-sections`] });
      toast({ title: "Section liked!", description: "Added to your Liked Sections" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "";
      
      if (errorMessage.includes("session") || errorMessage.includes("expired")) {
        toast({ 
          title: "Session expired", 
          description: "Please log in again to continue",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Failed to like section", 
          description: "Please try again later",
          variant: "destructive" 
        });
      }
    },
  });

  const unlikeSectionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !sectionId) throw new Error("Missing required data");
      return apiRequest("DELETE", `/api/sections/${sectionId}/like?userId=${user.id}`, {});
    },
    onSuccess: () => {
      // Invalidate queries to refetch like status and count
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/like-status`, user?.id] });
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/like-count`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/liked-sections`] });
      toast({ title: "Section unliked", description: "Removed from your Liked Sections" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "";
      
      if (errorMessage.includes("session") || errorMessage.includes("expired")) {
        toast({ 
          title: "Session expired", 
          description: "Please log in again to continue",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Failed to unlike section", 
          description: "Please try again later",
          variant: "destructive" 
        });
      }
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: async (data: { pageId: string; completed: boolean; currentPageNumber: number }) => {
      if (!user?.id) return;
      return apiRequest("POST", "/api/reading-progress", {
        userId: user.id,
        sectionId: sectionId!,
        pageId: data.pageId,
        currentPageNumber: data.currentPageNumber,
        completed: data.completed,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate user progress queries to update badges immediately
      if (user?.id) {
        // Invalidate user's overall progress (used by chapter-view and other pages)
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/progress`] });
        
        // Invalidate section-specific progress to update the completed badge
        queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/progress`, user.id] });
        
        if (section?.chapterId) {
          // Invalidate chapter progress with the exact query key format used in home.tsx
          queryClient.invalidateQueries({ queryKey: [`/api/chapters/${section.chapterId}/progress?userId=${user.id}`] });
        }
      }
    },
  });

  const trackAnalyticsMutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      pageId: string;
      sectionId: string;
      chapterId: string;
      eventType: string;
      duration: number;
    }) => {
      return apiRequest("POST", "/api/analytics", data);
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: async (data: { pageId: string; content: string }) => {
      return apiRequest("PATCH", `/api/pages/${data.pageId}`, { content: data.content });
    },
    onSuccess: (_, variables) => {
      // Optimistically update the cache with new content
      queryClient.setQueryData<Page[]>([`/api/sections/${sectionId}/pages`], (old) => {
        if (!old) return old;
        return old.map(page =>
          page.id === variables.pageId
            ? { ...page, content: variables.content }
            : page
        );
      });

      // Invalidate to refetch fresh data from server
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/pages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}`] });
      if (section?.chapterId) {
        queryClient.invalidateQueries({ queryKey: [`/api/chapters/${section.chapterId}/sections`] });
      }

      toast({ title: "Page updated successfully" });
      setIsEditMode(false);
    },
    onError: () => {
      toast({ 
        title: "Failed to update page", 
        description: "Please try again", 
        variant: "destructive" 
      });
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: (sectionOrders: { id: string; order: number }[]) =>
      apiRequest("PATCH", "/api/sections/reorder", { sectionOrders }),
    onSuccess: () => {
      if (section?.chapterId) {
        queryClient.invalidateQueries({ queryKey: [`/api/chapters/${section.chapterId}/sections`] });
        queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}`] });
      }
      toast({ title: "Section order updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to reorder sections", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: { sectionId: string; content: string; pageNumber: number }): Promise<Page> => {
      return await apiRequest("POST", "/api/pages", data) as unknown as Page;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/pages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}`] });
      if (section?.chapterId) {
        queryClient.invalidateQueries({ queryKey: [`/api/chapters/${section.chapterId}/sections`] });
      }
      toast({ title: "Page created successfully" });
      setCreatingPage(false);
      // Navigate to the new page (last page)
      setCurrentPageIndex(pages.length);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create page", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      await apiRequest("DELETE", `/api/pages/${pageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}/pages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}`] });
      if (section?.chapterId) {
        queryClient.invalidateQueries({ queryKey: [`/api/chapters/${section.chapterId}/sections`] });
      }
      toast({ title: "Page deleted successfully" });
      setDeletingPageId(null);

      // Smart navigation: adjust current page index if needed
      const deletedPageIndex = pages.findIndex(p => p.id === deletingPageId);
      if (deletedPageIndex >= 0) {
        // If we're on the deleted page or after it, go to previous page
        if (currentPageIndex >= deletedPageIndex) {
          setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
        }
        // If this was the last page and we're now beyond the new last page, adjust
        if (currentPageIndex >= pages.length - 1) {
          setCurrentPageIndex(Math.max(0, pages.length - 2));
        }
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete page", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
      setDeletingPageId(null);
    },
  });

  type SectionUpdatePayload = {
    title?: string;
    tags?: string[];
    mood?: string[];
    publishedAt?: string | null;
    publishedDateManual?: boolean;
  };

  const updateSectionMutation = useMutation({
    mutationFn: async (data: SectionUpdatePayload) => {
      return apiRequest("PATCH", `/api/sections/${sectionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/chapters/${section?.chapterId}/sections`] });
      toast({ title: "Section updated successfully" });
      setEditingTitle(false);
      setEditingMetadata(false);
    },
    onError: () => {
      toast({ 
        title: "Failed to update section", 
        description: "Please try again",
        variant: "destructive" 
      });
    },
  });

  const moveSectionUp = () => {
    if (!section) return;
    const chapterSections = allSections.filter(s => s.chapterId === section.chapterId).sort((a, b) => a.order - b.order);
    const currentIndex = chapterSections.findIndex(s => s.id === section.id);
    if (currentIndex <= 0) return;

    const sectionOrders = chapterSections.map((s, idx) => {
      if (idx === currentIndex - 1) {
        return { id: s.id, order: section.order };
      } else if (idx === currentIndex) {
        return { id: s.id, order: chapterSections[currentIndex - 1].order };
      }
      return { id: s.id, order: s.order };
    });

    reorderSectionsMutation.mutate(sectionOrders);
  };

  const moveSectionDown = () => {
    if (!section) return;
    const chapterSections = allSections.filter(s => s.chapterId === section.chapterId).sort((a, b) => a.order - b.order);
    const currentIndex = chapterSections.findIndex(s => s.id === section.id);
    if (currentIndex === -1 || currentIndex >= chapterSections.length - 1) return;

    const sectionOrders = chapterSections.map((s, idx) => {
      if (idx === currentIndex) {
        return { id: s.id, order: chapterSections[currentIndex + 1].order };
      } else if (idx === currentIndex + 1) {
        return { id: s.id, order: section.order };
      }
      return { id: s.id, order: s.order };
    });

    reorderSectionsMutation.mutate(sectionOrders);
  };

  const currentPage = pages[currentPageIndex];
  const totalPages = pages.length;

  // Determine section navigation
  const sortedSections = allSections.length > 0 ? [...allSections].sort((a, b) => a.order - b.order) : [];
  const currentSectionIndex = sortedSections.findIndex(s => s.id === sectionId);
  const nextSection = currentSectionIndex >= 0 && currentSectionIndex < sortedSections.length - 1
    ? sortedSections[currentSectionIndex + 1]
    : null;
  const isLastSection = sortedSections.length > 0 && currentSectionIndex === sortedSections.length - 1;
  const isLastPage = currentPageIndex === totalPages - 1;

  const sendAnalyticsEvent = (pageId: string, eventType: string = "page_view", duration: number) => {
    if (!user?.id || !section?.chapterId) return;
    
    trackAnalyticsMutation.mutate({
      userId: user.id,
      pageId,
      sectionId: sectionId!,
      chapterId: section.chapterId,
      eventType,
      duration,
    });
  };

  useEffect(() => {
    if (currentPage && user?.id) {
      const isLastPage = currentPageIndex === totalPages - 1;
      
      // Send analytics for previous page if we have timing data
      if (previousPageIdRef.current && pageStartTimeRef.current) {
        const duration = Date.now() - pageStartTimeRef.current;
        sendAnalyticsEvent(previousPageIdRef.current, "page_view", duration);
      }
      
      // Start timing for new page
      pageStartTimeRef.current = Date.now();
      previousPageIdRef.current = currentPage.id;
      
      // Save reading progress - mark as completed if on last page
      saveProgressMutation.mutate({
        pageId: currentPage.id,
        currentPageNumber: currentPage.pageNumber,
        completed: isLastPage,
      });

      // Send section completed event only once when reaching last page
      if (isLastPage && section?.chapterId && !hasCompletedSectionRef.current) {
        hasCompletedSectionRef.current = true;
        trackAnalyticsMutation.mutate({
          userId: user.id,
          pageId: currentPage.id,
          sectionId: sectionId!,
          chapterId: section.chapterId,
          eventType: "section_completed",
          duration: 0,
        });
      }
    }
  }, [currentPageIndex, currentPage?.id, user?.id]);

  // Reset completion flag, edit mode, and page index when section changes
  useEffect(() => {
    hasCompletedSectionRef.current = false;
    pageStartTimeRef.current = Date.now();
    previousPageIdRef.current = null;
    setIsEditMode(false);
    setEditedContent("");
    setCurrentPageIndex(0); // Reset to first page when section changes
  }, [sectionId]);

  useEffect(() => {
    setIsPublishedDatePopoverOpen(false);
    setManualPublishedDateDraft(undefined);
  }, [sectionId]);

  // Ensure currentPageIndex stays within bounds when pages change
  useEffect(() => {
    if (pages.length > 0 && currentPageIndex >= pages.length) {
      // If current page index is out of bounds, reset to last valid page
      setCurrentPageIndex(pages.length - 1);
    }
  }, [pages.length, currentPageIndex]);

  // Exit edit mode when page changes
  useEffect(() => {
    setIsEditMode(false);
    setEditedContent("");
  }, [currentPage?.id]);

  // Send final analytics when leaving the section
  useEffect(() => {
    return () => {
      if (previousPageIdRef.current && pageStartTimeRef.current && user?.id && section?.chapterId) {
        const duration = Date.now() - pageStartTimeRef.current;
        sendAnalyticsEvent(previousPageIdRef.current, "page_view", duration);
      }
    };
  }, [sectionId]);

  // Simplified automatic music playback:
  // 1. Section-specific music takes priority (show toast for special moments)
  // 2. Otherwise use chapter-level playlist (background music, no toast)
  useEffect(() => {
    if (isSectionLoading) return;
    if (!section) return;
    if (section.chapterId && isChapterLoading) return;

    const targetSongUrl = section.songUrl ?? chapter?.songUrl ?? null;

    if (!targetSongUrl) {
      if (lastSongRef.current !== null) {
        lastSongRef.current = null;
        setCurrentSong(null, null, true);
      }
      return;
    }

    if (lastSongRef.current === targetSongUrl) {
      return;
    }

    lastSongRef.current = targetSongUrl;

    const targetName = section.songUrl
      ? section.title
      : chapter?.title || "Background Music";

    setCurrentSong(targetSongUrl, targetName, true);

    if (section.songUrl) {
      toast({
        title: "♪ Special Music",
        description: `Now playing: ${section.title}`,
      });
    }
  }, [
    section?.id,
    section?.songUrl,
    chapter?.songUrl,
    chapter?.title,
    isSectionLoading,
    isChapterLoading,
    setCurrentSong,
    toast,
  ]);

  // Load Instagram embed script when page contains Instagram content
  useEffect(() => {
    if (currentPage?.content && currentPage.content.includes("instagram.com")) {
      // Load Instagram embed script if not already loaded
      if (!document.getElementById("instagram-embed-script")) {
        const script = document.createElement("script");
        script.id = "instagram-embed-script";
        script.src = "https://www.instagram.com/embed.js";
        script.async = true;
        script.onload = () => {
          // Process embeds once script loads
          if ((window as any).instgrm) {
            (window as any).instgrm.Embeds.process();
          }
        };
        document.body.appendChild(script);
      } else if ((window as any).instgrm) {
        // If script already loaded, reprocess embeds for new content
        setTimeout(() => {
          (window as any).instgrm.Embeds.process();
        }, 100);
      }
    }
  }, [currentPage?.content]);

  // Restore saved reading progress on mount
  useEffect(() => {
    if (savedProgress && !progressRestoredRef.current && pages.length > 0) {
      // Restore to saved page number (convert to 0-indexed)
      const savedPageIndex = Math.max(0, (savedProgress.currentPageNumber || 1) - 1);
      const validPageIndex = Math.min(savedPageIndex, pages.length - 1);
      setCurrentPageIndex(validPageIndex);
      progressRestoredRef.current = true;
    }
  }, [savedProgress, pages.length]);

  // Reset progress restoration flag when section changes
  useEffect(() => {
    progressRestoredRef.current = false;
  }, [sectionId]);

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
      setIsEditMode(false);
    }
  };

  const handleNextPage = () => {
    // If we're not on the last page, just advance to next page
    if (!isLastPage) {
      setCurrentPageIndex(currentPageIndex + 1);
      setIsEditMode(false);
      return;
    }

    // We're on the last page of this section
    if (isLastSection) {
      // Last page of last section - go back to chapters
      setLocation("/");
    } else if (nextSection) {
      // Navigate to next section
      setLocation(`/read/${nextSection.id}`);
    }
  };

  const handleEnterEditMode = () => {
    if (currentPage) {
      setEditedContent(currentPage.content);
      setIsEditMode(true);
    }
  };

  const handleCreatePage = () => {
    if (!sectionId) return;
    
    // Get the next page number based on maximum existing page number
    const maxPageNumber = pages.length > 0 
      ? Math.max(...pages.map(p => p.pageNumber)) 
      : 0;
    const nextPageNumber = maxPageNumber + 1;
    
    createPageMutation.mutate({
      sectionId: sectionId,
      content: "",
      pageNumber: nextPageNumber,
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedContent("");
  };

  const handlePublishedDatePopoverChange = (open: boolean) => {
    setIsPublishedDatePopoverOpen(open);
    if (open) {
      if (publishedDate) {
        setManualPublishedDateDraft(publishedDate);
      } else {
        setManualPublishedDateDraft(new Date());
      }
    }
  };

  const handleSaveManualPublishedDate = () => {
    if (!manualPublishedDateDraft) return;

    updateSectionMutation.mutate(
      {
        publishedAt: manualPublishedDateDraft.toISOString(),
        publishedDateManual: true,
      },
      {
        onSuccess: () => {
          setIsPublishedDatePopoverOpen(false);
        },
      },
    );
  };

  const handleUseAutomaticPublishedDate = () => {
    const now = new Date();
    setManualPublishedDateDraft(undefined);

    updateSectionMutation.mutate(
      {
        publishedAt: now.toISOString(),
        publishedDateManual: false,
      },
      {
        onSuccess: () => {
          setIsPublishedDatePopoverOpen(false);
        },
      },
    );
  };

  const handleSaveEdit = () => {
    if (currentPage) {
      updatePageMutation.mutate({
        pageId: currentPage.id,
        content: editedContent,
      });
    }
  };

  const insertMediaContent = (html: string) => {
    // Append the media content to the end of the current content
    setEditedContent(editedContent + "\n\n" + html);
  };

  const renderContent = (content: string) => {
    const embedRegex = /\[embed:([^\]]+)\]/g;
    const galleryRegex = /\[gallery:([^\]]+)\]/g;
    const videoRegex = /\[video:([^\]]+)\]/g;
    const instagramGalleryRegex = /\[instagram-gallery:([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Combine all matches from all patterns
    const allMatches: Array<{ index: number; type: 'embed' | 'gallery' | 'video' | 'instagram-gallery'; data: string }> = [];
    
    let match;
    while ((match = embedRegex.exec(content)) !== null) {
      allMatches.push({ index: match.index, type: 'embed', data: match[1] });
    }
    while ((match = galleryRegex.exec(content)) !== null) {
      allMatches.push({ index: match.index, type: 'gallery', data: match[1] });
    }
    while ((match = videoRegex.exec(content)) !== null) {
      allMatches.push({ index: match.index, type: 'video', data: match[1] });
    }
    while ((match = instagramGalleryRegex.exec(content)) !== null) {
      allMatches.push({ index: match.index, type: 'instagram-gallery', data: match[1] });
    }
    
    // Sort by index
    allMatches.sort((a, b) => a.index - b.index);

    allMatches.forEach((item, idx) => {
      // Add HTML content before this match
      if (item.index > lastIndex) {
        const htmlContent = content.substring(lastIndex, item.index);
        if (htmlContent.trim()) {
          parts.push(
            <div 
              key={`html-${idx}-${lastIndex}`}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          );
        }
      }
      
      if (item.type === 'gallery') {
        // Gallery embed: [gallery:url1,url2,url3] - supports mixed media (images and videos)
        // Videos are marked with 'video:' prefix
        const mediaUrls = item.data.split(',').map(url => url.trim()).filter(url => url);
        parts.push(
          <PhotoSwipeGallery key={`gallery-${idx}`} images={mediaUrls} />
        );
        lastIndex = item.index + `[gallery:${item.data}]`.length;
      } else if (item.type === 'video') {
        // Legacy standalone video embed: [video:url] - kept for backwards compatibility
        const videoUrl = item.data;
        parts.push(
          <div key={`video-${idx}`} className="my-6">
            <video
              controls
              className="w-full rounded-lg shadow-md"
              preload="metadata"
            >
              <source src={videoUrl} />
              Your browser does not support the video tag.
            </video>
          </div>
        );
        lastIndex = item.index + `[video:${item.data}]`.length;
      } else if (item.type === 'instagram-gallery') {
        // Instagram gallery: [instagram-gallery:url1,url2,url3] - multiple reels/posts in compact grid
        const instagramUrls = item.data.split(',').map(url => url.trim()).filter(url => url);
        parts.push(
          <InstagramGallery key={`instagram-gallery-${idx}`} urls={instagramUrls} />
        );
        lastIndex = item.index + `[instagram-gallery:${item.data}]`.length;
      } else {
        // Single embed: [embed:url]
        const embedUrl = item.data;
        if (embedUrl.includes("instagram.com")) {
          // Use minimal Instagram embed component
          parts.push(
            <InstagramEmbed 
              key={`embed-${idx}`}
              url={embedUrl}
            />
          );
        } else if (embedUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          parts.push(
            <PhotoSwipeGallery key={`embed-${idx}`} images={[embedUrl]} />
          );
        }
        lastIndex = item.index + `[embed:${item.data}]`.length;
      }
    });

    // Add remaining HTML content
    if (lastIndex < content.length) {
      const htmlContent = content.substring(lastIndex);
      if (htmlContent.trim()) {
        parts.push(
          <div 
            key={`html-final`}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        );
      }
    }

    // If no special tokens found and we have content, render as HTML
    if (parts.length === 0 && content.trim()) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }

    return parts;
  };

  const handleStartTitleEdit = () => {
    if (!section) return;
    setEditedTitle(section.title);
    setEditingTitle(true);
  };

  const handleSaveTitleEdit = () => {
    if (!editedTitle.trim()) {
      toast({ 
        title: "Title cannot be empty", 
        variant: "destructive" 
      });
      return;
    }
    updateSectionMutation.mutate({ title: editedTitle.trim() });
  };

  const handleCancelTitleEdit = () => {
    setEditingTitle(false);
    setEditedTitle("");
  };

  const handleStartMetadataEdit = () => {
    if (!section) return;
    setEditedTags(section.tags?.join(", ") || "");
    setEditedMood(section.mood?.join(", ") || "");
    setEditingMetadata(true);
  };

  const handleSaveMetadataEdit = () => {
    const tagsArray = editedTags.split(",").map(t => t.trim()).filter(t => t.length > 0);
    const moodArray = editedMood.split(",").map(t => t.trim()).filter(t => t.length > 0);
    updateSectionMutation.mutate({ 
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      mood: moodArray.length > 0 ? moodArray : undefined
    });
  };

  const handleCancelMetadataEdit = () => {
    setEditingMetadata(false);
    setEditedTags("");
    setEditedMood("");
  };

  const handleToggleLike = () => {
    if (!user?.id) {
      toast({ 
        title: "Please login to like sections",
        variant: "destructive"
      });
      return;
    }

    if (likeStatus?.isLiked) {
      unlikeSectionMutation.mutate();
    } else {
      likeSectionMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-kdrama-sakura/10 via-kdrama-cream/30 to-kdrama-lavender/10">
      {section?.chapterId && (
        <SectionSidebar
          chapterId={section.chapterId}
          currentSectionId={sectionId!}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      <div className={`transition-all duration-300 ${sidebarOpen ? "lg:ml-80" : "lg:ml-16"}`}>
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Red String Progress Indicator - Seamlessly integrated */}
          <div className="pt-8 pb-4">
            <RedStringProgress
              currentPage={currentPageIndex + 1}
              totalPages={totalPages}
              sectionTitle={section?.title}
              initialProgress={savedProgress && totalPages > 0 ? ((savedProgress.currentPageNumber || 1) / totalPages) * 100 : 0}
            />
          </div>
          <div className="mb-8">
            {/* Title - Inline Editing */}
            {editingTitle ? (
              <div className="flex items-center gap-2 mb-4">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="font-myeongjo text-2xl h-auto py-2"
                  placeholder="Section title"
                  data-testid="input-edit-title"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSaveTitleEdit}
                  disabled={updateSectionMutation.isPending}
                  data-testid="button-save-title"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelTitleEdit}
                  disabled={updateSectionMutation.isPending}
                  data-testid="button-cancel-title"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="font-myeongjo text-3xl md:text-4xl text-kdrama-ink">
                  {section?.title || "Loading..."}
                </h1>
                
                {/* Like Button */}
                {user && section && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 transition-all ${
                      likeStatus?.isLiked 
                        ? "text-red-500 hover:text-red-600" 
                        : "text-red-400 hover:text-red-500"
                    }`}
                    onClick={handleToggleLike}
                    disabled={likeSectionMutation.isPending || unlikeSectionMutation.isPending}
                    data-testid="button-like-section"
                  >
                    <Heart 
                      className={`w-5 h-5 transition-all stroke-current ${
                        likeStatus?.isLiked ? "fill-current" : "fill-transparent"
                      }`} 
                    />
                  </Button>
                )}

                {isAdmin && section && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleStartTitleEdit}
                    data-testid="button-edit-title"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            
            {/* Tags and Mood - Inline Editing */}
            {section && (
              <>
                {editingMetadata ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="font-noto text-sm w-16">Mood:</Label>
                      <Input
                        value={editedMood}
                        onChange={(e) => setEditedMood(e.target.value)}
                        className="font-noto flex-1"
                        placeholder="e.g., Joyful, Melancholic"
                        data-testid="input-edit-mood"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="font-noto text-sm w-16">Tags:</Label>
                      <Input
                        value={editedTags}
                        onChange={(e) => setEditedTags(e.target.value)}
                        className="font-noto flex-1"
                        placeholder="Comma separated, e.g., romance, family"
                        data-testid="input-edit-tags"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveMetadataEdit}
                        disabled={updateSectionMutation.isPending}
                        data-testid="button-save-metadata"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelMetadataEdit}
                        disabled={updateSectionMutation.isPending}
                        data-testid="button-cancel-metadata"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3 mt-3 group">
                      {section.mood?.map((mood, idx) => (
                        <Badge key={`mood-${idx}`} variant="secondary" className="font-noto">
                          {mood}
                        </Badge>
                      ))}
                      {section.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="font-noto">
                          #{tag}
                        </Badge>
                      ))}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={handleStartMetadataEdit}
                          data-testid="button-edit-metadata"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {/* Show completed badge if user has finished this section */}
                    {user && savedProgress?.completed && (
                      <div className="mt-3">
                        <Badge 
                          variant="default" 
                          className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-md font-noto"
                          data-testid={`badge-completed-section`}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

        <Card className="relative p-8 md:p-12 bg-white/80 backdrop-blur-sm border-0 shadow-md">
          {(formattedPublishedDate || isAdmin) && (
            <div className="absolute top-6 right-6 flex flex-wrap items-center justify-end gap-2">
              {formattedPublishedDate ? (
                <span className="inline-flex items-center rounded-full bg-kdrama-ink/10 text-kdrama-ink px-3 py-1 text-xs font-medium uppercase tracking-wide font-noto shadow-sm">
                  {formattedPublishedDate}
                </span>
              ) : (
                isAdmin && (
                  <span className="inline-flex items-center rounded-full border border-dashed border-muted-foreground/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground font-noto">
                    Set published date
                  </span>
                )
              )}
              {isManualPublishedDate && (
                <Badge variant="outline" className="font-noto text-[0.65rem] uppercase tracking-wide">
                  Manual
                </Badge>
              )}
              {isAdmin && (
                <Popover open={isPublishedDatePopoverOpen} onOpenChange={handlePublishedDatePopoverChange}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end">
                    <div className="space-y-3">
                      <DatePickerCalendar
                        mode="single"
                        selected={manualPublishedDateDraft}
                        onSelect={(date) => setManualPublishedDateDraft(date ?? undefined)}
                        initialFocus
                      />
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={handleUseAutomaticPublishedDate}
                          disabled={updateSectionMutation.isPending}
                        >
                          Use last edit date
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSaveManualPublishedDate}
                          disabled={!manualPublishedDateDraft || updateSectionMutation.isPending}
                        >
                          Save date
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
          {isAdmin && currentPage && (
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreatingPage(true)}
                  data-testid="button-create-page"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Page
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={moveSectionUp}
                  disabled={!section || allSections.filter(s => s.chapterId === section.chapterId).sort((a, b) => a.order - b.order)[0]?.id === section.id}
                  data-testid="button-move-section-up"
                >
                  <ArrowUp className="w-4 h-4 mr-1" />
                  Move Section Up
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={moveSectionDown}
                  disabled={!section || allSections.filter(s => s.chapterId === section.chapterId).sort((a, b) => a.order - b.order).slice(-1)[0]?.id === section.id}
                  data-testid="button-move-section-down"
                >
                  <ArrowDown className="w-4 h-4 mr-1" />
                  Move Section Down
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {!isEditMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnterEditMode}
                    data-testid="button-edit-page"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Page
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={updatePageMutation.isPending}
                      data-testid="button-cancel-edit"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updatePageMutation.isPending}
                      data-testid="button-save-edit"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updatePageMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="prose prose-lg max-w-none font-noto">
            {isPagesLoading ? (
              <p className="text-muted-foreground">Loading content...</p>
            ) : pages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  This section has no content yet.
                </p>
                {isAdmin && (
                  <p className="text-sm text-muted-foreground">
                    As an admin, you can add pages to this section from the admin console.
                  </p>
                )}
              </div>
            ) : currentPage ? (
              isEditMode ? (
                <div className="space-y-4">
                  <MediaToolbar
                    onInsertImage={() => setIsImageDialogOpen(true)}
                    onInsertInstagram={() => setIsInstagramDialogOpen(true)}
                    onInsertSpotify={() => setIsSpotifyDialogOpen(true)}
                  />
                  <div data-testid="editor-edit-content">
                    <TiptapEditor
                      value={editedContent}
                      onChange={setEditedContent}
                      placeholder="Write your journal entry..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use the rich text toolbar for formatting, the media toolbar for images/Instagram content,
                    and the Section Music button to update this section&apos;s Spotify soundtrack.
                  </p>
                </div>
              ) : (
                <div className="rendered-content leading-relaxed text-kdrama-ink">
                  {renderContent(currentPage.content)}
                </div>
              )
            ) : null}
          </div>
        </Card>

        {totalPages > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevPage}
              disabled={currentPageIndex === 0}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-4">
              <div className="font-noto text-sm text-muted-foreground">
                Page {currentPageIndex + 1} of {totalPages}
              </div>
              
              {isAdmin && currentPage && totalPages > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingPageId(currentPage.id)}
                  className="h-8 w-8"
                  data-testid={`button-delete-page-${currentPage.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              onClick={handleNextPage}
              data-testid="button-next-page"
            >
              {isLastPage && isLastSection ? (
                <>
                  Back to Chapters
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              ) : isLastPage && nextSection ? (
                <>
                  Next Section
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
        </div>
      </div>

      {/* Create Page Dialog */}
      <Dialog open={creatingPage} onOpenChange={setCreatingPage}>
        <DialogContent data-testid="dialog-create-page">
          <DialogHeader>
            <DialogTitle className="font-myeongjo">Create New Page</DialogTitle>
            <DialogDescription className="font-noto">
              Add a new empty page to this section. You can edit it after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground font-noto">
              A new blank page will be added as page {pages.length + 1} of this section.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreatingPage(false)}
              data-testid="button-cancel-create-page"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePage}
              disabled={createPageMutation.isPending}
              data-testid="button-submit-create-page"
            >
              {createPageMutation.isPending ? "Creating..." : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Page Confirmation Dialog */}
      <AlertDialog open={!!deletingPageId} onOpenChange={() => setDeletingPageId(null)}>
        <AlertDialogContent data-testid="dialog-delete-page">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
              {totalPages === 1 && " You cannot delete the last page in a section."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-page">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPageId && deletePageMutation.mutate(deletingPageId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-page"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Media Embed Dialogs */}
      <ImageEmbedDialog
        open={isImageDialogOpen}
        onOpenChange={setIsImageDialogOpen}
        onInsert={insertMediaContent}
      />
      <InstagramEmbedDialog
        open={isInstagramDialogOpen}
        onOpenChange={setIsInstagramDialogOpen}
        onInsert={insertMediaContent}
      />
      <SpotifyEmbedDialog
        open={isSpotifyDialogOpen}
        onOpenChange={setIsSpotifyDialogOpen}
        sectionId={sectionId}
      />
    </div>
  );
}
