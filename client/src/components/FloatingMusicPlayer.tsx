import { Music, X } from "lucide-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

export function FloatingMusicPlayer() {
  const { currentSongUrl, currentSongName, forceReloadKey } = useMusicPlayer();
  const [isMinimized, setIsMinimized] = useState(false);

  const embedUrl = useMemo(() => {
    if (!currentSongUrl) {
      return null;
    }

    const match = currentSongUrl.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (!match) {
      return null;
    }

    const [, type, id] = match;
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&autoplay=1`;
  }, [currentSongUrl]);

  const handleMinimize = () => setIsMinimized(true);
  const handleExpand = () => setIsMinimized(false);

  if (!embedUrl) {
    return null;
  }

  const iframeKey = `${forceReloadKey}-${embedUrl}`;

  return (
    <div className="fixed top-4 right-4 z-50" data-testid="floating-music-player">
      {isMinimized && (
        <Button
          size="icon"
          variant="default"
          className="h-12 w-12 rounded-full shadow-2xl backdrop-blur-md bg-[#ffe9ed] dark:bg-background/50 hover:bg-background/60 dark:hover:bg-background/70 border-2 border-white dark:border-kdrama-cream ring-2 ring-kdrama-heart/50"
          onClick={handleExpand}
          data-testid="button-expand-player"
        >
          <Music className="h-6 w-6 text-kdrama-heart drop-shadow-md" />
        </Button>
      )}

      <Card className={`overflow-hidden shadow-2xl bg-card border-kdrama-thread/20 w-[300px] ${isMinimized ? "hidden" : ""}`}>
        <div className="p-3 flex items-center justify-between bg-kdrama-accent/10 border-b border-kdrama-thread/20">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Music className="h-4 w-4 text-kdrama-thread flex-shrink-0" />
            <p className="text-sm font-noto font-medium text-foreground truncate" data-testid="text-song-name">
              {currentSongName || "Now Playing"}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleMinimize}
            data-testid="button-minimize-player"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="bg-background">
          <iframe
            key={iframeKey}
            src={embedUrl}
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="w-full border-0"
            title="Spotify music player"
          />
        </div>
      </Card>
    </div>
  );
}
