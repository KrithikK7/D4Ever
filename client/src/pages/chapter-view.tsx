import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { PolaroidCard } from "@/components/PolaroidCard";
import { useAuth } from "@/contexts/AuthContext";
import type { Section, Chapter, ReadingProgress } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ChapterView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, hasPermission } = useAuth();
  const canCreateSections = hasPermission("canCreateSections");
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const { data: chapter } = useQuery<Chapter>({
    queryKey: [`/api/chapters/${id}`],
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: [`/api/chapters/${id}/sections`],
  });

  // Fetch reading progress for all sections
  const { data: userProgress = [] } = useQuery<ReadingProgress[]>({
    queryKey: [`/api/users/${user?.id}/progress`],
    queryFn: () =>
      user?.id
        ? fetch(`/api/users/${user.id}/progress`, {
            credentials: "include",
          }).then(r => r.json())
        : Promise.resolve([]),
    enabled: !!user?.id,
  });

  // Create a map of section progress for easy lookup
  const progressMap = new Map<string, ReadingProgress>();
  userProgress.forEach(progress => {
    progressMap.set(progress.sectionId, progress);
  });

  const createSectionMutation = useMutation({
    mutationFn: async (payload: { title: string; order: number }) => {
      const response = await apiRequest("POST", "/api/sections", {
        title: payload.title,
        chapterId: id!,
        order: payload.order,
      });
      return response.json();
    },
    onSuccess: (section) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chapters/${id}/sections`] });
      setIsCreateOpen(false);
      setNewSectionTitle("");
      toast({ title: "Section created", description: "Opening the new section now." });
      setLocation(`/read/${section.id}`);
    },
    onError: () => {
      toast({
        title: "Failed to create section",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a section title.",
        variant: "destructive",
      });
      return;
    }
    const nextOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order)) + 1 : 1;
    createSectionMutation.mutate({ title: newSectionTitle.trim(), order: nextOrder });
  };

  return (
    <>
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
          <div className="flex-1 min-w-0">
            <h1 className="font-myeongjo text-4xl text-kdrama-ink">
              {chapter?.title || "Loading..."}
            </h1>
            {chapter?.description && (
              <p className="font-noto text-muted-foreground mt-2">
                {chapter.description}
              </p>
            )}
          </div>
          {canCreateSections && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              data-testid="button-create-section-chapter"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Section
            </Button>
          )}
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
      {user?.role === "admin" && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new section</DialogTitle>
              <DialogDescription>Add a new moment to this chapter.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-section-title">Section title</Label>
                <Input
                  id="new-section-title"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Han River Nights"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateSection();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSection}
                disabled={createSectionMutation.isPending}
                data-testid="button-create-section-confirm-chapter"
              >
                {createSectionMutation.isPending ? "Creating..." : "Create Section"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
