"use client";
import { useEffect, useState } from "react";
import { Strobi, type AnimationName } from "./Strobi";

// Nabil is Caravan's assistant. The avatar is the Strobi runtime (owner-supplied, unchanged
// geometry); only its accessible name says Nabil. Moods follow what the assistant is doing.
export type NabilMood = Extract<
  AnimationName,
  | "idle"
  | "listening"
  | "thinking"
  | "searching"
  | "working"
  | "happy"
  | "celebrate"
  | "drowsy"
  | "sleeping"
  | "waking"
  | "confused"
  | "curious"
>;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function Nabil({
  mood = "idle",
  size = 32,
  className = "",
}: {
  mood?: NabilMood;
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <span
      className={`nabil ${className}`}
      data-mood={mood}
      aria-hidden="true"
      style={{ inlineSize: size, blockSize: size }}
    >
      <Strobi animation={mood} playing={!reduced} size={size} />
    </span>
  );
}

export type ChatActivity = {
  streaming: boolean;
  hasText: boolean;
  tools: { name: string; state: string }[];
  recording: boolean;
  typingAt: number;
  runActive: boolean;
  celebratedAt: number;
  lastActiveAt: number;
};

const READ_TOOLS = new Set([
  "workspace_overview",
  "search_accounts",
  "get_account",
  "review_queue",
  "get_draft",
  "list_assets",
  "get_asset",
  "recent_runs",
]);

// Maps chat state to a mood. `sleepy` lets the floating launcher doze after two idle minutes.
export function useNabilMood(activity: ChatActivity, sleepy = false): NabilMood {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (activity.recording) return "listening";
  if (activity.streaming) {
    const running = activity.tools.filter((t) => t.state === "called");
    if (running.some((t) => !READ_TOOLS.has(t.name))) return "working";
    if (running.length) return "searching";
    return activity.hasText ? "working" : "thinking";
  }
  if (activity.runActive) return "working";
  if (now - activity.celebratedAt < 4000) return "celebrate";
  if (now - activity.typingAt < 1500) return "listening";
  if (sleepy) {
    const idle = now - activity.lastActiveAt;
    if (idle > 180_000) return "sleeping";
    if (idle > 120_000) return "drowsy";
  }
  return "idle";
}
