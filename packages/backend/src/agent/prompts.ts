import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Prompts are versioned files (PRD AI-02). The recorded version is the declared version
// plus a content hash, so an edit without a version bump is still traceable.
export type Prompt = { id: string; version: string; text: string };
const cache = new Map<string, Prompt>();

export type PromptId =
  | "system"
  | "drafting"
  | "language"
  | "fewshot"
  | "asset"
  | "call-outcome"
  | "format-email"
  | "format-carousel"
  | "format-flipbook"
  | "format-capability-profile";
export function prompt(id: PromptId): Prompt {
  const cached = cache.get(id);
  if (cached) return cached;
  const raw = readFileSync(new URL(`./prompts/${id}.md`, import.meta.url), "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = Object.fromEntries(
    (match?.[1] ?? "")
      .split("\n")
      .map((line) => line.split(":").map((v) => v.trim()) as [string, string]),
  );
  const text = (match?.[2] ?? raw).trim();
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 8);
  const loaded = { id, version: `${meta.version ?? "0"}+${hash}`, text };
  cache.set(id, loaded);
  return loaded;
}

export function promptVersions(...ids: Parameters<typeof prompt>[0][]) {
  return Object.fromEntries(ids.map((id) => [id, prompt(id).version]));
}
