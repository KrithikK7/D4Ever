import { useState, useRef } from "react";
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
import { Plus, Edit, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Page, Section } from "@shared/schema";
import { MediaToolbar, ImageEmbedDialog, InstagramEmbedDialog, SpotifyEmbedDialog, AudioEmbedDialog } from "./MediaEmbedDialogs";

export function PageManagement() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isInstagramDialogOpen, setIsInstagramDialogOpen] = useState(false);
  const [isAudioDialogOpen, setIsAudioDialogOpen] = useState(false);
  const [isSpotifyDialogOpen, setIsSpotifyDialogOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState({
    sectionId: "",
    content: "",
    pageNumber: "1",
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const { data: pages = [], isLoading } = useQuery<Page[]>({
    queryKey: ["/api/pages"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/pages", {
        sectionId: data.sectionId,
        content: data.content,
        pageNumber: parseInt(data.pageNumber),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Page created",
        description: "New page has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create page. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/pages/${id}`, {
        sectionId: data.sectionId,
        content: data.content,
        pageNumber: parseInt(data.pageNumber),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setEditingPage(null);
      resetForm();
      toast({
        title: "Page updated",
        description: "Changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update page. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setDeletingId(null);
      toast({
        title: "Page deleted",
        description: "Page has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete page. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      sectionId: "",
      content: "",
      pageNumber: "1",
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleEdit = (page: Page) => {
    setFormData({
      sectionId: page.sectionId,
      content: page.content,
      pageNumber: page.pageNumber.toString(),
    });
    setEditingPage(page);
  };

  const handleSubmit = () => {
    if (!formData.sectionId || !formData.content.trim()) {
      toast({
        title: "Validation error",
        description: "Section and content are required.",
        variant: "destructive",
      });
      return;
    }

    if (editingPage) {
      updateMutation.mutate({ id: editingPage.id, data: formData });
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

  const getSectionTitle = (sectionId: string) => {
    return sections.find(s => s.id === sectionId)?.title || "Unknown Section";
  };

  const insertContent = (html: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData({ ...formData, content: formData.content + "\n\n" + html });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = formData.content;
    
    const beforeCursor = currentContent.substring(0, start);
    const afterCursor = currentContent.substring(end);
    
    const newContent = beforeCursor + "\n\n" + html + "\n\n" + afterCursor;
    setFormData({ ...formData, content: newContent });

    // Set cursor position after inserted content
    setTimeout(() => {
      const newCursorPos = start + html.length + 4;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="font-noto text-muted-foreground">Loading pages...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-myeongjo text-2xl font-bold text-kdrama-ink dark:text-foreground">
            Manage Pages
          </h2>
          <p className="font-noto text-sm text-muted-foreground mt-1">
            Create and edit content pages within sections
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-page">
          <Plus className="w-4 h-4 mr-2" />
          New Page
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pages.map((page) => (
          <Card key={page.id} data-testid={`card-page-${page.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="font-myeongjo text-lg">
                  Page #{page.pageNumber}
                </CardTitle>
                <Badge variant="secondary" className="font-noto shrink-0">
                  {getSectionTitle(page.sectionId)}
                </Badge>
              </div>
              <CardDescription className="font-noto text-xs line-clamp-3 mt-2">
                {page.content.substring(0, 150)}...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(page)}
                data-testid={`button-edit-page-${page.id}`}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(page.id)}
                data-testid={`button-delete-page-${page.id}`}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}

        {pages.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="font-noto text-muted-foreground mb-4">No pages yet</p>
              <Button onClick={handleCreate} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create your first page
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingPage} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingPage(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-myeongjo">
              {editingPage ? "Edit Page" : "Create New Page"}
            </DialogTitle>
            <DialogDescription className="font-noto">
              {editingPage ? "Update page content" : "Add a new page to a section"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="font-noto text-sm font-medium mb-2 block">
                Section <span className="text-destructive">*</span>
              </label>
              <Select value={formData.sectionId} onValueChange={(value) => setFormData({ ...formData, sectionId: value })}>
                <SelectTrigger data-testid="select-section">
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-noto text-sm font-medium mb-2 block">Page Number</label>
              <Input
                type="number"
                value={formData.pageNumber}
                onChange={(e) => setFormData({ ...formData, pageNumber: e.target.value })}
                placeholder="1"
                data-testid="input-page-number"
              />
            </div>

            <div>
              <label className="font-noto text-sm font-medium mb-2 block">
                Content <span className="text-destructive">*</span>
              </label>
              <MediaToolbar
                onInsertImage={() => setIsImageDialogOpen(true)}
                onInsertInstagram={() => setIsInstagramDialogOpen(true)}
                onInsertAudio={() => setIsAudioDialogOpen(true)}
                onInsertSpotify={() => {
                  if (!formData.sectionId) {
                    toast({
                      title: "Select a section first",
                      description: "Pick a section before setting its Spotify music.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setIsSpotifyDialogOpen(true);
                }}
              />
              <Textarea
                ref={textareaRef}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter page content..."
                rows={12}
                className="font-mono"
                data-testid="input-page-content"
              />
              <p className="font-noto text-xs text-muted-foreground mt-1">
                Use the toolbar above to add images or Instagram embeds. The Section Music button updates the Spotify track for the selected section.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingPage(null);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-page"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-myeongjo">Delete Page?</AlertDialogTitle>
            <AlertDialogDescription className="font-noto">
              This will permanently delete this page. This action cannot be undone.
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

      {/* Media Embed Dialogs */}
      <ImageEmbedDialog
        open={isImageDialogOpen}
        onOpenChange={setIsImageDialogOpen}
        onInsert={insertContent}
      />
      <InstagramEmbedDialog
        open={isInstagramDialogOpen}
        onOpenChange={setIsInstagramDialogOpen}
        onInsert={insertContent}
      />
      <AudioEmbedDialog
        open={isAudioDialogOpen}
        onOpenChange={setIsAudioDialogOpen}
        onInsert={insertContent}
      />
      <SpotifyEmbedDialog
        open={isSpotifyDialogOpen}
        onOpenChange={setIsSpotifyDialogOpen}
        sectionId={formData.sectionId || undefined}
      />
    </div>
  );
}
