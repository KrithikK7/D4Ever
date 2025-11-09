import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical, FileText, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Section, Page, Chapter } from "@shared/schema";
import { TiptapEditor } from "@/components/TiptapEditor";

export function ContentManagement() {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingPage, setEditingPage] = useState<{ page: Page; sectionId: string } | null>(null);
  const [creatingSection, setCreatingSection] = useState(false);
  const [creatingPageFor, setCreatingPageFor] = useState<string | null>(null);

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/chapters"],
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const { data: allPages = [] } = useQuery<Page[]>({
    queryKey: ["/api/pages"],
  });

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getSectionPages = (sectionId: string) => {
    return allPages.filter(p => p.sectionId === sectionId).sort((a, b) => a.pageNumber - b.pageNumber);
  };

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      toast({ title: "Section deleted successfully" });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      toast({ title: "Page deleted successfully" });
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: (sectionOrders: { id: string; order: number }[]) =>
      apiRequest("PATCH", "/api/sections/reorder", { sectionOrders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
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

  const moveSectionUp = (section: Section) => {
    const chapterSections = sections
      .filter(s => s.chapterId === section.chapterId)
      .sort((a, b) => a.order - b.order);
    
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

  const moveSectionDown = (section: Section) => {
    const chapterSections = sections
      .filter(s => s.chapterId === section.chapterId)
      .sort((a, b) => a.order - b.order);
    
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-myeongjo text-2xl font-bold text-kdrama-ink dark:text-foreground">
            Content Management
          </h2>
          <p className="font-noto text-sm text-muted-foreground mt-1">
            Manage sections and their pages in one place
          </p>
        </div>
        <Button onClick={() => setCreatingSection(true)} data-testid="button-create-section">
          <Plus className="w-4 h-4 mr-2" />
          Create Section
        </Button>
      </div>

      {/* Sections List with Nested Pages */}
      <div className="space-y-4">
        {sections.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="font-noto text-muted-foreground">No sections yet. Create your first section to get started.</p>
            </CardContent>
          </Card>
        ) : (
          sections.map((section) => {
            const chapter = chapters.find(c => c.id === section.chapterId);
            const sectionPages = getSectionPages(section.id);
            const isExpanded = expandedSections.has(section.id);

            return (
              <Card key={section.id} data-testid={`card-section-${section.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 mt-1"
                        onClick={() => toggleSection(section.id)}
                        data-testid={`button-toggle-${section.id}`}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="font-myeongjo text-lg">{section.title}</CardTitle>
                        <CardDescription className="font-noto mt-1">
                          {chapter?.title} • {sectionPages.length} page{sectionPages.length !== 1 ? 's' : ''}
                        </CardDescription>
                        {((section.mood && section.mood.length > 0) || (section.tags && section.tags.length > 0)) && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {section.mood?.map((mood, idx) => (
                              <Badge key={`mood-${idx}`} variant="secondary" className="font-noto text-xs">
                                {mood}
                              </Badge>
                            ))}
                            {section.tags?.map((tag) => (
                              <Badge key={tag} variant="outline" className="font-noto text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSectionUp(section)}
                        disabled={sections.filter(s => s.chapterId === section.chapterId).sort((a, b) => a.order - b.order)[0]?.id === section.id}
                        data-testid={`button-move-up-section-${section.id}`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSectionDown(section)}
                        disabled={sections.filter(s => s.chapterId === section.chapterId).sort((a, b) => a.order - b.order).slice(-1)[0]?.id === section.id}
                        data-testid={`button-move-down-section-${section.id}`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingSection(section)}
                        data-testid={`button-edit-section-${section.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this section and all its pages?")) {
                            deleteSectionMutation.mutate(section.id);
                          }
                        }}
                        data-testid={`button-delete-section-${section.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-noto text-sm font-medium">Pages</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCreatingPageFor(section.id)}
                          data-testid={`button-add-page-${section.id}`}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Page
                        </Button>
                      </div>

                      {sectionPages.length === 0 ? (
                        <p className="font-noto text-sm text-muted-foreground py-4 text-center">
                          No pages yet. Add the first page to this section.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {sectionPages.map((page) => (
                            <div
                              key={page.id}
                              className="flex items-center gap-3 p-3 rounded-md border bg-card hover-elevate"
                              data-testid={`row-page-${page.id}`}
                            >
                              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-noto text-sm font-medium">Page {page.pageNumber}</p>
                                <p className="font-noto text-xs text-muted-foreground truncate">
                                  {page.content.substring(0, 100)}...
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingPage({ page, sectionId: section.id })}
                                  data-testid={`button-edit-page-${page.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this page?")) {
                                      deletePageMutation.mutate(page.id);
                                    }
                                  }}
                                  data-testid={`button-delete-page-${page.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Section Edit/Create Dialog */}
      <SectionDialog
        section={editingSection}
        chapters={chapters}
        open={editingSection !== null || creatingSection}
        onClose={() => {
          setEditingSection(null);
          setCreatingSection(false);
        }}
      />

      {/* Page Edit/Create Dialog */}
      <PageDialog
        page={editingPage?.page || null}
        sectionId={creatingPageFor || editingPage?.sectionId || ""}
        open={editingPage !== null || creatingPageFor !== null}
        onClose={() => {
          setEditingPage(null);
          setCreatingPageFor(null);
        }}
      />
    </div>
  );
}

// Section Dialog Component
function SectionDialog({ section, chapters, open, onClose }: {
  section: Section | null;
  chapters: Chapter[];
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    chapterId: section?.chapterId || "",
    title: section?.title || "",
    mood: section?.mood?.join(", ") || "",
    tags: section?.tags?.join(", ") || "",
    thumbnail: section?.thumbnail || "",
    songUrl: section?.songUrl || "",
    order: section?.order || 1,
  });

  // Update form when section prop changes
  useEffect(() => {
    setFormData({
      chapterId: section?.chapterId || "",
      title: section?.title || "",
      mood: section?.mood?.join(", ") || "",
      tags: section?.tags?.join(", ") || "",
      thumbnail: section?.thumbnail || "",
      songUrl: section?.songUrl || "",
      order: section?.order || 1,
    });
  }, [section]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (section) {
        return apiRequest("PATCH", `/api/sections/${section.id}`, data);
      }
      return apiRequest("POST", "/api/sections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      toast({ title: section ? "Section updated" : "Section created" });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      toast({ 
        title: "Validation Error", 
        description: "Title is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.chapterId) {
      toast({ 
        title: "Validation Error", 
        description: "Chapter is required",
        variant: "destructive"
      });
      return;
    }
    
    const moodArray = formData.mood ? formData.mood.split(",").map(t => t.trim()).filter(Boolean) : [];
    const tagsArray = formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    
    const payload = {
      chapterId: formData.chapterId,
      title: formData.title,
      order: formData.order,
      tags: tagsArray.length > 0 ? tagsArray : null,
      mood: moodArray.length > 0 ? moodArray : null,
      thumbnail: formData.thumbnail.trim() || null,
      songUrl: formData.songUrl.trim() || null,
    };
    
    console.log("Payload mood:", payload.mood, "Type:", typeof payload.mood, "IsArray:", Array.isArray(payload.mood));
    saveMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-myeongjo">
            {section ? "Edit Section" : "Create New Section"}
          </DialogTitle>
          <DialogDescription className="font-noto">
            {section ? "Update section details" : "Add a new section to a chapter"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chapter">Chapter *</Label>
            <Select
              value={formData.chapterId}
              onValueChange={(value) => setFormData({ ...formData, chapterId: value })}
            >
              <SelectTrigger id="chapter">
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

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <TiptapEditor
              value={formData.title}
              onChange={(value) => setFormData({ ...formData, title: value })}
              placeholder="Section title"
              singleLine={true}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mood">Mood (comma-separated)</Label>
            <TiptapEditor
              value={formData.mood}
              onChange={(value) => setFormData({ ...formData, mood: value })}
              placeholder="Nostalgic, Hopeful, Romantic"
              singleLine={true}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order">Order *</Label>
            <Input
              id="order"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
              min={1}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <TiptapEditor
              value={formData.tags}
              onChange={(value) => setFormData({ ...formData, tags: value })}
              placeholder="love, drama, family"
              singleLine={true}
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="songUrl">Spotify Song URL (track, album, or playlist)</Label>
            <Input
              id="songUrl"
              value={formData.songUrl}
              onChange={(e) => setFormData({ ...formData, songUrl: e.target.value })}
              placeholder="https://open.spotify.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail URL</Label>
            <Input
              id="thumbnail"
              value={formData.thumbnail}
              onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : section ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Page Dialog Component
function PageDialog({ page, sectionId, open, onClose }: {
  page: Page | null;
  sectionId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    content: page?.content || "",
    pageNumber: page?.pageNumber || 1,
  });

  // Update form when page prop changes
  useEffect(() => {
    setFormData({
      content: page?.content || "",
      pageNumber: page?.pageNumber || 1,
    });
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (page) {
        return apiRequest("PATCH", `/api/pages/${page.id}`, data);
      }
      return apiRequest("POST", "/api/pages", { ...data, sectionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      toast({ title: page ? "Page updated" : "Page created" });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-myeongjo">
            {page ? "Edit Page" : "Create New Page"}
          </DialogTitle>
          <DialogDescription className="font-noto">
            {page ? "Update page content" : "Add a new page to this section"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pageNumber">Page Number *</Label>
            <Input
              id="pageNumber"
              type="number"
              value={formData.pageNumber}
              onChange={(e) => setFormData({ ...formData, pageNumber: parseInt(e.target.value) || 1 })}
              min={1}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Page content... You can use [embed:URL] to embed images or Instagram posts."
              className="min-h-[300px] font-noto"
              required
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use [embed:https://...] to embed images or Instagram posts
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : page ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
