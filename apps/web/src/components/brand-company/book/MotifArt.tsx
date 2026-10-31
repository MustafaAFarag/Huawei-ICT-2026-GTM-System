import { useId } from "react";
import type { Motif } from "./style";

// The brand's signature drawn in SVG, so it stays crisp at any size and takes any kit colour.
export function MotifArt({
  kind,
  color = "currentColor",
  className = "",
  density = 1,
}: {
  kind: Motif;
  color?: string;
  className?: string;
  density?: number;
}) {
  const id = useId().replace(/:/g, "");
  const cls = `bb-motif bb-motif-${kind} ${className}`;
  if (kind === "lattice") {
    const s = 56 / density;
    return (
      <svg
        className={cls}
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 560 560"
      >
        <defs>
          <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
            <g fill="none" stroke={color} strokeWidth={0.7}>
              <rect x={s * 0.2} y={s * 0.2} width={s * 0.6} height={s * 0.6} />
              <rect
                x={s * 0.2}
                y={s * 0.2}
                width={s * 0.6}
                height={s * 0.6}
                transform={`rotate(45 ${s / 2} ${s / 2})`}
              />
              <circle cx={s / 2} cy={s / 2} r={s * 0.12} />
              <path
                d={`M0 0L${s * 0.2} ${s * 0.2}M${s} 0L${s * 0.8} ${s * 0.2}M0 ${s}L${s * 0.2} ${s * 0.8}M${s} ${s}L${s * 0.8} ${s * 0.8}`}
              />
            </g>
          </pattern>
        </defs>
        <rect width="560" height="560" fill={`url(#${id})`} />
      </svg>
    );
  }
  if (kind === "speed") {
    const bars = [
      [40, 18],
      [92, 6],
      [130, 34],
      [196, 4],
      [226, 12],
      [290, 48],
      [372, 8],
      [404, 22],
      [470, 5],
      [500, 30],
    ];
    return (
      <svg
        className={cls}
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 560 560"
      >
        <g fill={color} transform="skewX(-28) translate(160 0)">
          {bars.map(([x, w]) => (
            <rect key={x} x={x * density} y={-20} width={w} height={600} />
          ))}
        </g>
      </svg>
    );
  }
  if (kind === "paper") {
    return (
      <svg
        className={cls}
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 560 560"
      >
        <defs>
          <filter id={`${id}s`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.18" />
          </filter>
          <filter id={`${id}g`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0" />
          </filter>
        </defs>
        <g fill={color} filter={`url(#${id}s)`}>
          <path d="M-40 560 C 60 380, 220 380, 300 560 Z" opacity="0.55" />
          <path d="M180 560 C 260 300, 470 300, 600 560 Z" opacity="0.8" />
          <circle cx="420" cy="170" r="74" opacity="0.9" />
          <path d="M60 220 a70 70 0 0 1 140 0 v120 h-140 z" opacity="0.4" />
        </g>
        <rect width="560" height="560" filter={`url(#${id}g)`} />
      </svg>
    );
  }
  return (
    <svg
      className={cls}
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 560 560"
    >
      <g fill="none" stroke={color} strokeWidth="1">
        {Array.from({ length: 9 }, (_, i) => (
          <circle
            key={i}
            cx="280"
            cy="280"
            r={40 + i * 34}
            opacity={1 - i * 0.09}
          />
        ))}
      </g>
    </svg>
  );
}

// Concentric rings: the structural echo used behind headline moments in every book.
export function Rings({
  color = "currentColor",
  className = "",
}: {
  color?: string;
  className?: string;
}) {
  return (
    <MotifArt kind="rings" color={color} className={`bb-rings ${className}`} />
  );
}
