import { randomInt } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { Chain, ChallengeResponse, Me } from "@draftweek/shared";
import type { Db } from "../../db/client.js";
import type { StrikeClient } from "../../strike.js";
import { authChallenges, sessions, users, wallets } from "../../db/schema.js";
import { fail, ok, type Result } from "../result.js";
import { normalizeAddress } from "./address.js";
import { buildMessage } from "./message.js";
import { CHALLENGE_TTL_MS, SESSION_TTL_MS, hashToken, newNonce, newToken, shortAddress } from "./sessions.js";
import { SUPPORTED_CHAINS, verifySignature } from "./verify.js";

const UNIQUE_VIOLATION = "23505";

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService(db: Db, opts: { origin: string; now?: () => Date; strike?: Pick<StrikeClient, "accountByAddress"> }) {
  const now = opts.now ?? (() => new Date());

  async function loadMe(userId: string): Promise<Me | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return null;
    const owned = await db
      .select({ chain: wallets.chain, address: wallets.address })
      .from(wallets)
      .where(eq(wallets.userId, userId));
    return {
      id: user.id,
      displayName: user.displayName,
      wallets: owned,
      strike: user.strikeAccountId && user.strikeAddress ? { accountId: user.strikeAccountId, address: user.strikeAddress } : null,
    };
  }

  async function findOrCreateUser(chain: Chain, address: string): Promise<string> {
    const [existing] = await db.select({ userId: wallets.userId }).from(wallets).where(eq(wallets.address, address));
    if (existing) return existing.userId;
    try {
      return await db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values({ displayName: shortAddress(address) }).returning({ id: users.id });
        if (!user) throw new Error("user insert returned nothing");
        await tx.insert(wallets).values({ userId: user.id, chain, address });
        return user.id;
      });
    } catch (err) {
      // Two first sign-ins for the same wallet raced; the other one created it.
      if ((err as { code?: string }).code !== UNIQUE_VIOLATION) throw err;
      const [winner] = await db.select({ userId: wallets.userId }).from(wallets).where(eq(wallets.address, address));
      if (!winner) throw err;
      return winner.userId;
    }
  }

  /** Remember which Strike account the wallet belongs to. A lookup failure leaves the link as it was. */
  async function linkStrikeAccount(userId: string, address: string) {
    if (!opts.strike) return;
    try {
      const account = await opts.strike.accountByAddress(address);
      await db
        .update(users)
        .set({ strikeAccountId: account?.account_id ?? null, strikeAddress: account ? address : null })
        .where(eq(users.id, userId));
    } catch {
      // Strike unreachable: sign-in still succeeds; the link is refreshed at the next sign-in.
    }
  }

  return {
    async challenge(chain: Chain, rawAddress: string): Promise<Result<ChallengeResponse>> {
      if (!SUPPORTED_CHAINS.includes(chain)) return fail(400, `${chain} sign-in is not available yet`);
      const normalized = normalizeAddress(chain, rawAddress);
      if (!normalized.ok) return fail(400, normalized.reason);

      const issuedAt = now();
      const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
      const nonce = newNonce();
      const message = buildMessage({ origin: opts.origin, chain, address: normalized.address, nonce, issuedAt, expiresAt });

      await db.delete(authChallenges).where(lt(authChallenges.expiresAt, new Date(issuedAt.getTime() - 86_400_000)));
      await db.insert(authChallenges).values({ nonce, chain, address: normalized.address, message, expiresAt });
      return ok({ nonce, message, expiresAt: expiresAt.getTime() });
    },

    async verify(nonce: string, signature: string, key?: string): Promise<Result<{ token: string; me: Me }>> {
      // Consume the challenge before checking the signature: a nonce is single use even when
      // the signature turns out to be wrong.
      const [challenge] = await db
        .update(authChallenges)
        .set({ usedAt: now() })
        .where(and(eq(authChallenges.nonce, nonce), isNull(authChallenges.usedAt), gt(authChallenges.expiresAt, now())))
        .returning();
      if (!challenge) return fail(400, "sign-in request expired or already used, please try again");

      const valid = verifySignature(challenge.chain, {
        address: challenge.address,
        message: challenge.message,
        signature,
        key,
      });
      if (!valid) return fail(401, "the signature does not match this wallet");

      const userId = await findOrCreateUser(challenge.chain, challenge.address);
      await linkStrikeAccount(userId, challenge.address);
      const token = newToken();
      await db.insert(sessions).values({
        id: hashToken(token),
        userId,
        expiresAt: new Date(now().getTime() + SESSION_TTL_MS),
      });
      const me = await loadMe(userId);
      if (!me) return fail(500, "account could not be loaded");
      return ok({ token, me });
    },

    /** A wallet-free account so anyone can try the game. Same session rules as a wallet sign-in. */
    async guest(): Promise<{ token: string; me: Me }> {
      const [user] = await db
        .insert(users)
        .values({ displayName: `Guest ${String(randomInt(1000, 10000))}` })
        .returning({ id: users.id });
      const userId = (user as { id: string }).id;
      const token = newToken();
      await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt: new Date(now().getTime() + SESSION_TTL_MS) });
      return { token, me: { id: userId, displayName: (await loadMe(userId))?.displayName ?? "Guest", wallets: [], strike: null } };
    },

    /** Which of these wallet addresses have a Strike account. Used before signing, to sign with that one. */
    async strikeAccounts(chain: Chain, addresses: string[]) {
      if (!opts.strike) return [];
      const normalized = [...new Set(addresses.map((a) => normalizeAddress(chain, a)).flatMap((n) => (n.ok ? [n.address] : [])))];
      const found = await Promise.all(
        normalized.map(async (address) => {
          const account = await opts.strike?.accountByAddress(address).catch(() => null);
          return account ? { address, accountId: account.account_id, blockchain: account.blockchain } : null;
        }),
      );
      return found.filter((a) => a !== null);
    },

    async userForToken(token: string): Promise<Me | null> {
      const [session] = await db
        .select({ userId: sessions.userId })
        .from(sessions)
        .where(and(eq(sessions.id, hashToken(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, now())));
      return session ? loadMe(session.userId) : null;
    },

    async revoke(token: string): Promise<void> {
      await db
        .update(sessions)
        .set({ revokedAt: sql`now()` })
        .where(and(eq(sessions.id, hashToken(token)), isNull(sessions.revokedAt)));
    },
  };
}
