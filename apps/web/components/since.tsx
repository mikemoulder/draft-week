"use client";

import { useEffect, useState } from "react";

// "3 min ago", computed in the browser so a cached page never shows a stale relative time.
const utc = (at: number) =>
  new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

export function Since({ at, fallback = "recently" }: { at: number | null; fallback?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (at === null) return <>{fallback}</>;
  // Server render and first paint show the absolute time; the browser then switches to "n min ago".
  if (now === null) return <>at {utc(at)}</>;
  const min = Math.max(0, Math.round((now - at) / 60_000));
  if (min < 1) return <>just now</>;
  if (min < 60) return <>{min} min ago</>;
  const h = Math.round(min / 60);
  return <>{h} h ago</>;
}
