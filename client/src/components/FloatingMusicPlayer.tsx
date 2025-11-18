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

type SpotifyIframeEvent = "ready" | "playback_started" | "playback_update" | "error";

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
  preferVideo?: boolean;
}

interface SpotifyPlaybackState {
  duration?: number;
  durationMs?: number;
  duration_ms?: number;
  position?: number;
  positionMs?: number;
  position_ms?: number;
  progress?: number;
  progressMs?: number;
  progress_ms?: number;
  isPaused?: boolean;
  is_paused?: boolean;
  paused?: boolean;
  isBuffering?: boolean;
  is_buffering?: boolean;
  track?: {
    uri?: string;
    duration?: number;
    durationMs?: number;
    duration_ms?: number;
  };
  item?: {
    uri?: string;
    duration_ms?: number;
    duration?: number;
  };
}

interface SpotifyEmbedController {
  loadUri?: (uri: string, preferVideo?: boolean, timestampInSeconds?: number) => Promise<void> | void;
  play?: () => Promise<void> | void;
  playFromStart?: () => Promise<void> | void;
  restart?: () => Promise<void> | void;
  pause?: () => Promise<void> | void;
  resume?: () => Promise<void> | void;
  togglePlay?: () => Promise<void> | void;
  seek?: (timestampInSeconds: number) => Promise<void> | void;
  setVolume?: (value: number) => Promise<void> | void;
  addListener?: (
    eventName: SpotifyIframeEvent,
    handler: (event: { data?: SpotifyPlaybackState }) => void,
  ) => (() => void) | void;
  removeListener?: (
    eventName: SpotifyIframeEvent,
    handler: (event: { data?: SpotifyPlaybackState }) => void,
  ) => void;
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
    type: type as "track" | "album" | "playlist",
  };
};

const isPromise = (value: unknown): value is Promise<unknown> =>
  typeof (value as Promise<unknown>)?.then === "function";

