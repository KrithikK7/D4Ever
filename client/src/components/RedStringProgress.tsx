import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SVG_CONFIG, RED_STRING_PATH_D } from "./redStringPath";

interface RedStringProgressProps {
  currentPage: number;
  totalPages: number;
  sectionTitle?: string;
  initialProgress?: number;
  className?: string;
  /** Fill from original end -> start */
  reversePath?: boolean;
}

export function RedStringProgress({
  currentPage,
  totalPages,
  sectionTitle,
  initialProgress = 0,
  className = "",
  reversePath = true,
}: RedStringProgressProps) {
  const [fillProgress, setFillProgress] = useState(0);
  const [pathLength, setPathLength] = useState(1000);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [reversedD, setReversedD] = useState<string | null>(null);

  const [autoViewBox, setAutoViewBox] = useState<string>("0 0 296 133");
  const [vbW, setVbW] = useState<number>(296);
  const [vbH, setVbH] = useState<number>(133);

  // Resolve % height to px (so height changes work even if parent has no height)
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedHeight, setResolvedHeight] = useState<string | number>(SVG_CONFIG.HEIGHT_PCT);

  const appliedInitialProgressRef = useRef<number | null>(null);
  const previousProgressRef = useRef(0);
  const measurePathRef = useRef<SVGPathElement>(null);

  // Reduced motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Initialize from saved
  useEffect(() => {
    if (appliedInitialProgressRef.current !== initialProgress) {
      if (initialProgress > 0) {
        setFillProgress(initialProgress);
        previousProgressRef.current = initialProgress;
      }
      appliedInitialProgressRef.current = initialProgress;
      setIsInitialized(true);
    }
  }, [initialProgress]);

  // Progress %
  useEffect(() => {
    if (!isInitialized) return;
    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
    const clamped = Math.min(100, Math.max(0, progress));
    if (clamped === previousProgressRef.current) return;
    setFillProgress(clamped);
    previousProgressRef.current = clamped;
  }, [currentPage, totalPages, isInitialized]);

  const originalD = RED_STRING_PATH_D;

  // Measure, fit viewBox, reverse geometry
  useEffect(() => {
    const meas = measurePathRef.current;
    if (!meas) return;

    // 1) Fit viewBox to path bounds (+ padding)
    const bb = meas.getBBox();
    const minX = bb.x - SVG_CONFIG.VIEWBOX_PAD;
    const minY = bb.y - SVG_CONFIG.VIEWBOX_PAD;
    const w = Math.max(bb.width + 2 * SVG_CONFIG.VIEWBOX_PAD, 1);
    const h = Math.max(bb.height + 2 * SVG_CONFIG.VIEWBOX_PAD, 1);
    setAutoViewBox(`${minX} ${minY} ${w} ${h}`);
    setVbW(w);
    setVbH(h);

    // 2) Length
    const len = meas.getTotalLength();
    setPathLength(len);

    // 3) Reverse geometry for end→start fill
    if (!reversePath || len === 0) {
      setReversedD(null);
      return;
    }
    const samples = Math.max(300, Math.min(2000, Math.round(len / 1)));
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = meas.getPointAtLength(len * (1 - t));
      pts.push({ x: p.x, y: p.y });
    }
    const dRev =
      `M ${pts[0].x},${pts[0].y} ` +
      pts.slice(1).map(p => `L ${p.x},${p.y}`).join(" ");
    setReversedD(dRev);
  }, [originalD, reversePath]);

  // Resolve % height -> px when unlocked
  useLayoutEffect(() => {
    if (SVG_CONFIG.ASPECT_RATIO_LOCKED) return;
    const isPercent =
      typeof SVG_CONFIG.HEIGHT_PCT === "string" &&
      SVG_CONFIG.HEIGHT_PCT.trim().endsWith("%");

    const compute = () => {
      if (!isPercent) {
        setResolvedHeight(SVG_CONFIG.HEIGHT_PCT);
        return;
      }
      const pct = parseFloat(SVG_CONFIG.HEIGHT_PCT) / 100;
      const parent = containerRef.current?.parentElement ?? null;
      const parentH = parent ? parent.clientHeight : 0;
      const basis = parentH > 0 ? parentH : window.innerHeight;
      setResolvedHeight(Math.max(0, Math.round(basis * pct)));
    };

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // Dash math (forward because path is reversed when reversePath=true)
  const dashOffset = pathLength - (pathLength * fillProgress) / 100;
  const drawD = reversePath && reversedD ? reversedD : originalD;

  // Container sizing (and centering)
  const centeredWrapperStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    width: "100%",
  };

  const containerStyle: React.CSSProperties = SVG_CONFIG.ASPECT_RATIO_LOCKED
    ? { width: SVG_CONFIG.WIDTH_PCT, aspectRatio: `${vbW} / ${vbH}`, margin: "0 auto" }
    : { width: SVG_CONFIG.WIDTH_PCT, height: resolvedHeight, margin: "0 auto" };

  return (
    <div style={centeredWrapperStyle}>
      <div
        ref={containerRef}
        className={`w-full ${className}`}
        data-testid="red-string-progress"
        role="progressbar"
        aria-valuenow={Math.round(fillProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          sectionTitle
            ? `${sectionTitle} progress: ${Math.round(fillProgress)}% complete`
            : `Reading progress: ${Math.round(fillProgress)}% complete`
        }
        style={containerStyle}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={autoViewBox}
          className="w-full h-full"
          preserveAspectRatio={SVG_CONFIG.ASPECT_RATIO_LOCKED ? "xMidYMid meet" : "none"}
        >
          <defs>
            <filter id="string-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dx="0.5" dy="1.5" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.25" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="filled-gradient" x1="139.509" y1="-16.7444" x2="143.219" y2="177.453" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF3355" />
              <stop offset="100%" stopColor="#5E161E" />
            </linearGradient>

            <linearGradient id="outline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffcccc" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#ffb3b3" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ff9999" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Hidden measuring path */}
          <path ref={measurePathRef} d={originalD} fill="none" stroke="none" />

          {/* Outline */}
          <path
            d={originalD}
            fill="none"
            stroke="url(#outline-gradient)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Animated filled portion */}
          <g filter="url(#string-shadow)">
            <path
              d={drawD}
              fill="none"
              stroke="url(#filled-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={pathLength}
              strokeDashoffset={dashOffset}
              style={{
                transition: prefersReducedMotion ? "none" : "stroke-dashoffset 0.6s ease-out",
              }}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
