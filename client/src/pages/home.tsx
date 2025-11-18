import { useMutation, useQuery, useQueries } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book, LogIn, LogOut, Play, CheckCircle2, PlayCircle, Heart, Plus } from "lucide-react";
import { Knot } from "@/components/Knot";
import { useAuth } from "@/contexts/AuthContext";
import type { Chapter, ReadingProgress, Section } from "@shared/schema";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ChapterProgress {
  completed: boolean;
  inProgress: boolean;
  totalSections: number;
  completedSections: number;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [chapterForm, setChapterForm] = useState({
    title: "",
    description: "",
    coverImage: "",
    songUrl: "",
    order: "1",
  });

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/chapters"],
  });

  const { data: lastRead } = useQuery<ReadingProgress | null>({
    queryKey: [`/api/reading-progress/last?userId=${user?.id || ''}`],
    enabled: !!user,
  });

  const { data: likedSections = [] } = useQuery<Section[]>({
    queryKey: [`/api/users/${user?.id}/liked-sections`],
    queryFn: () =>
      user?.id
        ? fetch(`/api/users/${user.id}/liked-sections`, {
            credentials: "include",
          }).then(r => r.json())
        : Promise.resolve([]),
    enabled: !!user?.id,
  });

  // Fetch progress for all chapters using useQueries to avoid hook order issues
  const chapterProgressQueries = useQueries({
    queries: chapters.map((chapter) => ({
      queryKey: [`/api/chapters/${chapter.id}/progress?userId=${user?.id || ''}`],
      enabled: !!user && !!chapter.id,
    })),
  });

  // Create a map of chapter ID to progress data
  const progressMap = useMemo(() => {
    const map = new Map<string, ChapterProgress>();
    chapters.forEach((chapter, index) => {
      if (chapterProgressQueries[index]?.data) {
        map.set(chapter.id, chapterProgressQueries[index].data as ChapterProgress);
      }
    });
    return map;
  }, [chapters, chapterProgressQueries]);

  const handleLogin = () => {
    setLocation("/login");
  };

  const handleAdmin = () => {
    setLocation("/admin");
  };

  const handleResume = () => {
    if (lastRead?.sectionId) {
      setLocation(`/read/${lastRead.sectionId}`);
    }
  };

  const resetChapterForm = () => {
    setChapterForm({
      title: "",
      description: "",
      coverImage: "",
      songUrl: "",
      order: (chapters.length + 1).toString(),
    });
  };

  const openCreateDialog = () => {
    resetChapterForm();
    setIsCreateOpen(true);
  };

  const createChapterMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: chapterForm.title.trim(),
        description: chapterForm.description.trim() || null,
        coverImage: chapterForm.coverImage.trim() || null,
        songUrl: chapterForm.songUrl.trim() || null,
        order: Number.isNaN(parseInt(chapterForm.order, 10))
          ? chapters.length + 1
          : parseInt(chapterForm.order, 10),
      };
      const response = await apiRequest("POST", "/api/chapters", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chapters"] });
      setIsCreateOpen(false);
      resetChapterForm();
      toast({
        title: "Chapter created",
        description: "Your new chapter is ready.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to create chapter",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateChapter = () => {
    if (!chapterForm.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a chapter title.",
        variant: "destructive",
      });
      return;
    }
    createChapterMutation.mutate();
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-kdrama-cream/40 via-kdrama-sakura/20 to-kdrama-lavender/20">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-kdrama-thread via-kdrama-sakura to-kdrama-lavender" />
      
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-end mb-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="font-noto text-sm text-muted-foreground">
                {user?.username}
              </span>
              {user?.role === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdmin}
                  data-testid="button-admin"
                >
                  Admin
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogin}
              data-testid="button-login-header"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
          )}
        </div>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Knot size="lg" tone="primary" />
            <h1 className="font-myeongjo text-5xl md:text-7xl font-bold text-kdrama-ink dark:text-foreground">
              紅線日記
            </h1>
            <Knot size="lg" tone="gold" />
          </div>
          
          <p className="font-noto text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Red String of Fate Journal
          </p>

          {lastRead && (
            <Button
              size="lg"
              onClick={handleResume}
              className="font-noto rounded-2xl"
              data-testid="button-resume"
            >
              <Play className="w-5 h-5 mr-2" />
              Resume Reading
            </Button>
          )}
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-myeongjo text-3xl font-bold text-kdrama-ink dark:text-foreground">
              Chapters
            </h2>
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="font-noto border border-kdrama-thread/40 bg-kdrama-thread/20 text-white"
              >
                {chapters.length} {chapters.length === 1 ? "Chapter" : "Chapters"}
              </Badge>
              {user?.role === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCreateDialog}
                  data-testid="button-create-chapter-home"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chapter
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Liked Sections Card - Shows only when user has liked sections */}
            {user && likedSections.length > 0 && (
              <Card
                className="cursor-pointer bg-gradient-to-br from-kdrama-rose/10 via-white/80 to-kdrama-sakura/10 dark:from-kdrama-rose/20 dark:via-card/80 dark:to-kdrama-sakura/20 backdrop-blur-sm rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-180 hover:-translate-y-1 overflow-hidden relative"
                onClick={() => setLocation("/liked-sections")}
                data-testid="card-liked-sections"
              >
                <div className="absolute top-4 right-4 z-10">
                  <Badge 
                    variant="default" 
                    className="bg-transparent hover:bg-white/20 border-0 shadow-md font-noto text-[#f0425c]"
                  >
                    <Heart className="w-3 h-3 mr-1 fill-current" />
                    {likedSections.length}
                  </Badge>
                </div>
                
                <div className="h-48 w-full bg-gradient-to-br from-kdrama-rose/20 via-kdrama-sakura/30 to-kdrama-lavender/20 flex items-center justify-center">
                  <Heart className="w-16 h-16 text-[#f0425c] fill-transparent stroke-current stroke-2" />
                </div>
                
                <CardHeader>
                  <CardTitle className="font-myeongjo text-2xl text-kdrama-ink dark:text-foreground">
                    Liked Sections
                  </CardTitle>
                  <CardDescription className="font-noto">
                    Your collection of {likedSections.length} favorite {likedSections.length === 1 ? "section" : "sections"}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            
            {chapters.map((chapter) => {
              const progressData = progressMap.get(chapter.id);
              const showBadge = isAuthenticated && progressData;
              
              return (
                <Card
                  key={chapter.id}
                  className="cursor-pointer bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-180 hover:-translate-y-1 overflow-hidden relative"
                  onClick={() => setLocation(`/chapter/${chapter.id}`)}
                  data-testid={`card-chapter-${chapter.id}`}
                >
                  {showBadge && (
                    <div className="absolute top-4 right-4 z-10">
                      {progressData.completed ? (
                        <Badge 
                          variant="default" 
                          className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-md font-noto"
                          data-testid={`badge-completed-${chapter.id}`}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      ) : progressData.inProgress ? (
                        <Badge 
                          variant="default" 
                          className="bg-[#f0425c] hover:bg-[#f0425c]/90 text-white border-0 shadow-md font-noto"
                          data-testid={`badge-resume-${chapter.id}`}
                        >
                          <PlayCircle className="w-3 h-3 mr-1" />
                          Resume
                        </Badge>
                      ) : null}
                    </div>
                  )}
                  
                  {chapter.coverImage ? (
                    <div className="h-48 w-full overflow-hidden">
                      <img
                        src={chapter.coverImage}
                        alt={chapter.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-kdrama-rose/20 via-kdrama-sakura/30 to-kdrama-lavender/20 flex items-center justify-center">
                      <Book className="w-16 h-16 text-[#f0425c]" />
                    </div>
                  )}
                  
                  <CardHeader>
                    <CardTitle className="font-myeongjo text-2xl text-kdrama-ink dark:text-foreground">
                      {chapter.title}
                    </CardTitle>
                    {chapter.description && (
                      <CardDescription className="font-noto">
                        {chapter.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {chapters.length === 0 && (
            <div className="text-center py-16">
              <Knot size="lg" tone="muted" className="mx-auto mb-4" />
              <p className="font-noto text-lg text-muted-foreground">
                No chapters yet. The journey awaits...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
      {user?.role === "admin" && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Chapter</DialogTitle>
              <DialogDescription>Add a new chapter to the journal.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="chapter-title">Title</Label>
                <Input
                  id="chapter-title"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Spring Destiny"
                />
              </div>
              <div>
                <Label htmlFor="chapter-description">Description</Label>
                <Textarea
                  id="chapter-description"
                  value={chapterForm.description}
                  onChange={(e) => setChapterForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this chapter"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chapter-cover">Cover Image URL</Label>
                  <Input
                    id="chapter-cover"
                    value={chapterForm.coverImage}
                    onChange={(e) => setChapterForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="chapter-song">Theme Song URL</Label>
                  <Input
                    id="chapter-song"
                    value={chapterForm.songUrl}
                    onChange={(e) => setChapterForm((prev) => ({ ...prev, songUrl: e.target.value }))}
                    placeholder="Spotify track URL"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="chapter-order">Order</Label>
                <Input
                  id="chapter-order"
                  type="number"
                  min="0"
                  value={chapterForm.order}
                  onChange={(e) => setChapterForm((prev) => ({ ...prev, order: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateChapter}
                disabled={createChapterMutation.isPending}
              >
                {createChapterMutation.isPending ? "Creating..." : "Create Chapter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
