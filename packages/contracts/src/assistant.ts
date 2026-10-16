import { z } from "zod";
export const assistantScreens = [
  "Plays",
  "Accounts",
  "Review queue",
  "Asset Studio",
  "Sequences",
  "Company context",
  "Settings",
] as const;
// Product actions only: no model-generated selectors, JavaScript or arbitrary clicks.
export const assistantUiAction = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("navigate"), screen: z.enum(assistantScreens) }),
  z.object({ kind: z.literal("open_account"), prospectId: z.uuid() }),
  z.object({ kind: z.literal("open_asset"), assetId: z.uuid() }),
  z.object({
    kind: z.literal("select_accounts"),
    prospectIds: z.array(z.uuid()).max(100),
  }),
]);
export type AssistantUiAction = z.infer<typeof assistantUiAction>;
