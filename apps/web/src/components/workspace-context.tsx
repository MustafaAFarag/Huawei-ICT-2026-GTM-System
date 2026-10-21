"use client";
import { createContext, useContext } from "react";
import type { ToolName, ToolRequest } from "@revenue/contracts";
import type { Dashboard, Prospect } from "../lib/types";
import type { Proposal } from "./Modals";
import type { TurnContext } from "./chat/controller";

export const TABS = [
  "Plays",
  "Accounts",
  "Review queue",
  "Asset Studio",
  "Sequences",
  "Company context",
  "Settings",
] as const;
export type Tab = (typeof TABS)[number];
export type View = "Home" | Tab;
export type NabilStartRequest = {
  prompt: string;
  surface: "home" | "launcher";
  context?: Partial<TurnContext>;
};
// Sequences is not in the sidebar: it is a tab of the Campaigns page, next to Plays.
// The sidebar highlights Campaigns for both ids.
export const CAMPAIGN_VIEWS: readonly Tab[] = ["Plays", "Sequences"];
// Display names. Internal ids stay stable because assistant tools and prompts use them.
export const TAB_LABELS: Record<Tab, string> = {
  Plays: "Campaigns",
  Accounts: "Accounts",
  "Review queue": "Review",
  "Asset Studio": "Deliverables",
  Sequences: "Sequences",
  "Company context": "Brand & company",
  Settings: "Settings",
};

export type WorkspaceValue = {
  ws: string;
  screen: View;
  activeProspectId?: string;
  activeAssetId?: string;
  userId: string;
  data: Dashboard;
  busy: boolean;
  canWrite: boolean;
  canApprove: boolean;
  play: ToolRequest["play"];
  setPlay: (play: ToolRequest["play"]) => void;
  language: ToolRequest["language"];
  setLanguage: (language: ToolRequest["language"]) => void;
  // Nabil's content language: "auto" lets it follow the request's own language and dialect.
  chatLanguage: "auto" | ToolRequest["language"];
  setChatLanguage: (language: "auto" | ToolRequest["language"]) => void;
  selected: string[];
  setSelected: (update: (previous: string[]) => string[]) => void;
  setTab: (tab: Tab) => void;
  // Review can take a reviewer straight to the export controls after approval.
  openSequencesExport: () => void;
  exportFocusKey: number;
  // Opens a deliverable in the canvas (beside the chat on home, full width elsewhere).
  openAsset: (asset: import("../lib/types").Asset) => void;
  // Starts a new conversation on the home page with the composer prefilled.
  askNabil: (prefill: string) => void;
  // Sends a captured request immediately, either on Home or in the open launcher.
  startNabil: (request: NabilStartRequest) => void;
  setProspect: (prospect: Prospect | null) => void;
  setActiveRun: (id: string | null) => void;
  showProposal: (proposal: Proposal) => void;
  // Runs an API mutation, refreshes the dashboard and reports success or failure.
  action: (fn: () => Promise<unknown>, success?: string) => Promise<void>;
  // Requests a cost quote; the cost modal asks for approval before anything runs.
  propose: (
    tool: ToolName,
    draftIds?: string[],
    website?: string,
    message?: string,
  ) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);
export const WorkspaceProvider = WorkspaceContext.Provider;
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside the shell");
  return value;
}
