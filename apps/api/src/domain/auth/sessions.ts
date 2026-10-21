import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "dw_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newNonce(): string {
  return randomBytes(16).toString("hex");
}

// Sessions are stored by hash so the table is useless to anyone who reads it.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function shortAddress(address: string): string {
  return address.length <= 16 ? address : `${address.slice(0, 9)}…${address.slice(-5)}`;
}
