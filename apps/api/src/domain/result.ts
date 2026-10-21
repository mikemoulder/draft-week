import type { ContentfulStatusCode } from "hono/utils/http-status";

export type Result<T> = { ok: true; value: T } | { ok: false; status: ContentfulStatusCode; error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(status: ContentfulStatusCode, error: string): Result<T> => ({ ok: false, status, error });
