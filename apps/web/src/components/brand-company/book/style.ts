import type { CSSProperties } from "react";
import type { Brand, BrandMediaRef } from "@revenue/contracts";
import { contrast, isHex } from "../color";

export type Motif = "lattice" | "speed" | "paper" | "rings";
export type RoleKey = "primary" | "secondary" | "tertiary" | "neutral";
export type BookRole = {
  key: RoleKey;
  name: string;
  hex: string;
  tints: [string, string][];
};

const ROLE_ORDER: RoleKey[] = ["primary", "secondary", "tertiary", "neutral"];

// Art direction comes from the kit's own words, so a new kit gets a sensible book without code.
export function motifOf(brand: Brand): Motif {
  const text = `${brand.visualDirection ?? ""}`.toLowerCase();
  if (/geometr|lattice|star|khatam/.test(text)) return "lattice";
  if (/speed|diagonal|motion|fast/.test(text)) return "speed";
  if (/paper|soft|cut-?out|warm/.test(text)) return "paper";
  return "rings";
}

// "Precise and calm. Motif: Fine-line Saudi geometric pattern." → mood and motif phrases.
export function directionParts(brand: Brand) {
  const text = brand.visualDirection ?? "";
  const [mood, motif] = text.split(/\s*Motif:\s*/i);
  return {
    mood: mood?.replace(/\.$/, "").trim() || undefined,
    motif: motif?.replace(/\.$/, "").trim() || undefined,
  };
}

export function rolesOf(brand: Brand): BookRole[] {
  const roles = brand.paletteRoles;
  if (roles)
    return ROLE_ORDER.flatMap((key) => {
      const role = roles[key];
      if (!role) return [];
      const tints = Object.entries(role.tints).sort(
        ([a], [b]) => Number(a) - Number(b),
      );
      return [{ key, name: role.name, hex: role.hex, tints }];
    });
  const fallback: [RoleKey, string | undefined][] = [
    ["primary", brand.primary],
    ["secondary", brand.accent],
    ["tertiary", brand.palette?.[2]],
    ["neutral", brand.palette?.[3]],
  ];
  return fallback.flatMap(([key, hex]) =>
    isHex(hex) ? [{ key, name: key, hex, tints: [] }] : [],
  );
}

// Pick the darkest and lightest colours of the kit as the book's ink and paper.
function inkAndPaper(roles: BookRole[]) {
  const sorted = [...roles].sort(
    (a, b) => contrast(a.hex, "#FFFFFF") - contrast(b.hex, "#FFFFFF"),
  );
  const paper = sorted[0]?.hex ?? "#F7F5F0";
  const ink = sorted[sorted.length - 1]?.hex ?? "#111111";
  return { ink, paper };
}

export const readableOn = (bg: string) =>
  contrast(bg, "#FFFFFF") >= contrast(bg, "#111111") ? "#FFFFFF" : "#111111";

export function bookVars(brand: Brand, roles: BookRole[]): CSSProperties {
  const hex = (key: RoleKey) => roles.find((r) => r.key === key)?.hex;
  const primary = hex("primary") ?? brand.primary;
  const secondary = hex("secondary") ?? brand.accent;
  const { ink, paper } = inkAndPaper(roles);
  const tertiary = hex("tertiary") ?? ink;
  const neutral = hex("neutral") ?? paper;
  const mood = (brand.visualDirection ?? "").toLowerCase();
  const bold = /bold|fast|loud/.test(mood);
  const warm = /warm|friendly|optimistic|playful/.test(mood);
  // A primary that is lighter than its ink (e.g. saffron) is a highlight, so the deep colour carries the blocks.
  const primaryIsLight =
    contrast(primary, "#111111") > contrast(primary, "#FFFFFF");
  const block = primaryIsLight ? ink : primary;
  const highlight = primaryIsLight ? primary : secondary;
  return {
    "--bb-primary": primary,
    "--bb-secondary": secondary,
    "--bb-tertiary": tertiary,
    "--bb-neutral": neutral,
    "--bb-ink": ink,
    "--bb-paper": paper,
    "--bb-block": block,
    "--bb-on-block": readableOn(block),
    "--bb-highlight": highlight,
    "--bb-on-highlight": readableOn(highlight),
    "--bb-head": `"${brand.fonts?.headline ?? "Inter"}", "Inter Variable", system-ui, sans-serif`,
    "--bb-body": `"${brand.fonts?.body ?? "Inter"}", "Inter Variable", system-ui, sans-serif`,
    "--bb-radius": warm ? "28px" : bold ? "2px" : "10px",
    "--bb-radius-lg": warm ? "48px" : bold ? "4px" : "18px",
    "--bb-display-weight": bold ? "900" : warm ? "700" : "300",
    "--bb-head-weight": bold ? "800" : warm ? "700" : "500",
    "--bb-tracking": bold ? "-0.035em" : warm ? "-0.02em" : "-0.04em",
    "--bb-case": bold ? "uppercase" : "none",
    // Average glyph width (em) of the display style, used to fit the cover name to its column.
    "--bb-glyph": bold ? "0.78" : warm ? "0.64" : "0.58",
  } as CSSProperties;
}

// Gallery pick: the new artwork first (ids carry "-art"), then the rest of the library.
export function pickImages(gallery: BrandMediaRef[]) {
  const by = (pred: (m: BrandMediaRef) => boolean) => gallery.filter(pred);
  const art = (role: string, word?: string) =>
    gallery.find(
      (m) =>
        m.role === role &&
        m.id.includes("-art") &&
        (!word || m.id.includes(word)),
    );
  const any = (role: string) => gallery.find((m) => m.role === role);
  return {
    cover: art("hero", "cover") ?? any("hero") ?? gallery[0],
    object: art("cover", "object") ?? any("cover"),
    poster: art("cover", "poster") ?? any("cover"),
    scene: art("hero", "scene") ?? by((m) => m.role === "hero")[1],
    sceneAlt: art("photo", "scene") ?? any("photo"),
    still: art("photo", "still") ?? by((m) => m.role === "photo")[1],
    textures: by((m) => m.role === "texture").sort(
      (a, b) => Number(b.id.includes("-art")) - Number(a.id.includes("-art")),
    ),
    heroes: by((m) => m.role === "hero" && !m.id.includes("-art")),
    photos: by((m) => m.role === "photo" && !m.id.includes("-art")),
    all: gallery,
  };
}

// Company descriptions are stored for the agency ("Agency client: …"); the book speaks as the brand.
export const positioning = (description: string) =>
  description
    .replace(/^agency client:\s*/i, "")
    .replace(/^\w/, (c) => c.toUpperCase());
