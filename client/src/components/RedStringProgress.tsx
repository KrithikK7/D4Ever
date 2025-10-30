import { useEffect, useState, useRef } from "react";

interface RedStringProgressProps {
  currentPage: number;
  totalPages: number;
  sectionTitle?: string;
  initialProgress?: number;
  className?: string;
}

export function RedStringProgress({
  currentPage,
  totalPages,
  initialProgress = 0,
  className = "",
}: RedStringProgressProps) {
  const [fillProgress, setFillProgress] = useState(0);
  const [pathLength, setPathLength] = useState(1000);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const appliedInitialProgressRef = useRef<number | null>(null);
  const previousProgressRef = useRef(0);
  const pathRef = useRef<SVGPathElement>(null);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Initialize from saved progress
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

  // Calculate progress percentage
  useEffect(() => {
    if (!isInitialized) return;

    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
    const clampedProgress = Math.min(100, Math.max(0, progress));

    if (clampedProgress === previousProgressRef.current) return;

    setFillProgress(clampedProgress);
    previousProgressRef.current = clampedProgress;
  }, [currentPage, totalPages, isInitialized]);

  // Measure path length for accurate animation
  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
    }
  }, []);

  const newStringPath =
    "m 203.25178,125.25123 c 0.70716,-2.76218 3.38279,-14.86559 3.97057,-17.47611 26.19101,-116.3227103 -63.33859,-83.67879 -19.63313,-44.676399 13.13075,11.717772 22.43272,18.749796 45.63425,31.820896 54.54392,30.728533 55.41035,-56.489195 -23.63684,-10.528016 -41.64117,24.211829 -82.82698,33.890659 -91.10968,-41.2075 -7.54605,-69.404139 70.93301,-37.4620695 24.50307,-2.496156 -5.57973,4.490225 -11.96325,6.702687 -18.6596,8.631445 -5.52876,1.646533 -12.84224,1.84604 -21.85994,8.122346 -5.915259,4.117009 -16.063366,14.278172 -21.920676,28.089696 -11.999915,28.295778 -2.135942,36.382278 1.802127,38.862768 8.255453,5.1999 46.183819,0.40083 11.36262,-41.875123 C 90.858738,79.064014 86.3198,75.318163 82.131326,70.385164 79.56687,67.364861 76.952534,64.073151 74.424422,60.623199 62.472301,44.312907 60.866417,29.552325 64.162156,16.935577 71.444414,-10.942364 115.01237,6.1584174 85.004239,41.711793 78.652067,49.237791 50.197426,80.83625 17.115888,46.705469";

  const safePathLength = pathLength > 0 ? pathLength : 0.0001;
  const filledLength = (fillProgress / 100) * safePathLength;
  const dashArray = `${filledLength} ${safePathLength}`;
  const dashOffset = safePathLength;

  return (
    <div
      className={`w-full ${className}`}
      data-testid="red-string-progress"
      role="progressbar"
      aria-valuenow={Math.round(fillProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Reading progress: ${Math.round(
        fillProgress
      )}% complete`}
    >
      <svg
        width="100%"
        height="133"
        viewBox="0 0 296 133"
        className="w-full h-auto"
        preserveAspectRatio="none"
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

          {/* Red gradient (adjusted from provided SVG) */}
          <linearGradient
            id="filled-gradient"
            x1="139.509"
            y1="-16.7444"
            x2="143.219"
            y2="177.453"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FF3355" />
            <stop offset="100%" stopColor="#5E161E" />
          </linearGradient>

          <linearGradient id="outline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffcccc" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#ffb3b3" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ff9999" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Outline */}
        <path
          d={newStringPath}
          fill="none"
          stroke="url(#outline-gradient)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Animated filled portion */}
        <g filter="url(#string-shadow)">
          <path
            ref={pathRef}
            d={newStringPath}
            fill="none"
            stroke="url(#filled-gradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            style={{
              transition: prefersReducedMotion
                ? 'none'
                : 'stroke-dasharray 0.6s ease-out, stroke-dashoffset 0.6s ease-out',
            }}
          />
        </g>
      </svg>
    </div>
  );
}
