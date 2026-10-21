/*
THESIS      A trading-card club under floodlights: every Strike trader is a collectible card you draft into a five-card hand, and the week is a match you watch. It refuses to look like an exchange.
WORLD       Warm night ground lit by sunset floodlight glows; Bricolage Grotesque display, Figtree text; rounded cards with tier frames; Phosphor duotone icons; orange is the action, gold the lead, red the red card.
STORY       Hook with a fanned hand of this week's top real cards -> live facts -> last week's game of the week, replayed -> how a trade becomes a point -> nothing is simulated -> play.
FIRST VIEW  Headline left, lead + orange action, a fanned hand of five real trader cards right, glowing; facts strip at the fold.
SIGNATURE   The trader card: crest generated from the account, an overall rating from last week, a tier frame, a style badge.
REFUSES     Candlestick charts and terminal chrome; stock photos, AI art and fake player faces; flat grey dashboards.
*/
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { MOTION_BOOT, MotionRoot } from "@/components/motion";
import { Toaster } from "@/components/states";
import "./globals.css";

// Bricolage Grotesque for display and every number (optical size follows the font size), Figtree for
// text and labels. Self-hosted by next/font, so nothing loads from a font CDN at runtime.
const display = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz"], variable: "--font-brand-display", display: "swap" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-brand-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://draft-week.vercel.app"),
  title: { default: "FTL: Fantasy Trading League for Strike", template: "%s | FTL" },
  description:
    "FTL, the Fantasy Trading League. Draft five real Strike Finance traders. Every trade they make this week scores for you. Free to play, scored from Strike's public trade data.",
  openGraph: { type: "website", siteName: "FTL, Fantasy Trading League" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#15112A" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      </head>
      <body>
        <MotionRoot />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
