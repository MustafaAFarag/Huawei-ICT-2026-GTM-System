import type { CSSProperties } from "react";

// Workspace brand colours are data, not tokens. Pick a readable ink for text on top of them.
function luminance(hex: string) {
  const match = /^#([\da-f]{6})$/i.exec(hex);
  if (!match) return 0;
  const value = parseInt(match[1], 16);
  const channel = (shift: number) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

export const isHex = (value: string | null | undefined): value is string =>
  Boolean(value && /^#[\da-f]{6}$/i.test(value));

// CSS custom properties for a card painted in a brand colour.
export function brandVars(color: string | null | undefined): CSSProperties {
  const bg = isHex(color) ? color : undefined;
  const light = bg ? luminance(bg) > 0.4 : false;
  return {
    ...(bg ? { "--bc-bg": bg } : {}),
    "--bc-ink": light ? "rgb(24 25 23)" : "rgb(255 255 255)",
    "--bc-ink-soft": light ? "rgb(24 25 23 / 0.72)" : "rgb(255 255 255 / 0.78)",
  } as CSSProperties;
}
