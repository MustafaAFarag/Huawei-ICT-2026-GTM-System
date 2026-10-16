import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "../styles/tokens.css";
import "./globals.css";
import "../styles/caravan.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Caravan",
  description:
    "Caravan: tell Nabil what to prepare. Researched accounts, reviewed outreach and branded deliverables for MENA teams.",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#040506" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
  ],
};

// Applies stored theme and interface direction before first paint to avoid a flash.
const bootScript = `try{var d=document.documentElement,t=localStorage.getItem("revenue-theme"),l=localStorage.getItem("revenue-ui-language");d.dataset.theme=t==="light"?"light":"dark";if(l==="ar"){d.lang="ar";d.dir="rtl"}}catch(e){}`;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
