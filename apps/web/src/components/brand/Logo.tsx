"use client";
import { usePrefs } from "../../lib/prefs";
import {
  ARABIC_LETTERS,
  LOCKUP_LETTERS,
  WORDMARK_LETTERS,
  type LogoLetters,
} from "./logo-paths";

// Caravan Route C logo, drawn from docs/brand/route-c/:
//   English wordmark: wordmark-c-as-mark.svg (the mark is the C, then "aravan")
//   English lockup:   lockup-horizontal.svg (mark, then the full word "Caravan")
//   Arabic (both):    lockup-arabic.svg (mark on the right, then "كارافان")
//   Intro animation:  mark-animated.svg (timings copied into .logo-animated in caravan.css)
// Colours come from --logo-route, --logo-dot and --logo-text; sizes from --logo-h (see caravan.css).
// The mark and the letters are two SVGs that share one vertical span, so the gap between them is
// plain flex spacing and the collapsed rail can hide the letters.

const LETTERS: Record<"wordmark" | "lockup", LogoLetters> = {
  wordmark: WORDMARK_LETTERS,
  lockup: LOCKUP_LETTERS,
};

// Mark geometry in the 100-unit design box (spec.json), cropped to the visible stroke.
// The route is 166.16 long (radius 34, 280 degrees); caravan.css animates its dash offset.
const ROUTE = "M76.046 28.145A34 34 0 1 0 76.046 71.855";

export function Logo({
  variant,
  animated = false,
}: {
  variant: "wordmark" | "lockup";
  animated?: boolean;
}) {
  const { language } = usePrefs();
  const arabic = language === "ar";
  const letters = arabic ? ARABIC_LETTERS : LETTERS[variant];
  return (
    <span
      className={`wordmark logo${animated ? " logo-animated" : ""}`}
      role="img"
      aria-label={arabic ? "كارافان" : "Caravan"}
      // Fixed per language so the mark stays on the right of the Arabic text.
      dir={arabic ? "rtl" : "ltr"}
      style={{ "--logo-gap": letters.gap } as React.CSSProperties}
    >
      <svg
        className="logo-mark"
        viewBox="9 9 82 82"
        aria-hidden
        focusable="false"
      >
        <path
          className="logo-route"
          d={ROUTE}
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <circle
          className="logo-dot logo-wp-1"
          cx="38.371"
          cy="18.05"
          r="4.34"
        />
        <circle className="logo-dot logo-wp-2" cx="16" cy="50" r="4.34" />
        <circle
          className="logo-dot logo-wp-3"
          cx="38.371"
          cy="81.95"
          r="4.34"
        />
        <circle
          className="logo-dot logo-terminal"
          cx="76.046"
          cy="71.855"
          r="10.5"
        />
      </svg>
      <svg
        className="logo-letters"
        viewBox={letters.viewBox}
        style={{ aspectRatio: `${letters.width} / ${letters.height}` }}
        aria-hidden
        focusable="false"
      >
        <path className="logo-text" d={letters.d} />
      </svg>
    </span>
  );
}
