import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PolaroidCard } from "@/components/PolaroidCard";
import { useAuth } from "@/contexts/AuthContext";
import type { Section, Chapter, ReadingProgress } from "@shared/schema";

export default function ChapterView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const { data: chapter } = useQuery<Chapter>({
    queryKey: [`/api/chapters/${id}`],
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: [`/api/chapters/${id}/sections`],
  });

  // Fetch reading progress for all sections
  const { data: userProgress = [] } = useQuery<ReadingProgress[]>({
    queryKey: [`/api/users/${user?.id}/progress`],
    queryFn: () => user?.id 
      ? fetch(`/api/users/${user.id}/progress`).then(r => r.json()) 
      : Promise.resolve([]),
    enabled: !!user?.id,
  });

  // Create a map of section progress for easy lookup
  const progressMap = new Map<string, ReadingProgress>();
  userProgress.forEach(progress => {
    progressMap.set(progress.sectionId, progress);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-kdrama-sakura/10 via-kdrama-cream/30 to-kdrama-lavender/10">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-myeongjo text-4xl text-kdrama-ink">
              {chapter?.title || "Loading..."}
            </h1>
            {chapter?.description && (
              <p className="font-noto text-muted-foreground mt-2">
                {chapter.description}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sections.map((section) => {
            const sectionProgress = progressMap.get(section.id);
            return (
              <PolaroidCard
                key={section.id}
                title={section.title}
                mood={section.mood || undefined}
                tags={section.tags || undefined}
                coverUrl={section.thumbnail || undefined}
                completed={sectionProgress?.completed}
                inProgress={sectionProgress && !sectionProgress.completed}
                showBadge={isAuthenticated}
                onClick={() => {
                  setLocation(`/read/${section.id}`);
                }}
              />
            );
          })}
        </div>

        {sections.length === 0 && (
          <div className="text-center py-16">
            <p className="font-noto text-muted-foreground text-lg">
              No sections in this chapter yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
