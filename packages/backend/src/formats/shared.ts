import type { Brand, Evidence, ProspectSnapshot } from "@revenue/contracts";
import { hex, onColor } from "../asset-template.js";
import { numbers } from "../asset-quality.js";
import { escapeHtml } from "../policy.js";

// Shared inputs and checks for model-written deliverables. The model writes content JSON;
// trusted templates own all markup, so layout rules (Gmail, Outlook, slide sizes, RTL)
// hold regardless of what the model returns.

export type FormatContext = {
  brand: Brand;
  company: string;
  offer?: string;
  snapshot?: ProspectSnapshot;
  facts: Evidence[];
  language: string;
  date: string;
  // Capability profile (A6): every approved offer, the references with recorded consent,
  // and the asset-vs-no-asset holdout share it ships with.
  offers?: string[];
  references?: string[];
  holdoutPercent?: number;
};

export const esc = escapeHtml;
export const arabic = (language: string) => language !== "en";

export function mix(color: string, target: string, amount: number) {
  const channel = (value: string, i: number) => parseInt(value.slice(i, i + 2), 16);
  const out = [1, 3, 5].map((i) =>
    Math.round(channel(color, i) * (1 - amount) + channel(target, i) * amount)
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${out.join("")}`;
}

export function palette(brand: Brand) {
  const primary = hex(brand.primary, "#1f3a5f");
  const accent = hex(brand.accent, "#e5484d");
  return {
    primary,
    accent,
    onPrimary: onColor(primary),
    onAccent: onColor(accent),
    ink: "#14161a",
    body: "#3a3f47",
    muted: "#6b717c",
    line: "#e3e5e9",
    paper: "#ffffff",
    tint: mix(primary, "#ffffff", 0.93),
    deep: mix(primary, "#000000", 0.35),
  };
}

export const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function sourceLine(fact: Evidence | undefined, language: string) {
  if (!fact) return "";
  const date = fact.date.slice(0, 10);
  return arabic(language)
    ? `المصدر: <bdi dir="ltr">${esc(host(fact.url))}</bdi> · <bdi dir="ltr">${esc(date)}</bdi>`
    : `Source: ${esc(host(fact.url))} · ${esc(date)}`;
}

// Every string value in the model's content, for numeric and language checks.
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object")
    return Object.entries(value)
      .filter(([key]) => !["url", "sourceId", "kind"].includes(key))
      .flatMap(([, v]) => strings(v));
  return [];
}

// Numbers in visible copy must come from approved facts, the approved offer or the
// company context. Small counting words (three steps, 5 ideas) up to 12 are allowed.
export function checkContent(
  content: unknown,
  context: FormatContext,
  instructions = "",
) {
  const allowed = new Set(
    numbers(
      [
        ...context.facts.map((f) => `${f.claim} ${f.date}`),
        context.offer ?? "",
        ...(context.offers ?? []),
        ...(context.references ?? []),
        context.company,
        context.brand.name,
        context.snapshot?.company ?? "",
        String(context.snapshot?.employees ?? ""),
      ].join(" "),
    ),
  );
  for (let n = 0; n <= 12; n++) allowed.add(String(n));
  // Topic numbers the person typed ("companies past 50 staff") are allowed; rates, money
  // and multipliers they ask for are not, because those read as results.
  for (const value of numbers(
    instructions.replace(/\d[\d.,]*\s*(?:%|٪|x\b|×|egp|sar|aed|usd|\$|جنيه|ريال|درهم)/gi, ""),
  ))
    allowed.add(value);
  const visible = strings(content).join(" ");
  const unsupported = numbers(visible).filter((value) => !allowed.has(value));
  if (unsupported.length)
    throw new Error(
      `The draft added unsupported numbers (${[...new Set(unsupported)].slice(0, 3).join(", ")}). Retry; numbers must come from reviewed sources.`,
    );
  if (arabic(context.language) && !/[؀-ۿ]/.test(visible))
    throw new Error("The Arabic deliverable needs Arabic copy. Retry generation.");
}

// Links the model proposes are kept only when they point at the brand site or a
// reviewed source; anything else falls back to the brand website.
export function safeUrl(url: string | undefined, context: FormatContext) {
  const allowed = new Set(
    [context.brand.website, ...context.facts.map((f) => f.url)].filter(Boolean),
  );
  if (url && allowed.has(url)) return url;
  if (url && context.brand.website) {
    try {
      if (new URL(url).hostname === new URL(context.brand.website).hostname)
        return url;
    } catch {
      /* fall through */
    }
  }
  return context.brand.website || "#";
}

export function factById(context: FormatContext, id: string | undefined) {
  return id ? context.facts.find((f) => f.id === id) : undefined;
}

export const fontStack = (language: string) =>
  arabic(language)
    ? `"IBM Plex Sans Arabic", "Inter", Tahoma, Arial, sans-serif`
    : `"Inter", "Helvetica Neue", Arial, sans-serif`;
