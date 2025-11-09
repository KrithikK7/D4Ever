import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useAutoplayConsent } from "@/contexts/AutoplayConsentContext";

declare global {
  interface Window {
    SpotifyIframeApi?: SpotifyIframeApi;
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

interface SpotifyIframeApi {
  createController: (
    element: HTMLElement,
    options: SpotifyEmbedOptions,
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
}

interface SpotifyEmbedOptions {
  uri: string;
  width?: number | string;
  height?: number | string;
  theme?: string;
  view?: "list" | "coverart";
}

interface SpotifyEmbedController {
  loadUri?: (uri: string) => Promise<void> | void;
  play?: () => Promise<void> | void;
  pause?: () => Promise<void> | void;
  setVolume?: (value: number) => Promise<void> | void;
}

const SPOTIFY_IFRAME_API_SRC = "https://open.spotify.com/embed/iframe-api/v1";

const parseSpotifySource = (url: string | null) => {
  if (!url) return null;
  const match = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  const [, type, id] = match;
  return {
    embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`,
    uri: `spotify:${type}:${id}`,
  };
};

const isPromise = (value: unknown): value is Promise<unknown> =>
  typeof (value as Promise<unknown>)?.then === "function";

export function FloatingMusicPlayer() {
  const { currentSongUrl, currentSongName, forceReloadKey } = useMusicPlayer();
  const { autoplayEnabled, setAutoplayEnabled } = useAutoplayConsent();

  const [isMinimized, setIsMinimized] = useState(false);
  const [spotifyApiLoaded, setSpotifyApiLoaded] = useState(false);
  const [isControllerReady, setIsControllerReady] = useState(false);

  const embedContainerRef = useRef<HTMLDivElement>(null);
  const spotifyApiRef = useRef<SpotifyIframeApi | null>(null);
  const controllerRef = useRef<SpotifyEmbedController | null>(null);

  const spotifySource = useMemo(() => parseSpotifySource(currentSongUrl), [currentSongUrl]);
  const spotifyUri = spotifySource?.uri ?? null;

  const synchronizeVolume = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    const targetVolume = autoplayEnabled ? 1 : 0;

    const volumeResult = controller.setVolume?.(targetVolume);
    if (isPromise(volumeResult)) {
      volumeResult.catch(() => undefined);
    }

    const playResult = controller.play?.();
    if (isPromise(playResult)) {
      playResult.catch(() => undefined);
    }
  }, [autoplayEnabled]);

  useEffect(() => {
    synchronizeVolume();
  }, [autoplayEnabled, synchronizeVolume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.SpotifyIframeApi) {
      spotifyApiRef.current = window.SpotifyIframeApi;
      setSpotifyApiLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = SPOTIFY_IFRAME_API_SRC;
    script.async = true;

    window.onSpotifyIframeApiReady = (api) => {
      spotifyApiRef.current = api;
      setSpotifyApiLoaded(true);
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      window.onSpotifyIframeApiReady = undefined;
    };
  }, []);

  useEffect(() => {
    if (!spotifyApiLoaded) return;
    if (!spotifyUri) return;
    if (!embedContainerRef.current) return;

    const api = spotifyApiRef.current;
    if (!api) return;

    if (!controllerRef.current) {
      embedContainerRef.current.innerHTML = "";
      api.createController(
        embedContainerRef.current,
        {
          uri: spotifyUri,
          width: "100%",
          height: 152,
          theme: "0",
        },
        (controller) => {
          controllerRef.current = controller;
          setIsControllerReady(true);
          synchronizeVolume();
        },
      );
      return;
    }

    let cancelled = false;
    const loadResult = controllerRef.current.loadUri?.(spotifyUri);
    Promise.resolve(loadResult)
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        synchronizeVolume();
      });

    return () => {
      cancelled = true;
    };
  }, [spotifyApiLoaded, spotifyUri, forceReloadKey, synchronizeVolume]);

  const handleMinimize = () => setIsMinimized(true);
  const handleExpand = () => setIsMinimized(false);

  const handleEnableAutoplay = () => {
    setAutoplayEnabled(true);
  };

  const handleDisableAutoplay = () => {
    setAutoplayEnabled(false);
  };

  if (!spotifyUri) {
    return null;
  }

  const consentPrompt = (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <div className="rounded-2xl border border-kdrama-thread/30 bg-background/95 shadow-2xl backdrop-blur-md p-4 space-y-3">
        <p className="font-noto text-sm text-muted-foreground text-right">
          {autoplayEnabled
            ? "Music is unmuted."
            : "Music is playing softly in the background. Tap to unmute."}
        </p>
        <div className="flex justify-end">
          {autoplayEnabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisableAutoplay}
              data-testid="button-disable-music-floating"
            >
              Mute Music
            </Button>
          ) : (
            <Button onClick={handleEnableAutoplay} size="sm" data-testid="button-enable-music-floating">
              Unmute Music
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {consentPrompt}
      <div className="fixed top-4 right-4 z-40" data-testid="floating-music-player">
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

        <Card
          className={`relative overflow-hidden shadow-2xl bg-card border-kdrama-thread/20 w-[300px] ${
            isMinimized ? "hidden" : ""
          }`}
        >
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

          <div className="relative bg-background min-h-[152px]">
            <div ref={embedContainerRef} className="w-full h-[152px] overflow-hidden rounded-b-xl bg-muted/20" />

            {!isControllerReady && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Loading Spotify player…
              </div>
            )}

            {!autoplayEnabled && isControllerReady && (
              <div className="absolute inset-0 z-10 flex flex-col bg-background/90 backdrop-blur-md px-4 py-3 text-center shadow-inner rounded-b-xl">
                <p className="font-noto text-sm text-muted-foreground mb-3">
                  Music is muted. Tap to bring it to life.
                </p>
                <div className="mt-auto w-full flex justify-end">
                  <Button onClick={handleEnableAutoplay} size="sm" data-testid="button-enable-music-overlay">
                    Unmute
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
