import { z } from "zod";
import { DEFAULT_RUBRIC, packFor, type Rubric } from "@revenue/contracts";

// Pure rubric helpers (no database), shared by policy.ts and the rubric service.
// PRD v3.2 A1: the qualification rubric is workspace data, with the pack default as fallback.
const points = z.number().int().min(0).max(100);
export const rubricSchema = z
  .object({
    role: z.object({
      points,
      keywords: z.array(z.string().trim().min(1).max(60)).min(1).max(60),
    }),
    size: z.object({
      points,
      min: z.number().int().min(0).max(10_000_000),
      max: z.number().int().min(1).max(10_000_000),
    }),
    website: z.object({ points }),
    signal: z.object({ points }),
    tiers: z.object({ a: points, b: points }),
    minimum: points,
  })
  .strict()
  .refine((r) => r.size.min <= r.size.max, {
    message: "size: min must not exceed max",
    path: ["size"],
  })
  .refine((r) => r.tiers.a >= r.tiers.b, {
    message: "tiers: A threshold must be at least the B threshold",
    path: ["tiers"],
  })
  .refine(
    (r) =>
      r.role.points + r.size.points + r.website.points + r.signal.points ===
      100,
    { message: "rule points must add up to 100", path: ["role"] },
  ) satisfies z.ZodType<Rubric>;

// Effective rubric: the workspace's own, else its pack default. A stored value that no longer
// validates falls back to the pack default rather than blocking every score.
export function resolveRubric(workspace: {
  rubric?: unknown;
  pack?: string | null;
}): Rubric {
  if (workspace.rubric !== null && workspace.rubric !== undefined) {
    const parsed = rubricSchema.safeParse(workspace.rubric);
    if (parsed.success) return parsed.data;
  }
  return packFor(workspace.pack).rubric ?? DEFAULT_RUBRIC;
}

// Titles compare after folding Arabic spelling variants (tatweel, diacritics, alef and yeh
// forms), so a keyword written either way matches the title written either way.
export function normalizeTitle(text: string) {
  return text
    .normalize("NFKC")
    .replace(
      /[​-‏‪-‮ـً-ٰٟۖ-ۭ]/g,
      "",
    )
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// The first rubric keyword found in the title, or undefined.
export function matchRole(title: string, keywords: string[]) {
  const text = normalizeTitle(title);
  if (!text) return undefined;
  return keywords.find((keyword) => {
    const needle = normalizeTitle(keyword);
    return needle !== "" && text.includes(needle);
  });
}

