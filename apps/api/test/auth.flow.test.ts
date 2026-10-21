// End to end through the HTTP app against a real Postgres. Needs TEST_DATABASE_URL
// (npm run test:db starts a throwaway container on 127.0.0.1:5441). Skipped without it.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { ChallengeResponse, Me } from "@draftweek/shared";
import { createApp } from "../src/app.js";
import { createDb } from "../src/db/client.js";
import { createAuthService } from "../src/domain/auth/service.js";
import { cardanoWallet, solanaWallet } from "./helpers/wallets.js";

const url = process.env.TEST_DATABASE_URL;
const SECRET = "p".repeat(40);
const ORIGIN = "https://draft-week.vercel.app";

describe.skipIf(!url)("sign-in flow", () => {
  const { sql: conn, db } = createDb(url ?? "postgres://unused");
  let clock = new Date();
  const app = createApp({
    proxySecret: SECRET,
    version: "test",
    pingDb: async () => true,
    lastIngestAt: async () => null,
    auth: createAuthService(db, { origin: ORIGIN, now: () => clock }),
    secureCookie: true,
  });

  const call = (path: string, init: { method?: string; json?: unknown; cookie?: string } = {}) =>
    app.request(path, {
      method: init.method ?? (init.json ? "POST" : "GET"),
      headers: {
        "x-proxy-secret": SECRET,
        ...(init.json ? { "content-type": "application/json" } : {}),
        ...(init.cookie ? { cookie: init.cookie } : {}),
      },
      body: init.json ? JSON.stringify(init.json) : undefined,
    });

  const cookieOf = (res: Response) => res.headers.get("set-cookie")?.split(";")[0] ?? "";

  async function signInCardano(w = cardanoWallet()) {
    const ch = (await (await call("/auth/challenge", { json: { chain: "cardano", address: w.hex } })).json()) as ChallengeResponse;
    const res = await call("/auth/verify", { json: { nonce: ch.nonce, ...w.signData(ch.message) } });
    return { res, ch, w };
  }

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
  });
  beforeEach(async () => {
    clock = new Date();
    await db.execute(sql`truncate users, wallets, sessions, auth_challenges cascade`);
  });
  afterAll(async () => {
    await conn.end();
  });

  it("signs in with a Cardano wallet, sets a safe cookie, and knows the user on any request", async () => {
    const { res, w } = await signInCardano();
    expect(res.status).toBe(200);
    const me = (await res.json()) as Me;
    expect(me.wallets).toEqual([{ chain: "cardano", address: w.bech32 }]);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^dw_session=/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Secure/);
    expect(setCookie).toMatch(/SameSite=Lax/);

    const again = await call("/me", { cookie: cookieOf(res) });
    expect(again.status).toBe(200);
    expect(((await again.json()) as Me).id).toBe(me.id);
  });

  it("puts the site, address and nonce in the message the wallet signs", async () => {
    const { ch, w } = await signInCardano();
    expect(ch.message).toContain("draft-week.vercel.app wants you to sign in with your Cardano account:");
    expect(ch.message).toContain(w.bech32);
    expect(ch.message).toContain(`Nonce: ${ch.nonce}`);
  });

  it("returns the same account when the same wallet signs in from another device", async () => {
    const w = cardanoWallet();
    const first = (await (await signInCardano(w)).res.json()) as Me;
    const second = (await (await signInCardano(w)).res.json()) as Me;
    expect(second.id).toBe(first.id);
  });

  it("never accepts a nonce twice", async () => {
    const { ch, w } = await signInCardano();
    const replay = await call("/auth/verify", { json: { nonce: ch.nonce, ...w.signData(ch.message) } });
    expect(replay.status).toBe(400);
  });

  it("burns the nonce on a bad signature, so it cannot be retried", async () => {
    const w = cardanoWallet();
    const ch = (await (await call("/auth/challenge", { json: { chain: "cardano", address: w.bech32 } })).json()) as ChallengeResponse;
    const bad = await call("/auth/verify", { json: { nonce: ch.nonce, ...w.signData(ch.message, w.otherKey()) } });
    expect(bad.status).toBe(401);
    const retry = await call("/auth/verify", { json: { nonce: ch.nonce, ...w.signData(ch.message) } });
    expect(retry.status).toBe(400);
  });

  it("rejects a challenge after five minutes", async () => {
    const w = cardanoWallet();
    const ch = (await (await call("/auth/challenge", { json: { chain: "cardano", address: w.bech32 } })).json()) as ChallengeResponse;
    clock = new Date(clock.getTime() + 5 * 60 * 1000 + 1);
    const late = await call("/auth/verify", { json: { nonce: ch.nonce, ...w.signData(ch.message) } });
    expect(late.status).toBe(400);
  });

  it("logs out by revoking the session server-side", async () => {
    const { res } = await signInCardano();
    const cookie = cookieOf(res);
    expect((await call("/auth/logout", { method: "POST", cookie })).status).toBe(204);
    expect((await call("/me", { cookie })).status).toBe(401);
  });

  it("signs in with a Solana wallet", async () => {
    const s = solanaWallet();
    const ch = (await (await call("/auth/challenge", { json: { chain: "solana", address: s.address } })).json()) as ChallengeResponse;
    const res = await call("/auth/verify", { json: { nonce: ch.nonce, signature: s.signMessage(ch.message) } });
    expect(res.status).toBe(200);
  });

  it("refuses chains that are not enabled and malformed bodies", async () => {
    const eth = await call("/auth/challenge", {
      json: { chain: "ethereum", address: "0xabc0000000000000000000000000000000000001" },
    });
    expect(eth.status).toBe(400);
    const junk = await call("/auth/challenge", { json: { chain: "dogecoin", address: "x" } });
    expect(junk.status).toBe(400);
    expect(((await junk.json()) as { error: string }).error).toMatch(/chain/);
  });

  it("answers 401 for /me without a session", async () => {
    expect((await call("/me")).status).toBe(401);
  });
});