export function FloatingMusicPlayer() {
  const { currentSongUrl, currentSongName, forceReloadKey, setCurrentSong, registerPauseListener } =
    useMusicPlayer();
  const { autoplayEnabled, setAutoplayEnabled } = useAutoplayConsent();

  const [isMinimized, setIsMinimized] = useState(false);
  const [spotifyApiLoaded, setSpotifyApiLoaded] = useState(false);
  const [isControllerReady, setIsControllerReady] = useState(false);
  const [needsSpotifyLogin, setNeedsSpotifyLogin] = useState(false);

  const embedContainerRef = useRef<HTMLDivElement>(null);
  const spotifyApiRef = useRef<SpotifyIframeApi | null>(null);
  const controllerRef = useRef<SpotifyEmbedController | null>(null);
  const loopRestartGuardRef = useRef(false);
  const spotifyPausedRef = useRef(true);
  const resumeAfterExternalPauseRef = useRef(false);
  const lastPositionMsRef = useRef(0);
  const resumePositionMsRef = useRef<number | null>(null);

  const spotifySource = useMemo(() => parseSpotifySource(currentSongUrl), [currentSongUrl]);
  const spotifyUri = spotifySource?.uri ?? null;

  const reportPlaybackFailure = useCallback(() => {
    setNeedsSpotifyLogin(true);
  }, []);

  const reportPlaybackSuccess = useCallback(() => {
    setNeedsSpotifyLogin(false);
  }, []);

  const executePlaybackCommand = useCallback(
    (command?: () => Promise<void> | void, onSuccess?: () => void) => {
      if (!command) return;
      try {
        const result = command();
        if (isPromise(result)) {
          result
            .then(() => {
              reportPlaybackSuccess();
              onSuccess?.();
            })
            .catch(() => {
              reportPlaybackFailure();
            });
        } else {
          reportPlaybackSuccess();
          onSuccess?.();
        }
      } catch {
        reportPlaybackFailure();
      }
    },
    [reportPlaybackFailure, reportPlaybackSuccess],
  );

  const synchronizeVolume = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    const targetVolume = autoplayEnabled ? 1 : 0;

    const volumeResult = controller.setVolume?.(targetVolume);
    if (isPromise(volumeResult)) {
      volumeResult.catch(() => undefined);
    }

    executePlaybackCommand(controller.play?.bind(controller));
  }, [autoplayEnabled, executePlaybackCommand]);

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

  const reloadCurrentTrack = useCallback(() => {
    if (!currentSongUrl) return;
    loopRestartGuardRef.current = true;
    setCurrentSong(currentSongUrl, currentSongName, true);
    window.setTimeout(() => {
      loopRestartGuardRef.current = false;
    }, 1000);
  }, [currentSongName, currentSongUrl, setCurrentSong]);

  const extractDurationMs = (state?: SpotifyPlaybackState | null) => {
    if (!state) return null;
    const candidates = [
      state.duration,
      state.durationMs,
      state.duration_ms,
      state.track?.duration,
      state.track?.durationMs,
      state.track?.duration_ms,
      state.item?.duration,
      state.item?.duration_ms,
    ];
    return candidates.find((value): value is number => typeof value === "number" && !Number.isNaN(value)) ?? null;
  };

  const extractPositionMs = (state?: SpotifyPlaybackState | null) => {
    if (!state) return null;
    const candidates = [
      state.position,
      state.positionMs,
      state.position_ms,
      state.progress,
      state.progressMs,
      state.progress_ms,
    ];
    return candidates.find((value): value is number => typeof value === "number" && !Number.isNaN(value)) ?? null;
  };

  const extractIsPaused = (state?: SpotifyPlaybackState | null) => {
    if (!state) return false;
    const candidates = [state.isPaused, state.is_paused, state.paused];
    return candidates.find((value) => typeof value === "boolean");
  };

  const handlePlaybackUpdate = useCallback(
    (state?: SpotifyPlaybackState) => {
      if (!state) return;

      const isPaused = extractIsPaused(state) ?? false;
      spotifyPausedRef.current = isPaused;
      if (!isPaused) {
        setNeedsSpotifyLogin(false);
      }
      const trackedPosition = extractPositionMs(state);
      if (typeof trackedPosition === "number" && !Number.isNaN(trackedPosition)) {
        lastPositionMsRef.current = trackedPosition;
      }

      if (spotifySource?.type !== "track") return;

      const durationMs = extractDurationMs(state);
      const positionMs = extractPositionMs(state);

      if (durationMs === null || positionMs === null || durationMs === 0) {
        return;
      }

      const remaining = durationMs - positionMs;

      if (remaining <= 1200 && isPaused && !loopRestartGuardRef.current) {
        reloadCurrentTrack();
      }
    },
    [reloadCurrentTrack, spotifySource?.type],
  );

  useEffect(() => {
    if (!isControllerReady) return;
    const controller = controllerRef.current;
    if (!controller || typeof controller.addListener !== "function") return;

    const listener = (event: { data?: SpotifyPlaybackState }) => {
      handlePlaybackUpdate(event?.data);
    };

    const unsubscribe = controller.addListener("playback_update", listener);

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      } else {
        controller.removeListener?.("playback_update", listener);
      }
    };
  }, [handlePlaybackUpdate, isControllerReady, spotifyUri]);

  useEffect(() => {
    const unregister = registerPauseListener({
      pause: () => {
        const controller = controllerRef.current;
        if (!controller) {
          resumeAfterExternalPauseRef.current = false;
          return;
        }
        if (!spotifyPausedRef.current && typeof controller.pause === "function") {
          resumeAfterExternalPauseRef.current = true;
          resumePositionMsRef.current = lastPositionMsRef.current;
          const result = controller.pause();
          if (isPromise(result)) {
            result.catch(() => undefined);
          }
          spotifyPausedRef.current = true;
        } else {
          resumeAfterExternalPauseRef.current = false;
          resumePositionMsRef.current = null;
        }
      },
      resume: () => {
        if (!resumeAfterExternalPauseRef.current) return;
        resumeAfterExternalPauseRef.current = false;

        const controller = controllerRef.current;
        if (!controller) return;
        const resumePosition = resumePositionMsRef.current;
        resumePositionMsRef.current = null;

        const resumeAction =
          controller.resume?.bind(controller) ??
          controller.togglePlay?.bind(controller) ??
          controller.play?.bind(controller);

        if (!resumeAction) return;

        const handleSeek = () => {
          if (typeof resumePosition === "number" && !Number.isNaN(resumePosition)) {
            const seekResult = controller.seek?.(resumePosition / 1000);
            if (isPromise(seekResult)) {
              seekResult.catch(() => undefined);
            }
          }
        };

        executePlaybackCommand(resumeAction, handleSeek);
        spotifyPausedRef.current = false;
      },
    });

    return unregister;
  }, [executePlaybackCommand, registerPauseListener]);

  const handleEnableAutoplay = () => {
    setAutoplayEnabled(true);
  };

  if (!spotifyUri) {
    return null;
  }

  return (
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

            {needsSpotifyLogin && isControllerReady && (
              <div className="absolute inset-0 z-20 flex flex-col bg-background/95 backdrop-blur-md px-4 py-4 text-left shadow-inner rounded-b-xl space-y-3">
                <div>
                  <p className="font-noto text-sm text-foreground font-semibold">Sign in to Spotify</p>
                  <p className="font-noto text-xs text-muted-foreground mt-1">
                    Spotify needs you to log in (and have Premium) to continue playback.
                  </p>
                </div>
                <div className="mt-auto flex justify-between gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setNeedsSpotifyLogin(false)}>
                    Dismiss
                  </Button>
                  <Button size="sm" asChild>
                    <a
                      href="https://accounts.spotify.com/en/login"
                      target="_blank"
                      rel="noreferrer"
                      data-testid="button-open-spotify-login"
                    >
                      Open Spotify
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
    </div>
  );
}
