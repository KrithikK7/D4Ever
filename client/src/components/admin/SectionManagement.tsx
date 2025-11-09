import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Edit, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Section, Chapter } from "@shared/schema";
import { ImageUploadField } from "./ImageUploadField";

export function SectionManagement() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    chapterId: "",
    mood: "",
    tags: "",
    thumbnail: "",
    songUrl: "",
    order: "0",
  });

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/chapters"],
  });

  const { data: sections = [], isLoading } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/sections", {
        title: data.title,
        chapterId: data.chapterId,
        mood: data.mood
          ? data.mood.split(",").map(t => t.trim()).filter(Boolean)
          : [],
        tags: data.tags ? data.tags.split(",").map(t => t.trim()) : [],
        thumbnail: data.thumbnail || null,
        songUrl: data.songUrl || null,
        order: parseInt(data.order),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Section created",
        description: "New section has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create section. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/sections/${id}`, {
        title: data.title,
        chapterId: data.chapterId,
        mood: data.mood
          ? data.mood.split(",").map(t => t.trim()).filter(Boolean)
          : [],
        tags: data.tags ? data.tags.split(",").map(t => t.trim()) : [],
        thumbnail: data.thumbnail || null,
        songUrl: data.songUrl || null,
        order: parseInt(data.order),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      setEditingSection(null);
      resetForm();
      toast({
        title: "Section updated",
        description: "Changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update section. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      setDeletingId(null);
      toast({
        title: "Section deleted",
        description: "Section has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete section. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      chapterId: "",
      mood: "",
      tags: "",
      thumbnail: "",
      songUrl: "",
      order: "0",
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleEdit = (section: Section) => {
    setFormData({
      title: section.title,
      chapterId: section.chapterId,
      mood: section.mood && section.mood.length > 0 ? section.mood.join(", ") : "",
      tags: section.tags ? section.tags.join(", ") : "",
      thumbnail: section.thumbnail || "",
      songUrl: section.songUrl || "",
      order: section.order.toString(),
    });
    setEditingSection(section);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.chapterId) {
      toast({
        title: "Validation error",
        description: "Title and chapter are required.",
        variant: "destructive",
      });
      return;
    }

    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data: formData });
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

  const getChapterTitle = (chapterId: string) => {
    return chapters.find(c => c.id === chapterId)?.title || "Unknown Chapter";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="font-noto text-muted-foreground">Loading sections...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-myeongjo text-2xl font-bold text-kdrama-ink dark:text-foreground">
            Manage Sections
          </h2>
          <p className="font-noto text-sm text-muted-foreground mt-1">
            Organize sections within chapters
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-section">
          <Plus className="w-4 h-4 mr-2" />
          New Section
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Card key={section.id} data-testid={`card-section-${section.id}`}>
            {section.thumbnail ? (
              <div className="h-32 w-full overflow-hidden rounded-t-lg">
                <img
                  src={section.thumbnail}
                  alt={section.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-32 w-full bg-gradient-to-br from-kdrama-rose/20 via-kdrama-sakura/30 to-kdrama-lavender/20 flex items-center justify-center rounded-t-lg">
                <BookOpen className="w-12 h-12 text-[#f0425c]" />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="font-myeongjo text-lg">
                  {section.title}
                </CardTitle>
                <Badge variant="outline" className="font-noto shrink-0">
                  #{section.order}
                </Badge>
              </div>
              <CardDescription className="font-noto text-xs">
                {getChapterTitle(section.chapterId)}
              </CardDescription>
              {section.mood && (
                <Badge variant="secondary" className="font-noto w-fit mt-2">
                  {section.mood}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(section)}
                data-testid={`button-edit-section-${section.id}`}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(section.id)}
                data-testid={`button-delete-section-${section.id}`}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}

        {sections.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="font-noto text-muted-foreground mb-4">No sections yet</p>
              <Button onClick={handleCreate} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create your first section
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingSection} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingSection(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-myeongjo">
              {editingSection ? "Edit Section" : "Create New Section"}
            </DialogTitle>
            <DialogDescription className="font-noto">
              {editingSection ? "Update section information" : "Add a new section to a chapter"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="font-noto text-sm font-medium mb-2 block">
                Chapter <span className="text-destructive">*</span>
              </label>
              <Select value={formData.chapterId} onValueChange={(value) => setFormData({ ...formData, chapterId: value })}>
                <SelectTrigger data-testid="select-chapter">
                  <SelectValue placeholder="Select a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-noto text-sm font-medium mb-2 block">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter section title"
                data-testid="input-section-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-noto text-sm font-medium mb-2 block">Mood</label>
                <Input
                  value={formData.mood}
                  onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                  placeholder="e.g., Romantic, Melancholic"
                  data-testid="input-section-mood"
                />
              </div>

              <div>
                <label className="font-noto text-sm font-medium mb-2 block">Display Order</label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  placeholder="0"
                  data-testid="input-section-order"
                />
              </div>
            </div>

            <div>
              <label className="font-noto text-sm font-medium mb-2 block">Tags</label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Comma-separated tags (e.g., spring, destiny, love)"
                data-testid="input-section-tags"
              />
            </div>

            <ImageUploadField
              label="Thumbnail Image"
              value={formData.thumbnail}
              onChange={(url) => setFormData({ ...formData, thumbnail: url })}
              placeholder="https://example.com/image.jpg"
              testId="input-section-thumbnail"
            />

            <div>
              <label className="font-noto text-sm font-medium mb-2 block">Spotify OST Link</label>
              <Input
                value={formData.songUrl}
                onChange={(e) => setFormData({ ...formData, songUrl: e.target.value })}
                placeholder="https://open.spotify.com/track/..."
                data-testid="input-section-spotify"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingSection(null);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-section"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-myeongjo">Delete Section?</AlertDialogTitle>
            <AlertDialogDescription className="font-noto">
              This will permanently delete this section and all its pages. This action cannot be undone.
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
