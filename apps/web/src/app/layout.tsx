import type { Metadata } from "next";
import "twenty-ui/style.css";
import "twenty-ui/theme-light.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Revenue Workspace",
  description:
    "Prepare and review outreach with ready-made plays, cited research and branded assets.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
