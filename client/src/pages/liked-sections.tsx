import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PolaroidCard } from "@/components/PolaroidCard";
import type { Section, Chapter } from "@shared/schema";

export default function LikedSections() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Fetch all liked sections for the user
  const { data: likedSections = [], isLoading } = useQuery<Section[]>({
    queryKey: [`/api/users/${user?.id}/liked-sections`],
    queryFn: () => user?.id 
      ? fetch(`/api/users/${user.id}/liked-sections`, {
          credentials: "include",
        }).then(r => r.json()) 
      : Promise.resolve([]),
    enabled: !!user?.id,
  });

  // Fetch all chapters to show which chapter each section belongs to
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/chapters"],
  });

  // Create a map of chapter IDs to chapter objects for quick lookup
  const chapterMap = new Map<string, Chapter>();
  chapters.forEach(chapter => {
    chapterMap.set(chapter.id, chapter);
  });

  // Group liked sections by chapter
  const sectionsByChapter = likedSections.reduce((acc, section) => {
    const chapterId = section.chapterId;
    if (!acc[chapterId]) {
      acc[chapterId] = [];
    }
    acc[chapterId].push(section);
    return acc;
  }, {} as Record<string, Section[]>);

  const handleBack = () => {
    setLocation("/");
  };

  const handleSectionClick = (sectionId: string) => {
    setLocation(`/read/${sectionId}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-kdrama-cream/40 via-kdrama-sakura/20 to-kdrama-lavender/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="font-myeongjo">Login Required</CardTitle>
            <CardDescription className="font-noto">
              Please login to view your liked sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-kdrama-cream/40 via-kdrama-sakura/20 to-kdrama-lavender/20">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-kdrama-thread via-kdrama-sakura to-kdrama-lavender" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-10 w-10"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-kdrama-rose fill-kdrama-rose/50" />
              <h1 className="font-myeongjo text-3xl md:text-4xl font-bold text-kdrama-ink dark:text-foreground">
                Liked Sections
              </h1>
            </div>
            <p className="font-noto text-muted-foreground mt-2">
              Your collection of favorite moments from the journal
            </p>
          </div>

          <Badge variant="secondary" className="font-noto">
            {likedSections.length} {likedSections.length === 1 ? "Section" : "Sections"}
          </Badge>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="font-noto text-muted-foreground">Loading your liked sections...</p>
          </div>
        ) : likedSections.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-kdrama-rose/30 mx-auto mb-4" />
            <p className="font-noto text-lg text-muted-foreground">
              You haven't liked any sections yet.
            </p>
            <p className="font-noto text-sm text-muted-foreground mt-2">
              Start exploring chapters and like sections to save them here!
            </p>
            <Button 
              onClick={handleBack} 
              className="mt-6"
              data-testid="button-explore"
            >
              Explore Chapters
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(sectionsByChapter).map(([chapterId, sections]) => {
              const chapter = chapterMap.get(chapterId);
              return (
                <div key={chapterId} className="space-y-4">
                  {/* Chapter Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-border" />
                    <h2 className="font-myeongjo text-xl font-semibold text-kdrama-ink dark:text-foreground px-4">
                      {chapter?.title || "Unknown Chapter"}
                    </h2>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Sections Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sections.map((section) => (
                      <PolaroidCard
                        key={section.id}
                        title={section.title}
                        coverUrl={section.thumbnail || undefined}
                        mood={section.mood || undefined}
                        tags={section.tags || []}
                        onClick={() => handleSectionClick(section.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
