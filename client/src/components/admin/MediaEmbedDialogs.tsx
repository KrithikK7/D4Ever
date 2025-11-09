import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image, Music, Images } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Section } from "@shared/schema";

interface MediaToolbarProps {
  onInsertImage: () => void;
  onInsertInstagram: () => void;
  onInsertSpotify?: () => void;
}

export function MediaToolbar({ onInsertImage, onInsertInstagram, onInsertSpotify }: MediaToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 mb-2 flex-wrap">
      <span className="text-xs font-noto text-muted-foreground mr-2">Insert:</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onInsertImage}
        data-testid="button-insert-image"
      >
        <Images className="w-4 h-4 mr-1" />
        Images
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onInsertInstagram}
        data-testid="button-insert-instagram"
      >
        <SiInstagram className="w-4 h-4 mr-1" />
        Instagram
      </Button>
      {onInsertSpotify && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onInsertSpotify}
          data-testid="button-insert-spotify"
        >
          <Music className="w-4 h-4 mr-1" />
          Section Music
        </Button>
      )}
    </div>
  );
}

interface ImageEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string) => void;
}

export function ImageEmbedDialog({ open, onOpenChange, onInsert }: ImageEmbedDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFilesSelect = (files: FileList) => {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/ogg'];
    const validTypes = [...validImageTypes, ...validVideoTypes];
    const validFiles: File[] = [];
    
    Array.from(files).forEach(file => {
      const isImage = validImageTypes.includes(file.type);
      const isVideo = validVideoTypes.includes(file.type);
      
      if (!isImage && !isVideo) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image or video type.`,
          variant: "destructive",
        });
        return;
      }
      
      // Different size limits for images vs videos
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for videos, 10MB for images
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than ${isVideo ? '50MB' : '10MB'}.`,
          variant: "destructive",
        });
        return;
      }
      
      validFiles.push(file);
    });
    
    setSelectedFiles(validFiles);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelect(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    // The endpoint accepts both images and videos, still use 'image' as the field name
    formData.append('image', file);
    
    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      const isVideo = file.type.startsWith('video/');
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : `Failed to upload ${isVideo ? 'video' : 'image'}. Please try again.`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleInsert = async () => {
    // Upload files
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    try {
      const mediaItems: string[] = [];
      
      for (const file of selectedFiles) {
        const url = await uploadFile(file);
        const isVideo = file.type.startsWith('video/');
        
        // Mark videos with a special prefix so the gallery knows it's a video
        if (isVideo) {
          mediaItems.push(`video:${url}`);
        } else {
          mediaItems.push(url);
        }
      }
      
      // Generate a unified gallery embed that includes both images and videos
      let finalEmbedCode: string;
      if (mediaItems.length === 1 && !mediaItems[0].startsWith('video:')) {
        // Single image
        finalEmbedCode = `[embed:${mediaItems[0]}]`;
      } else {
        // Mixed media gallery or multiple items
        finalEmbedCode = `[gallery:${mediaItems.join(',')}]`;
      }
      
      onInsert(finalEmbedCode);
      
      // Reset form
      setSelectedFiles([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-myeongjo">Insert Media</DialogTitle>
          <DialogDescription className="font-noto">
            Upload images or videos. Multiple images will create a gallery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          {/* File Upload */}
          <div>
              <Label className="font-noto">
                Upload Media <span className="text-destructive">*</span>
              </Label>
              <div
                className={`mt-1.5 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-kdrama-primary bg-kdrama-primary/10' : 'border-muted-foreground/25 hover:border-kdrama-primary/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-images"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  data-testid="input-files"
                />
                {selectedFiles.length > 0 ? (
                  <div className="space-y-2">
                    <Images className="w-8 h-8 mx-auto text-kdrama-primary" />
                    <p className="text-sm font-noto text-kdrama-primary">
                      ✓ {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                    </p>
                    <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx}>{file.name}</div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Click to change files
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Images className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-noto">
                      Drag and drop media files here, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Images: JPG, PNG, GIF, WebP (max 10MB)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Videos: MP4, WebM, MOV, AVI, WMV, OGG (max 50MB)
                    </p>
                    <p className="text-xs text-kdrama-primary">
                      Multiple images create a gallery • Videos upload individually
                    </p>
                  </div>
                )}
              </div>
            </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedFiles([]);
              onOpenChange(false);
            }}
            disabled={uploading}
            data-testid="button-cancel-images"
          >
            Cancel
          </Button>
          <Button
            onClick={handleInsert}
            disabled={uploading || selectedFiles.length === 0}
            data-testid="button-insert-images-confirm"
          >
            {uploading ? "Uploading..." : `Insert ${selectedFiles.length > 1 ? "Gallery" : "Image"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface InstagramEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string) => void;
}

export function InstagramEmbedDialog({ open, onOpenChange, onInsert }: InstagramEmbedDialogProps) {
  const [instagramUrls, setInstagramUrls] = useState("");
  const [isMultiple, setIsMultiple] = useState(false);
  const { toast } = useToast();

  const validateInstagramUrl = (url: string): boolean => {
    const cleanUrl = url.split('?')[0];
    return cleanUrl.includes('instagram.com') && 
           (cleanUrl.includes('/reel/') || cleanUrl.includes('/p/') || cleanUrl.includes('/tv/'));
  };

  const handleInsert = () => {
    const urlList = instagramUrls.trim()
      .split(isMultiple ? '\n' : '\n')  // Split by newline in both modes
      .map(url => url.trim())
      .filter(url => url);

    if (urlList.length === 0) {
      toast({
        title: "URL is required",
        variant: "destructive"
      });
      return;
    }

    // Validate all URLs are Instagram URLs
    const invalidUrls = urlList.filter(url => !validateInstagramUrl(url));
    if (invalidUrls.length > 0) {
      toast({
        title: "Invalid Instagram URLs",
        description: `${invalidUrls.length} URL(s) are not valid Instagram links`,
        variant: "destructive"
      });
      return;
    }

    // Generate embed code based on single or multiple
    let embedCode;
    if (urlList.length === 1) {
      embedCode = `[embed:${urlList[0]}]`;
    } else {
      // Multiple Instagram URLs - use gallery format
      embedCode = `[instagram-gallery:${urlList.join(',')}]`;
    }

    onInsert(embedCode);

    // Reset form
    setInstagramUrls("");
    setIsMultiple(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-myeongjo">Insert Instagram</DialogTitle>
          <DialogDescription className="font-noto">
            Add Instagram posts and reels. Toggle below to add multiple items as a gallery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="multiple-mode"
              checked={isMultiple}
              onCheckedChange={setIsMultiple}
            />
            <Label htmlFor="multiple-mode" className="font-noto cursor-pointer">
              Create Instagram gallery (multiple items)
            </Label>
          </div>

          <div>
            <Label htmlFor="instagram-url" className="font-noto">
              {isMultiple ? "Instagram URLs (one per line)" : "Instagram URL"} <span className="text-destructive">*</span>
            </Label>
            {isMultiple ? (
              <Textarea
                id="instagram-urls"
                value={instagramUrls}
                onChange={(e) => setInstagramUrls(e.target.value)}
                placeholder="https://instagram.com/reel/ABC123/
https://instagram.com/p/XYZ789/
https://instagram.com/reel/DEF456/"
                rows={6}
                className="mt-1.5 font-mono text-sm"
                data-testid="textarea-instagram-urls"
              />
            ) : (
              <Input
                id="instagram-url"
                type="url"
                value={instagramUrls}
                onChange={(e) => setInstagramUrls(e.target.value)}
                placeholder="https://instagram.com/reel/... or https://instagram.com/p/..."
                className="mt-1.5"
                data-testid="input-instagram-url"
              />
            )}
            <p className="text-xs text-muted-foreground mt-1 font-noto">
              {isMultiple
                ? "Mix reels and posts together - they'll display in a compact grid"
                : "Paste any Instagram post or reel URL"}
            </p>
            {isMultiple && instagramUrls && (
              <p className="text-xs text-kdrama-primary mt-1 font-noto">
                {instagramUrls.split('\n').filter(u => u.trim()).length} URL(s) added
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setInstagramUrls("");
              setIsMultiple(false);
              onOpenChange(false);
            }}
            data-testid="button-cancel-instagram"
          >
            Cancel
          </Button>
          <Button
            onClick={handleInsert}
            disabled={!instagramUrls.trim()}
            data-testid="button-insert-instagram-confirm"
          >
            Insert Instagram
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SpotifyEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId?: string;
}

export function SpotifyEmbedDialog({ open, onOpenChange, sectionId }: SpotifyEmbedDialogProps) {
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const { toast } = useToast();
  
  // Fetch section data to get existing songUrl
  const { data: section } = useQuery<Section>({
    queryKey: [`/api/sections/${sectionId}`],
    enabled: !!sectionId && open,
  });
  
  // Update form when dialog opens or section changes
  useEffect(() => {
    if (section?.songUrl) {
      setSpotifyUrl(section.songUrl);
    } else {
      setSpotifyUrl("");
    }
  }, [section, open]);

  const parseSpotifyUrl = (url: string): { type: string; id: string; embedUrl: string } | null => {
    // Spotify track: https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6
    const trackRegex = /spotify\.com\/track\/([a-zA-Z0-9]+)/;
    const trackMatch = url.match(trackRegex);
    if (trackMatch) {
      return {
        type: "track",
        id: trackMatch[1],
        embedUrl: `https://open.spotify.com/embed/track/${trackMatch[1]}`,
      };
    }

    // Spotify album: https://open.spotify.com/album/...
    const albumRegex = /spotify\.com\/album\/([a-zA-Z0-9]+)/;
    const albumMatch = url.match(albumRegex);
    if (albumMatch) {
      return {
        type: "album",
        id: albumMatch[1],
        embedUrl: `https://open.spotify.com/embed/album/${albumMatch[1]}`,
      };
    }

    // Spotify playlist: https://open.spotify.com/playlist/...
    const playlistRegex = /spotify\.com\/playlist\/([a-zA-Z0-9]+)/;
    const playlistMatch = url.match(playlistRegex);
    if (playlistMatch) {
      return {
        type: "playlist",
        id: playlistMatch[1],
        embedUrl: `https://open.spotify.com/embed/playlist/${playlistMatch[1]}`,
      };
    }

    return null;
  };

  const updateSectionMutation = useMutation({
    mutationFn: async (songUrl: string | null) => {
      if (!sectionId) throw new Error("No section selected");
      return await apiRequest("PATCH", `/api/sections/${sectionId}`, { songUrl });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${sectionId}`] });
      toast({
        title: "Music updated",
        description: variables === null 
          ? "Section music cleared. Will use chapter music instead." 
          : "The section music has been set successfully.",
      });
      // Reset form
      setSpotifyUrl("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update music",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSetSectionMusic = () => {
    if (!spotifyUrl.trim()) return;
    if (!sectionId) {
      toast({
        title: "No section selected",
        description: "Cannot set music without a section.",
        variant: "destructive",
      });
      return;
    }

    const parsedSpotify = parseSpotifyUrl(spotifyUrl);
    
    if (!parsedSpotify) {
      toast({
        title: "Invalid Spotify URL",
        description: "Please enter a valid Spotify track, album, or playlist URL.",
        variant: "destructive",
      });
      return;
    }

    // Use the original Spotify URL for the section
    updateSectionMutation.mutate(spotifyUrl);
  };
  
  const handleClearMusic = () => {
    if (!sectionId) {
      toast({
        title: "No section selected",
        description: "Cannot clear music without a section.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit null to clear the music and fall back to chapter music
    updateSectionMutation.mutate(null as any);
  };

  const parsedSpotify = spotifyUrl ? parseSpotifyUrl(spotifyUrl) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-myeongjo">Set Section Music</DialogTitle>
          <DialogDescription className="font-noto">
            Add background music that plays in the floating player while reading this section
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="spotify-url" className="font-noto">
              Spotify URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="spotify-url"
              type="url"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="https://open.spotify.com/track/..."
              className="mt-1.5"
              data-testid="input-spotify-url"
            />
            <p className="text-xs text-muted-foreground mt-1 font-noto">
              Paste a link to a Spotify track, album, or playlist
            </p>
            {parsedSpotify && (
              <p className="text-xs text-kdrama-primary mt-1 font-noto">
                ✓ Detected: {parsedSpotify.type.charAt(0).toUpperCase() + parsedSpotify.type.slice(1)}
              </p>
            )}
          </div>

          {parsedSpotify && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-xs font-noto text-muted-foreground mb-2">Preview:</p>
              <div className="h-[352px] relative rounded overflow-hidden">
                <iframe
                  src={parsedSpotify.embedUrl}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {section?.songUrl && (
              <Button
                variant="destructive"
                onClick={handleClearMusic}
                disabled={updateSectionMutation.isPending}
                data-testid="button-clear-music"
              >
                Clear Music
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSpotifyUrl("");
                onOpenChange(false);
              }}
              disabled={updateSectionMutation.isPending}
              data-testid="button-cancel-spotify"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetSectionMusic}
              disabled={!spotifyUrl.trim() || !parsedSpotify || updateSectionMutation.isPending}
              data-testid="button-set-section-music"
            >
              {updateSectionMutation.isPending ? "Setting..." : "Set Section Music"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
