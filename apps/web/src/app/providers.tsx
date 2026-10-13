"use client";
import { ThemeProvider } from "@revenue/ui";
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider colorScheme="light" applyToRoot>
      {children}
    </ThemeProvider>
  );
}
