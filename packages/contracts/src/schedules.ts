import { z } from "zod";

export const scheduledTools = [
  "score_accounts",
  "find_signals",
  "draft_messages",
  "mini_audit",
  "preflight",
] as const;
export const scheduleRequest = z.object({
  name: z.string().trim().min(1).max(100),
  play: z.enum(["P1", "P2", "P3", "P4"]),
  tool: z.enum(scheduledTools),
  prospectIds: z.array(z.uuid()).max(100).default([]),
  language: z.enum(["en", "ar-EG", "ar-Gulf", "ar"]).default("en"),
  nextAt: z.iso.datetime(),
  intervalDays: z.number().int().min(1).max(90).default(7),
});
export type ScheduledPlay = {
  id: string;
  name: string;
  play: string;
  userId: string;
  nextAt: string;
  intervalDays: number;
  enabled: boolean;
  lastError: string | null;
  input: {
    tool: (typeof scheduledTools)[number];
    prospectIds: string[];
    language: string;
  };
};
export type ScheduledReviewItem = {
  id: string;
  name: string;
  scheduleId: string;
  dueAt: string;
  play: string;
  tool: (typeof scheduledTools)[number];
  audience: number;
  state: "pending" | "dismissed";
  runId: string | null;
  runState: string | null;
};
