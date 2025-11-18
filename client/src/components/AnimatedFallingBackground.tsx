import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const FALLER_COUNT = 40;
const LANE_COUNT = 10;
const SPAWN_INTERVAL_MS = 1000;
const MIN_LANE_GAP_PER_ASSET = 3;
const MIN_LANE_GAP_GLOBAL = 3;
const IMAGE_MODULES = import.meta.glob<{ default: string }>(
  "@background/images/*.{png,jpg,jpeg,gif,webp,svg}",
  { eager: true },
);

type ImageOption = {
  src: string;
  name: string;
};

type FallerConfig = {
  id: number;
  imageSrc: string;
  assetKey: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotateStart: number;
  rotateEnd: number;
  topOffset: number;
  sway: number;
  lane: number;
  variant: "socks" | "starbucks" | "train" | "feather" | "book" | "heart" | "butterfly" | "default";
};

type VariantSettings = {
  durationRange: [number, number];
  delayRange: [number, number];
  swayScale: number;
};

const IMAGE_OPTIONS: ImageOption[] = Object.entries(IMAGE_MODULES)
  .map(([path, mod]) => {
    const src = mod?.default;
    if (!src) return null;

    const name = path.split("/").pop()?.toLowerCase() ?? "";
    return { src, name } satisfies ImageOption;
  })
  .filter((option): option is ImageOption => Boolean(option?.src));

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getSizeMultiplier = (option: ImageOption) => {
  if (option.name.includes("feather")) return 2.4;
  if (option.name.includes("book")) return 1.25;
  if (option.name.includes("socks")) return 1.6;
  if (option.name.includes("starbuck")) return 1.6;
  if (option.name.includes("train")) return 1.4;
  if (option.name.includes("heart")) return 1.8;
  return 1;
};

const getWeight = (option: ImageOption) => {
  if (option.name.includes("berry")) return 4;
  if (option.name.includes("socks")) return 2;
  if (option.name.includes("starbuck")) return 2;
  if (option.name.includes("train")) return 2;
  if (option.name.includes("heart")) return 2;
  if (option.name.includes("butterfly")) return 2;
  if (option.name.includes("feather")) return 3;
  return 1;
};

const getVariant = (option: ImageOption): FallerConfig["variant"] => {
  if (option.name.includes("socks")) return "socks";
  if (option.name.includes("starbuck")) return "starbucks";
  if (option.name.includes("train")) return "train";
  if (option.name.includes("feather")) return "feather";
  if (option.name.includes("heart")) return "heart";
  if (option.name.includes("butterfly")) return "butterfly";
  if (option.name.includes("book")) return "book";
  return "default";
};

const variantSettings: Record<FallerConfig["variant"], VariantSettings> = {
  socks: {
    durationRange: [18, 24],
    delayRange: [1, 4],
    swayScale: 0.18,
  },
  starbucks: {
    durationRange: [16, 22],
    delayRange: [0.5, 3.5],
    swayScale: 0.22,
  },
  train: {
    durationRange: [22, 28],
    delayRange: [2, 5],
    swayScale: 0.12,
  },
  feather: {
    durationRange: [19, 27],
    delayRange: [0.5, 3],
    swayScale: 0.25,
  },
  book: {
    durationRange: [17, 23],
    delayRange: [1, 3],
    swayScale: 0.18,
  },
  heart: {
    durationRange: [18, 25],
    delayRange: [1, 4],
    swayScale: 0.2,
  },
  butterfly: {
    durationRange: [17, 24],
    delayRange: [0.5, 3],
    swayScale: 0.26,
  },
  default: {
    durationRange: [16, 22],
    delayRange: [0.5, 3],
    swayScale: 0.2,
  },
};

const WEIGHTED_IMAGE_POOL: ImageOption[] = (() => {
  const pool: ImageOption[] = [];
  for (const option of IMAGE_OPTIONS) {
    const weight = getWeight(option);
    for (let i = 0; i < weight; i += 1) {
      pool.push(option);
    }
  }
  return pool.length ? pool : [...IMAGE_OPTIONS];
})();

const createFallerConfig = (
  id: number,
  option: ImageOption,
  lane: number,
  laneWidth: number,
  assetKey: string,
): FallerConfig => {
  const rotateStart = randomBetween(-35, 35);
  const rotateEnd = rotateStart + randomBetween(15, 55) * (Math.random() > 0.5 ? 1 : -1);
  const baseSize = randomBetween(22, 40);
  const size = baseSize * getSizeMultiplier(option);
  const laneCenter = lane * laneWidth + laneWidth / 2;
  const left = clamp(laneCenter + randomBetween(-laneWidth * 0.1, laneWidth * 0.1), 4, 96);
  const variant = getVariant(option);
  const settings = variantSettings[variant];
  const sway = randomBetween(-laneWidth * settings.swayScale, laneWidth * settings.swayScale);
  const delay = randomBetween(...settings.delayRange);
  const duration = randomBetween(...settings.durationRange);
  const topOffset = randomBetween(10, 35);

  return {
    id,
    imageSrc: option.src,
    assetKey,
    left,
    lane,
    delay,
    duration,
    size,
    rotateStart,
    rotateEnd,
    topOffset,
    sway,
    variant,
  };
};

