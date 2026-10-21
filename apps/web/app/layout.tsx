/*
THESIS      A stadium scoreboard for Strike traders: the page is a game being played, not a product being sold. It refuses to look like an exchange.
WORLD       Near-black ground, Archivo 800 expanded display set like a jersey, mono for every number's label, hard 1px lines, zero radius. One accent, scoreboard yellow, means "the lead"; liquidation is the red card.
STORY       Hook (five traders, seven days) -> live facts band -> last week's game of the week, replayed -> how a trade becomes a point -> nothing is simulated -> play.
FIRST VIEW  1440: giant two-line headline left, lead + two actions, the facts marquee at the fold, the scoreboard's top edge visible. 375: the headline at 15vw, one action, marquee, scoreboard header.
SIGNATURE   The replay scoreboard: two managers' totals in huge numerals, a 7-day lead line drawing day by day, trader chips lighting with points, a red card flashing on a liquidation.
REFUSES     Candlestick charts and trading-terminal chrome; casino gold, coins and confetti; gradient blobs, glass cards and floating 3D.
*/
import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { MOTION_BOOT, MotionRoot } from "@/components/motion";
import { Toaster } from "@/components/states";
import "./globals.css";

// Archivo carries both voices: 400/700 at normal width for text, 800 at 125% width for display
// and every score. Self-hosted by next/font, so nothing loads from a font CDN at runtime.
const sans = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-brand-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-brand-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://draft-week.vercel.app"),
  title: { default: "FTL: Fantasy Trading League for Strike", template: "%s | FTL" },
  description:
    "FTL, the Fantasy Trading League. Draft five real Strike Finance traders. Every trade they make this week scores for you. Free to play, scored from Strike's public trade data.",
  openGraph: { type: "website", siteName: "FTL, Fantasy Trading League" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0B0B0B" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
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
