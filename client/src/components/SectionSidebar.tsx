import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Section } from "@shared/schema";
import { ImageUploadField } from "./admin/ImageUploadField";

interface SectionSidebarProps {
  chapterId: string;
  currentSectionId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function SectionSidebar({ chapterId, currentSectionId, isOpen, onToggle }: SectionSidebarProps) {
  const [, setLocation] = useLocation();
  const { user, hasPermission } = useAuth();
  const canCreateSections = hasPermission("canCreateSections");
  const canEditSectionsAll = hasPermission("canEditSections");
  const canEditOwnSections = hasPermission("canEditOwnSections");
  const canDeleteSectionsAll = hasPermission("canDeleteSections");
  const canDeleteOwnSections = hasPermission("canDeleteOwnSections");
  const { toast } = useToast();
  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedMood, setEditedMood] = useState("");
  const [editedTags, setEditedTags] = useState("");
  const [editedThumbnail, setEditedThumbnail] = useState("");
  const [editedSongUrl, setEditedSongUrl] = useState("");

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: [`/api/chapters/${chapterId}/sections`],
    enabled: !!chapterId,
  });

  // Get all liked sections for the user
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

  // Create a set of liked section IDs for quick lookup
  const likedSectionIds = new Set(likedSections.map(s => s.id));

  const createSectionMutation = useMutation({
    mutationFn: async (data: { title: string; chapterId: string; order: number }): Promise<Section> => {
      const response = await apiRequest("POST", "/api/sections", data);
      return await response.json();
    },
    onSuccess: (newSection: Section) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chapters/${chapterId}/sections`] });
      toast({ title: "Section created successfully" });
      setCreatingSection(false);
      setNewSectionTitle("");
      // Navigate to the new section
      setLocation(`/read/${newSection.id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create section", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chapters/${chapterId}/sections`] });
      toast({ title: "Section deleted successfully" });
      setDeletingSectionId(null);
      
      // Smart navigation: if we deleted the current section, navigate away
      if (deletingSectionId === currentSectionId) {
        // Try to navigate to the first remaining section
        const remainingSections = sections.filter(s => s.id !== deletingSectionId);
        if (remainingSections.length > 0) {
          setLocation(`/read/${remainingSections[0].id}`);
        } else {
          // No sections left, go back to chapters
          setLocation("/");
        }
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete section", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
      setDeletingSectionId(null);
    },
  });

  const likeSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      if (!user?.id) throw new Error("User not logged in");
      return apiRequest("POST", `/api/sections/${sectionId}/like`, { userId: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/liked-sections`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${currentSectionId}/like-status`] });
      toast({ title: "Section liked!" });
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
    mutationFn: async (sectionId: string) => {
      if (!user?.id) throw new Error("User not logged in");
      return apiRequest("DELETE", `/api/sections/${sectionId}/like?userId=${user.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/liked-sections`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${currentSectionId}/like-status`] });
      toast({ title: "Section unliked" });
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

  const updateSectionMutation = useMutation({
    mutationFn: async (data: { 
      id: string; 
      title?: string; 
      mood?: string[];
      tags?: string[];
      thumbnail?: string;
      songUrl?: string;
    }) => {
      const { id, ...updateData } = data;
      return apiRequest("PATCH", `/api/sections/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chapters/${chapterId}/sections`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${editingSection?.id}`] });
      toast({ title: "Section updated successfully" });
      setEditingSection(null);
    },
    onError: () => {
      toast({ 
        title: "Failed to update section", 
        description: "Please try again",
        variant: "destructive" 
      });
    },
  });

  const handleToggleLike = (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking the heart
    
    if (!user?.id) {
      toast({ 
        title: "Please login to like sections",
        variant: "destructive"
      });
      return;
    }

    if (likedSectionIds.has(sectionId)) {
      unlikeSectionMutation.mutate(sectionId);
    } else {
      likeSectionMutation.mutate(sectionId);
    }
  };

  const handleSectionClick = (sectionId: string) => {
    setLocation(`/read/${sectionId}`);
  };

  const handleBackHome = () => {
    setLocation("/");
  };

  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) {
      toast({
        title: "Section title required",
        description: "Please enter a title for the section",
        variant: "destructive",
      });
      return;
    }

    const nextOrder = sections.length > 0 
      ? Math.max(...sections.map(s => s.order)) + 1 
      : 1;

    createSectionMutation.mutate({
      title: newSectionTitle,
      chapterId: chapterId,
      order: nextOrder,
    });
  };

  const handleStartEdit = (section: Section) => {
    setEditingSection(section);
    setEditedTitle(section.title);
    setEditedMood(section.mood?.join(", ") || "");
    setEditedTags(section.tags?.join(", ") || "");
    setEditedThumbnail(section.thumbnail || "");
    setEditedSongUrl(section.songUrl || "");
  };

  const handleSaveEdit = () => {
    if (!editingSection) return;
    
    if (!editedTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the section",
        variant: "destructive",
      });
      return;
    }

    const tagsArray = editedTags
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const moodArray = editedMood
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    updateSectionMutation.mutate({
      id: editingSection.id,
      title: editedTitle.trim(),
      mood: moodArray.length > 0 ? moodArray : undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      thumbnail: editedThumbnail.trim() || undefined,
      songUrl: editedSongUrl.trim() || undefined,
    });
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditedTitle("");
    setEditedMood("");
    setEditedTags("");
    setEditedThumbnail("");
    setEditedSongUrl("");
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-white dark:bg-card shadow-xl z-50 transition-all duration-300",
          "flex flex-col",
          isOpen ? "w-80" : "w-16"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {isOpen && (
            <h3 className="font-myeongjo text-lg font-semibold text-kdrama-ink dark:text-foreground">
              Sections
            </h3>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="ml-auto"
            data-testid="button-toggle-sidebar"
          >
            {isOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Back to Home Button */}
        <div className="p-4 border-b">
          <Button
            variant="outline"
            onClick={handleBackHome}
            className={cn(
              "w-full justify-start gap-2 font-noto",
              !isOpen && "justify-center px-2"
            )}
            data-testid="button-back-home"
          >
            <Home className="w-4 h-4" />
            {isOpen && "Back to Home"}
          </Button>
        </div>

        {/* New Section Button (Admin Only) */}
        {canCreateSections && (
          <div className="p-4 border-b">
            <Button
              variant="default"
              onClick={() => setCreatingSection(true)}
              className={cn(
                "w-full justify-start gap-2 font-noto",
                !isOpen && "justify-center px-2"
              )}
              data-testid="button-new-section-sidebar"
            >
              <Plus className="w-4 h-4" />
              {isOpen && "New Section"}
            </Button>
          </div>
        )}

        {/* Sections List */}
        <ScrollArea className="flex-1 py-4 overflow-visible">
          <div className={cn(isOpen ? "px-4" : "px-2")}>
            {isOpen ? (
              <div className="space-y-2">
                {sections.map((section, index) => {
                  const ownsSection = section.createdBy && user?.id === section.createdBy;
                  const allowEdit = canEditSectionsAll || (canEditOwnSections && ownsSection);
                  const allowDelete = canDeleteSectionsAll || (canDeleteOwnSections && ownsSection);
                  return (
                    <div
                      key={section.id}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors group",
                        "hover:bg-kdrama-sakura/20 dark:hover:bg-accent",
                        currentSectionId === section.id
                          ? "bg-kdrama-sakura/30 dark:bg-accent text-kdrama-ink dark:text-accent-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleSectionClick(section.id)}
                          className="flex items-start gap-3 flex-1 min-w-0"
                          data-testid={`button-section-${index + 1}`}
                        >
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-kdrama-sakura/50 dark:bg-accent flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-noto text-sm truncate">{section.title}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          {user && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleToggleLike(section.id, e)}
                              className={`h-6 w-6 transition-all ${
                                likedSectionIds.has(section.id)
                                  ? "text-red-500 hover:text-red-600 opacity-100"
                                  : "text-red-400 hover:text-red-500 opacity-100"
                              }`}
                              disabled={likeSectionMutation.isPending || unlikeSectionMutation.isPending}
                              data-testid={`button-like-section-${section.id}`}
                            >
                              <Heart
                                className={`w-3 h-3 transition-all stroke-current ${
                                  likedSectionIds.has(section.id) ? "fill-current" : "fill-transparent"
                                }`}
                              />
                            </Button>
                          )}
                          {allowEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(section);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                                data-testid={`button-edit-section-${section.id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              {allowDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingSectionId(section.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                                  data-testid={`button-delete-section-${section.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => handleSectionClick(section.id)}
                    className={cn(
                      "w-full p-2 rounded-lg transition-colors flex items-center justify-center",
                      currentSectionId === section.id
                        ? "bg-kdrama-sakura/30 dark:bg-accent text-kdrama-ink dark:text-accent-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-kdrama-sakura/20 dark:hover:bg-accent"
                    )}
                    title={section.title}
                    data-testid={`button-section-collapsed-${index + 1}`}
                  >
                    <span className="w-6 h-6 rounded-full bg-kdrama-sakura/50 dark:bg-accent flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Create Section Dialog */}
      <Dialog open={creatingSection} onOpenChange={setCreatingSection}>
        <DialogContent data-testid="dialog-create-section-sidebar">
          <DialogHeader>
            <DialogTitle>Create New Section</DialogTitle>
            <DialogDescription>
              Add a new section to this chapter. It will be created with an empty first page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section-title">Section Title</Label>
              <Input
                id="section-title"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="Enter section title..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateSection();
                  }
                }}
                data-testid="input-new-section-title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreatingSection(false);
                setNewSectionTitle("");
              }}
              data-testid="button-cancel-section"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSection}
              disabled={createSectionMutation.isPending}
              data-testid="button-create-section-confirm"
            >
              {createSectionMutation.isPending ? "Creating..." : "Create Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent data-testid="dialog-edit-section" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-myeongjo">Edit Section</DialogTitle>
            <DialogDescription className="font-noto">
              Update section metadata including title, mood, tags, thumbnail, and music.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="font-noto">Title *</Label>
              <Input
                id="edit-title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Section title"
                className="font-noto"
                data-testid="input-edit-section-title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-mood" className="font-noto">Mood</Label>
              <Input
                id="edit-mood"
                value={editedMood}
                onChange={(e) => setEditedMood(e.target.value)}
                placeholder="e.g., Joyful, Melancholic, Tense"
                className="font-noto"
                data-testid="input-edit-section-mood"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-tags" className="font-noto">Tags</Label>
              <Input
                id="edit-tags"
                value={editedTags}
                onChange={(e) => setEditedTags(e.target.value)}
                placeholder="Comma separated, e.g., romance, family, drama"
                className="font-noto"
                data-testid="input-edit-section-tags"
              />
              <p className="text-xs text-muted-foreground">Separate multiple tags with commas</p>
            </div>
            
            <ImageUploadField
              label="Thumbnail Image"
              value={editedThumbnail}
              onChange={setEditedThumbnail}
              placeholder="https://example.com/image.jpg"
              testId="input-edit-section-thumbnail"
            />
            
            <div className="space-y-2">
              <Label htmlFor="edit-song" className="font-noto">Spotify Song URL (Special Music)</Label>
              <Input
                id="edit-song"
                value={editedSongUrl}
                onChange={(e) => setEditedSongUrl(e.target.value)}
                placeholder="https://open.spotify.com/track/..."
                className="font-noto"
                data-testid="input-edit-section-song"
              />
              <p className="text-xs text-muted-foreground">
                Special music for this section (plays automatically when entering)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={updateSectionMutation.isPending}
              data-testid="button-cancel-edit-section"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateSectionMutation.isPending}
              data-testid="button-save-edit-section"
            >
              {updateSectionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirmation Dialog */}
      <AlertDialog open={!!deletingSectionId} onOpenChange={() => setDeletingSectionId(null)}>
        <AlertDialogContent data-testid="dialog-delete-section">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section? This will also delete all pages within it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-section">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSectionId && deleteSectionMutation.mutate(deletingSectionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-section"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
