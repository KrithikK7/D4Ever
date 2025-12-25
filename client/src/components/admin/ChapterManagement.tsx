import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Book, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Chapter } from "@shared/schema";
import { ImageUploadField } from "./ImageUploadField";

export function ChapterManagement() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    coverImage: "",
    songUrl: "",
    order: "0",
  });

  const { data: chapters = [], isLoading } = useQuery<Chapter[]>({
    queryKey: ["/api/chapters"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/chapters", {
        title: data.title,
        description: data.description.trim() || null,
        coverImage: data.coverImage.trim() || null,
        songUrl: data.songUrl.trim() || null,
        order: parseInt(data.order),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chapters"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Chapter created",
        description: "New chapter has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create chapter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/chapters/${id}`, {
        title: data.title,
        description: data.description.trim() || null,
        coverImage: data.coverImage.trim() || null,
        songUrl: data.songUrl.trim() || null,
        order: parseInt(data.order),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chapters"] });
      setEditingChapter(null);
      resetForm();
      toast({
        title: "Chapter updated",
        description: "Changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update chapter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/chapters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chapters"] });
      setDeletingId(null);
      toast({
        title: "Chapter deleted",
        description: "Chapter has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete chapter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (chapterOrders: { id: string; order: number }[]) => {
      return apiRequest("PATCH", "/api/chapters/reorder", { chapterOrders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chapters"] });
      toast({
        title: "Chapter order updated",
        description: "Chapter positions have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder chapters. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMoveChapter = (chapterId: string, direction: "up" | "down") => {
    if (chapters.length < 2) return;
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex((chapter) => chapter.id === chapterId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) {
      return;
    }

    const [movedChapter] = sorted.splice(currentIndex, 1);
    sorted.splice(targetIndex, 0, movedChapter);
    const payload = sorted.map((chapter, index) => ({
      id: chapter.id,
      order: index + 1,
    }));
    reorderMutation.mutate(payload);
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", coverImage: "", songUrl: "", order: "0" });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleEdit = (chapter: Chapter) => {
    setFormData({
      title: chapter.title,
      description: chapter.description || "",
      coverImage: chapter.coverImage || "",
      songUrl: chapter.songUrl || "",
      order: chapter.order.toString(),
    });
    setEditingChapter(chapter);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation error",
        description: "Title is required.",
        variant: "destructive",
      });
      return;
    }

    if (editingChapter) {
      updateMutation.mutate({ id: editingChapter.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="font-noto text-muted-foreground">Loading chapters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-myeongjo text-2xl font-bold text-kdrama-ink dark:text-foreground">
            Manage Chapters
          </h2>
          <p className="font-noto text-sm text-muted-foreground mt-1">
            Create and organize chapters for your journal
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-chapter">
          <Plus className="w-4 h-4 mr-2" />
          New Chapter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chapters.map((chapter, index) => (
          <Card key={chapter.id} data-testid={`card-chapter-${chapter.id}`}>
            {chapter.coverImage ? (
              <div className="h-32 w-full overflow-hidden rounded-t-lg">
                <img
                  src={chapter.coverImage}
                  alt={chapter.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-32 w-full bg-gradient-to-br from-kdrama-rose/20 via-kdrama-sakura/30 to-kdrama-lavender/20 flex items-center justify-center rounded-t-lg">
                <Book className="w-12 h-12 text-[#f0425c]" />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="font-myeongjo text-lg">
                    {chapter.title}
                  </CardTitle>
                  <Badge variant="outline" className="font-noto mt-1 inline-flex">
                    #{chapter.order}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === 0 || reorderMutation.isPending}
                    className="h-6 w-6"
                    onClick={() => handleMoveChapter(chapter.id, "up")}
                    data-testid={`button-move-chapter-up-${chapter.id}`}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === chapters.length - 1 || reorderMutation.isPending}
                    className="h-6 w-6"
                    onClick={() => handleMoveChapter(chapter.id, "down")}
                    data-testid={`button-move-chapter-down-${chapter.id}`}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {chapter.description && (
                <CardDescription className="font-noto line-clamp-2">
                  {chapter.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(chapter)}
                data-testid={`button-edit-chapter-${chapter.id}`}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(chapter.id)}
                data-testid={`button-delete-chapter-${chapter.id}`}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}

        {chapters.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Book className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="font-noto text-muted-foreground mb-4">No chapters yet</p>
              <Button onClick={handleCreate} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create your first chapter
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingChapter} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingChapter(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-myeongjo">
              {editingChapter ? "Edit Chapter" : "Create New Chapter"}
            </DialogTitle>
            <DialogDescription className="font-noto">
              {editingChapter ? "Update chapter information" : "Add a new chapter to your journal"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="font-noto text-sm font-medium mb-2 block">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter chapter title"
                data-testid="input-chapter-title"
              />
            </div>

            <div>
              <label className="font-noto text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter chapter description (optional)"
                rows={3}
                data-testid="input-chapter-description"
              />
            </div>

            <ImageUploadField
              label="Cover Image"
              value={formData.coverImage}
              onChange={(url) => setFormData({ ...formData, coverImage: url })}
              placeholder="https://example.com/image.jpg"
              testId="input-chapter-cover"
            />

            <div>
              <label className="font-noto text-sm font-medium mb-2 block">
                Spotify Music/Playlist URL
              </label>
              <Input
                value={formData.songUrl}
                onChange={(e) => setFormData({ ...formData, songUrl: e.target.value })}
                placeholder="https://open.spotify.com/playlist/..."
                data-testid="input-chapter-music"
              />
              <p className="text-xs text-muted-foreground mt-1.5 font-noto">
                Add background music for this entire chapter (track, album, or playlist)
              </p>
            </div>

            <div>
              <label className="font-noto text-sm font-medium mb-2 block">Display Order</label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                placeholder="0"
                data-testid="input-chapter-order"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingChapter(null);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-chapter"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Chapter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-myeongjo">Delete Chapter?</AlertDialogTitle>
            <AlertDialogDescription className="font-noto">
              This will permanently delete this chapter and all its sections and pages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