export const AnimatedFallingBackground = () => {
  const prefersReducedMotion = useReducedMotion();
  const laneWidth = useMemo(() => 100 / Math.max(LANE_COUNT, 1), []);
  const nextIdRef = useRef(0);

  const pickLane = useCallback((assetKey: string, active: FallerConfig[]) => {
    const blocked = new Set<number>();

    const blockRange = (center: number, radius: number) => {
      for (let offset = -radius; offset <= radius; offset += 1) {
        const laneCandidate = center + offset;
        if (laneCandidate >= 0 && laneCandidate < LANE_COUNT) {
          blocked.add(laneCandidate);
        }
      }
    };

    active.forEach((faller) => {
      blockRange(faller.lane, MIN_LANE_GAP_GLOBAL);
      if (faller.assetKey === assetKey) {
        blockRange(faller.lane, MIN_LANE_GAP_PER_ASSET);
      }
    });

    const available: number[] = [];
    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      if (!blocked.has(lane)) {
        available.push(lane);
      }
    }

    if (!available.length) {
      return Math.floor(Math.random() * LANE_COUNT);
    }

    return available[Math.floor(Math.random() * available.length)];
  }, []);

  const spawnFaller = useCallback(
    (active: FallerConfig[]): FallerConfig => {
      const option =
        WEIGHTED_IMAGE_POOL[Math.floor(Math.random() * WEIGHTED_IMAGE_POOL.length)] ??
        IMAGE_OPTIONS[Math.floor(Math.random() * IMAGE_OPTIONS.length)];
      const lane = pickLane(option.name, active);
      return createFallerConfig(nextIdRef.current++, option, lane, laneWidth, option.name);
    },
    [laneWidth, pickLane],
  );

  const [fallers, setFallers] = useState<FallerConfig[]>(() => {
    if (!IMAGE_OPTIONS.length) return [];
    const initial: FallerConfig[] = [];
    const seedCount = Math.min(4, FALLER_COUNT);
    for (let i = 0; i < seedCount; i += 1) {
      initial.push(spawnFaller(initial));
    }
    return initial;
  });

  useEffect(() => {
    if (!IMAGE_OPTIONS.length || prefersReducedMotion) return undefined;

    const interval = setInterval(() => {
      setFallers((prev) => {
        if (prev.length >= FALLER_COUNT) {
          return prev;
        }
        return [...prev, spawnFaller(prev)];
      });
    }, SPAWN_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [prefersReducedMotion, spawnFaller]);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      setFallers((prev) => {
        let next = [...prev];
        while (next.length < FALLER_COUNT) {
          next = [...next, spawnFaller(next)];
        }
        return next;
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [prefersReducedMotion, spawnFaller]);

  const handleComplete = useCallback(
    (fallerId: number) => {
      setFallers((prev) => {
        const remaining = prev.filter((faller) => faller.id !== fallerId);
        if (prefersReducedMotion || !IMAGE_OPTIONS.length) {
          return remaining;
        }
        if (remaining.length < FALLER_COUNT) {
          return [...remaining, spawnFaller(remaining)];
        }
        return remaining;
      });
    },
    [prefersReducedMotion, spawnFaller],
  );

  if (!fallers.length || prefersReducedMotion) return null;

  const renderFaller = (faller: FallerConfig) => {
    const filterOverride = (() => {
      if (faller.variant === "socks") {
        return "drop-shadow(0 12px 20px rgba(0,0,0,0.55)) drop-shadow(0 0 12px rgba(255,255,255,0.65))";
      }
      if (faller.variant === "starbucks") {
        return "drop-shadow(0 6px 10px rgba(0,0,0,0.18)) drop-shadow(0 0 12px rgba(160,255,210,0.6))";
      }
      if (faller.variant === "train") {
        return "drop-shadow(0 8px 16px rgba(0,0,0,0.4)) drop-shadow(0 0 14px rgba(255,180,120,0.45))";
      }
      if (faller.variant === "heart") {
        return "drop-shadow(0 10px 22px rgba(0,0,0,0.4)) drop-shadow(0 0 10px rgba(255,145,210,0.8))";
      }
      if (faller.variant === "butterfly") {
        return "drop-shadow(0 10px 22px rgba(0,0,0,0.3)) drop-shadow(0 0 12px rgba(123, 182, 255, 0.8))";
      }
      return undefined;
    })();

    return (
      <motion.img
        key={`stream-${faller.id}`}
        src={faller.imageSrc}
        alt=""
        className="falling-image absolute opacity-80"
        loading="lazy"
        style={{
          left: `${faller.left}%`,
          width: `${faller.size}px`,
          height: "auto",
          filter: filterOverride,
        }}
        initial={{
          top: `-${faller.topOffset}vh`,
          opacity: 0,
          rotate: faller.rotateStart,
        }}
        animate={{
          top: "100vh",
          x: [0, faller.sway, faller.sway * 0.3, 0],
          rotate: [faller.rotateStart, faller.rotateEnd, faller.rotateStart],
          opacity: [0, 0.9, 0.9, 0.95],
        }}
        transition={{
          top: {
            duration: faller.duration,
            ease: "linear",
            delay: faller.delay,
          },
          x: {
            duration: faller.duration * 0.8,
            ease: "easeInOut",
            delay: faller.delay,
          },
          rotate: {
            duration: faller.duration,
            ease: "linear",
            delay: faller.delay,
          },
          opacity: {
            duration: faller.duration,
            ease: "linear",
            delay: faller.delay,
          },
        }}
        onAnimationComplete={() => handleComplete(faller.id)}
      />
    );
  };

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none" aria-hidden="true">
      {fallers.map((faller) => renderFaller(faller))}
    </div>
  );
};

export default AnimatedFallingBackground;
