import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const secret = "s".repeat(40);
const app = (dbUp = true) =>
  createApp({
    proxySecret: secret,
    version: "test",
    pingDb: async () => dbUp,
    lastIngestAt: async () => 1700000000000,
  });

describe("proxy secret", () => {
  it("rejects requests without the secret", async () => {
    const res = await app().request("/me");
    expect(res.status).toBe(403);
  });

  it("rejects a wrong secret of the same length", async () => {
    const res = await app().request("/me", { headers: { "x-proxy-secret": "x".repeat(40) } });
    expect(res.status).toBe(403);
  });

  it("lets a correct secret through to routing", async () => {
    const res = await app().request("/me", { headers: { "x-proxy-secret": secret } });
    expect(res.status).toBe(404);
  });
});

describe("/health", () => {
  it("is open without the secret and reports the database", async () => {
    const res = await app().request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: true, lastIngestAt: 1700000000000, version: "test" });
  });

  it("returns 503 when the database is down", async () => {
    const res = await app(false).request("/health");
    expect(res.status).toBe(503);
    const body = (await res.json()) as { db: boolean };
    expect(body.db).toBe(false);
  });
});
