// The only module that talks to Strike. Base paths differ by service: trading and accounts
// under /v2, market data under /price/v2, stats under /stat/v1. Cloudflare rejects default
// library user agents, so every request sends ours.
import { z } from "zod";

const num = z.union([z.string(), z.number()]).transform(Number);
const optNum = z.union([z.string(), z.number(), z.null()]).optional().transform((v) => (v == null || v === "" ? null : Number(v)));

export const StrikeFill = z.object({
  id: z.number(),
  trade_id: z.number(),
  order_id: z.number(),
  account_id: z.string(),
  symbol: z.string(),
  side: z.string(),
  role: z.string(),
  price: num,
  size: num,
  realized_pnl: num,
  fee: num,
  leverage: z.number().nullable().optional(),
  auto_close_type: z.string().nullable().optional(),
  client_order_id: z.string().nullable().optional(),
  timestamp: z.number(),
});
export type StrikeFill = z.infer<typeof StrikeFill>;

export const LeaderboardEntry = z.object({
  account_id: z.string(),
  nickname: z.string().nullable().optional(),
  ada_handle: z.string().nullable().optional(),
  blockchain_address: z.string().nullable().optional(),
  vault_id: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  equity: optNum,
  volume: optNum,
  total_trades: num,
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntry>;

const FillsPage = z.object({ fills: z.array(StrikeFill).nullable() });
const AccountByAddress = z.object({ account_id: z.string(), blockchain: z.string(), blockchain_address: z.string() });
const LeaderboardPage = z.object({ total: z.number(), entries: z.array(LeaderboardEntry) });

export class StrikeError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
  }
}

export type StrikeClientOptions = {
  base?: string;
  fetch?: typeof fetch;
  retries?: number;
  timeoutMs?: number;
};

export function createStrikeClient(opts: StrikeClientOptions = {}) {
  const base = opts.base ?? "https://api.strikefinance.org";
  const doFetch = opts.fetch ?? fetch;
  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 20_000;

  async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await doFetch(base + path, {
          headers: { "user-agent": "draft-week/1.0 (+https://draft-week.vercel.app)", accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.status === 429 || res.status >= 500) throw new StrikeError(`strike ${res.status} on ${path}`, res.status);
        if (!res.ok) {
          // 4xx other than 429 will not improve on retry
          throw Object.assign(new StrikeError(`strike ${res.status} on ${path}`, res.status), { final: true });
        }
        return schema.parse(await res.json());
      } catch (err) {
        lastError = err;
        if ((err as { final?: boolean }).final || err instanceof z.ZodError) throw err;
        if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
    throw lastError;
  }

  return {
    /** Strike accounts ranked over a window. Vault rows are included; callers filter them. */
    async leaderboard(q: { timeRange: "24h" | "7d" | "30d"; sortBy: "trades" | "total_pnl"; limit: number; offset: number }) {
      const params = new URLSearchParams({
        time_range: q.timeRange,
        platform: "strike",
        sort_by: q.sortBy,
        sort_dir: "desc",
        limit: String(q.limit),
        offset: String(q.offset),
      });
      return get(`/stat/v1/stats/leaderboard?${params}`, LeaderboardPage);
    },

    /** The Strike account registered to a wallet address, or null when there is none (404). */
    async accountByAddress(address: string) {
      try {
        return await get(`/v2/account?blockchain_address=${encodeURIComponent(address)}`, AccountByAddress);
      } catch (err) {
        if (err instanceof StrikeError && err.status === 404) return null;
        throw err;
      }
    },

    /** Leaderboard rows for specific accounts or addresses (volume, equity) over a window. */
    async leaderboardFor(accountsOrAddresses: string[], timeRange: "7d" | "30d" = "7d") {
      const params = new URLSearchParams({
        time_range: timeRange,
        platform: "strike",
        addresses: accountsOrAddresses.join(","),
        limit: String(accountsOrAddresses.length),
        offset: "0",
      });
      return (await get(`/stat/v1/stats/leaderboard?${params}`, LeaderboardPage)).entries;
    },

    /** Newest first, older than fromId. For backfilling a time window. */
    async fillsBefore(accountId: string, q: { startTime: number; fromId?: number; limit?: number }) {
      const params = new URLSearchParams({ account_id: accountId, startTime: String(q.startTime), limit: String(q.limit ?? 1000) });
      if (q.fromId !== undefined) params.set("fromId", String(q.fromId));
      return (await get(`/v2/history/fill?${params}`, FillsPage)).fills ?? [];
    },

    /** Oldest first, trade_id greater than sinceTradeId. For incremental polling. */
    async fillsSince(accountId: string, sinceTradeId: number, limit = 1000) {
      const params = new URLSearchParams({ account_id: accountId, since_trade_id: String(sinceTradeId), limit: String(limit) });
      return (await get(`/v2/history/fill?${params}`, FillsPage)).fills ?? [];
    },
  };
}

export type StrikeClient = ReturnType<typeof createStrikeClient>;
