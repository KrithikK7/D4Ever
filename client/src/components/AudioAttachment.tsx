import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

const formatTime = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remaining}`;
};

interface AudioAttachmentProps {
  src: string;
  title?: string;
}

const SECTION_BUTTON_COLOR = "rgba(148, 148, 148, 0.35)";
const SECTION_BUTTON_PROGRESS_COLOR = "#D7263D";
const SECTION_BUTTON_CURSOR_COLOR = "transparent";

export function AudioAttachment({ src, title }: AudioAttachmentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const shouldResumeRef = useRef(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { registerPauseListener, pauseMusic, resumeMusic } = useMusicPlayer();

  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: SECTION_BUTTON_COLOR,
      progressColor: SECTION_BUTTON_PROGRESS_COLOR,
      cursorColor: SECTION_BUTTON_CURSOR_COLOR,
      cursorWidth: 0,
      barWidth: 2,
      barRadius: 4,
      barGap: 1.5,
      normalize: true,
      height: 48,
      backend: "WebAudio",
    });

    wavesurferRef.current = wavesurfer;
    wavesurfer.load(src);

    const ensureProgressVisibility = () => {
      const drawer = (wavesurfer as unknown as { drawer?: { progressWave?: HTMLCanvasElement } }).drawer;
      const progressWave = drawer?.progressWave;
      if (progressWave) {
        progressWave.style.opacity = "1";
        progressWave.style.mixBlendMode = "normal";
        progressWave.style.filter = "none";

        const parent = progressWave.parentElement;
        if (parent) {
          parent.style.position = "relative";
          let indicator = parent.querySelector<HTMLCanvasElement>(".waveform-cursor-indicator");
          if (!indicator) {
            indicator = document.createElement("canvas");
            indicator.className = "waveform-cursor-indicator";
            indicator.style.position = "absolute";
            indicator.style.top = "0";
            indicator.style.left = "0";
            indicator.style.pointerEvents = "none";
            indicator.style.filter = "drop-shadow(0 0 12px rgba(215,38,61,0.55))";
            indicator.style.mixBlendMode = "screen";
            indicator.style.clipPath = "inset(0 0 0 calc(100% - 32px))";
            parent.appendChild(indicator);
          }
          const indicatorCtx = indicator.getContext("2d");
          if (indicatorCtx) {
            if (indicator.width !== progressWave.width || indicator.height !== progressWave.height) {
              indicator.width = progressWave.width;
              indicator.height = progressWave.height;
            }
            indicatorCtx.clearRect(0, 0, indicator.width, indicator.height);
            indicatorCtx.drawImage(progressWave, 0, 0);
          }
        }
      }
    };

    ensureProgressVisibility();

    wavesurfer.on("ready", () => {
      setIsReady(true);
      setDuration(wavesurfer.getDuration());
      setCurrentTime(0);
      setIsPlaying(false);
      ensureProgressVisibility();
    });

    wavesurfer.on("audioprocess", () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on("interaction", () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on("play", () => {
      setIsPlaying(true);
      ensureProgressVisibility();
    });
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    const unregister = registerPauseListener({
      pause: () => {
        if (wavesurferRef.current?.isPlaying()) {
          shouldResumeRef.current = true;
          wavesurferRef.current.pause();
        } else {
          shouldResumeRef.current = false;
        }
      },
      resume: () => {
        if (shouldResumeRef.current && wavesurferRef.current && !wavesurferRef.current.isPlaying()) {
          wavesurferRef.current.play();
        }
        shouldResumeRef.current = false;
      },
    });

    return () => {
      unregister();
      wavesurfer.destroy();
      wavesurferRef.current = null;
    };
  }, [src, registerPauseListener]);

  const togglePlayback = () => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer || !isReady) return;

    if (!wavesurfer.isPlaying()) {
      pauseMusic();
      wavesurfer.play();
    } else {
      shouldResumeRef.current = false;
      wavesurfer.pause();
      resumeMusic();
    }
  };

  return (
    <div className="my-3 flex w-full justify-center">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-white/10 p-4 shadow backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm">
        {title ? (
          <p className="mb-2 font-myeongjo text-[13px] text-kdrama-ink dark:text-white">{title}</p>
        ) : null}

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlayback}
            disabled={!isReady}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-kdrama-thread text-white border border-kdrama-thread/70 shadow transition active:scale-95 disabled:opacity-60"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 pl-0.5" />}
          </button>
          <div className="flex flex-1 flex-col">
            <div className="relative h-[48px]">
              <div ref={containerRef} className="waveform relative h-[48px]" />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-kdrama-ink/70">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AudioAttachment;
