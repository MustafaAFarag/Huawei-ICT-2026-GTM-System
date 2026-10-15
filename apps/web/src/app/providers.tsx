"use client";
import { PrefsProvider } from "../lib/prefs";
export function Providers({ children }: { children: React.ReactNode }) {
  return <PrefsProvider>{children}</PrefsProvider>;
}
