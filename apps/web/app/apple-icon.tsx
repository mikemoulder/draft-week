import { ImageResponse } from "next/og";
import { markDataUrl } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#15112A" }}>
        <img src={markDataUrl()} width={140} height={140} alt="" />
      </div>
    ),
    size,
  );
}
