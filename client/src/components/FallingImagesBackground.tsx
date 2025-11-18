import { useMemo, useState } from "react";
import AnimatedFallingBackground from "@/components/AnimatedFallingBackground";
import VideoBackground from "@/components/VideoBackground";
import { useAuth } from "@/contexts/AuthContext";

const label = {
  video: "Switch to animation",
  animation: "Switch to video",
} as const;

type Mode = keyof typeof label;

export const FallingImagesBackground = () => {
  const { isAdmin } = useAuth();
  const [mode, setMode] = useState<Mode>("video");
  const instructions = useMemo(() => (mode === "video" ? "Recorded video" : "Realtime animation"), [mode]);

  return (
    <>
      {/* Non-admins always see the recorded video; admins can toggle */}
      {isAdmin ? (
        <>
          {mode === "video" ? <VideoBackground /> : <AnimatedFallingBackground />}
          <div className="pointer-events-auto fixed top-5 left-5 z-50 rounded-full border border-white/30 bg-white/10 p-2 backdrop-blur">
            <button
              type="button"
              onClick={() => setMode(mode === "video" ? "animation" : "video")}
              className="rounded-full bg-white px-4 py-1 text-xs font-semibold text-kdrama-ink hover:bg-white/90"
            >
              {label[mode]}
            </button>
            <p className="mt-1 text-[10px] text-white/80">{instructions}</p>
          </div>
        </>
      ) : (
        <VideoBackground />
      )}
    </>
  );
};

export default FallingImagesBackground;
