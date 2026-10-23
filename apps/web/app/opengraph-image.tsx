import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { markDataUrl } from "@/lib/brand";

export const alt = "FTL, the Fantasy Trading League: pick five real Strike traders, and their real trades score for you.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand fonts from a pinned package; the image still renders in the default font if the fetch fails.
async function font(url: string) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

// Drawn outside in, so the middle card sits on top like the hero's hand.
const CARDS = [
  { color: "#FF5C8A", rotate: -14, x: -175, y: 40, rating: 98 },
  { color: "#B794FF", rotate: 14, x: 205, y: 40, rating: 93 },
  { color: "#5CC8FF", rotate: -7, x: -80, y: 12, rating: 97 },
  { color: "#3DDC97", rotate: 7, x: 110, y: 12, rating: 95 },
  { color: "#FFF4E6", rotate: 0, x: 15, y: 0, rating: 99 },
];

export default async function OpengraphImage() {
  const [display, text, strike] = await Promise.all([
    font("https://cdn.jsdelivr.net/npm/@fontsource/bricolage-grotesque@5.3.0/files/bricolage-grotesque-latin-800-normal.woff"),
    font("https://cdn.jsdelivr.net/npm/@fontsource/figtree@5.3.0/files/figtree-latin-500-normal.woff"),
    readFile(join(process.cwd(), "public/strike-logo.png"))
      .then((b) => `data:image/png;base64,${b.toString("base64")}`)
      .catch(() => null),
  ]);
  const fonts = [
    ...(display ? [{ name: "Display", data: display, weight: 800 as const }] : []),
    ...(text ? [{ name: "Text", data: text, weight: 500 as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#15112A", color: "#FFF4E6", padding: "64px 72px", fontFamily: "Text" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img src={markDataUrl()} width={76} height={76} alt="" />
            <span style={{ fontFamily: "Display", fontSize: 44, letterSpacing: -1 }}>FTL</span>
            <span style={{ fontSize: 20, letterSpacing: 3, color: "#B8AFCC", marginLeft: 6 }}>FANTASY TRADING LEAGUE</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Display", fontSize: 92, lineHeight: 0.98, letterSpacing: -3 }}>
            <span>Five traders.</span>
            <span style={{ color: "#FF7A3D" }}>Seven days.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span style={{ fontSize: 28, color: "#D9D1E8", lineHeight: 1.3 }}>Pick five real Strike traders. Every trade they make this week scores for you.</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: "#B8AFCC" }}>
              {strike ? <img src={strike} width={34} height={34} alt="" style={{ borderRadius: 17 }} /> : null}
              <span>Powered by Strike Finance · Free to play</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, position: "relative", alignItems: "center", justifyContent: "center" }}>
          {CARDS.map((c) => (
            <div
              key={c.rating}
              style={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                width: 170,
                height: 238,
                padding: 18,
                borderRadius: 20,
                background: "#1E1838",
                border: `5px solid ${c.color}`,
                transform: `translate(${c.x}px, ${c.y}px) rotate(${c.rotate}deg)`,
                boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
              }}
            >
              <span style={{ fontFamily: "Display", fontSize: 54, color: c.color === "#FFF4E6" ? "#FFC93C" : c.color }}>{c.rating}</span>
              <div style={{ display: "flex", height: 70, borderRadius: 12, background: c.color, opacity: 0.85 }} />
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
