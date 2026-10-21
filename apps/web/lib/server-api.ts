// Server-side reads from the backend, used to render public pages with real data in the HTML.
// Falls back to a recorded snapshot so the landing page renders even if the backend is down.
import { cacheLife } from "next/cache";
import type { Showcase } from "@draftweek/shared";
import fixture from "./fixtures/showcase.json";

export type Sourced<T> = { data: T; live: boolean };

export async function getShowcase(): Promise<Sourced<Showcase>> {
  "use cache";
  cacheLife("minutes");
  const origin = process.env.API_ORIGIN;
  const secret = process.env.PROXY_SECRET;
  if (origin && secret) {
    try {
      const res = await fetch(`${origin.replace(/\/$/, "")}/showcase`, {
        headers: { "x-proxy-secret": secret },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return { data: (await res.json()) as Showcase, live: true };
    } catch {
      // fall through to the snapshot
    }
  }
  return { data: fixture as Showcase, live: false };
}
