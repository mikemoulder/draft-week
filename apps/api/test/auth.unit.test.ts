import { describe, expect, it } from "vitest";
import { normalizeAddress } from "../src/domain/auth/address.js";
import { buildMessage } from "../src/domain/auth/message.js";
import { verifySignature } from "../src/domain/auth/verify.js";
import { cardanoWallet, solanaWallet } from "./helpers/wallets.js";

describe("normalizeAddress", () => {
  const w = cardanoWallet();

  it("turns a CIP-30 hex address into the same bech32 address", () => {
    expect(normalizeAddress("cardano", w.hex)).toEqual({ ok: true, address: w.bech32 });
    expect(normalizeAddress("cardano", w.bech32)).toEqual({ ok: true, address: w.bech32 });
  });

  it("rejects testnet and garbage Cardano addresses", () => {
    const testnet = cardanoWallet(0);
    expect(normalizeAddress("cardano", testnet.bech32).ok).toBe(false);
    expect(normalizeAddress("cardano", testnet.hex).ok).toBe(false);
    expect(normalizeAddress("cardano", "addr1notreal").ok).toBe(false);
  });

  it("accepts a real Strike trader address", () => {
    const strike = "addr1qyhky3efqxgdcau6ll2ldcdq83jg5z6kkr7mdf0h7sd4e2y3x6vktdvqekhazmchqqt4cn6j7np0xrp7qktueejj0e4q0mn2ms";
    expect(normalizeAddress("cardano", strike)).toEqual({ ok: true, address: strike });
  });

  it("validates Solana and Ethereum shapes", () => {
    expect(normalizeAddress("solana", solanaWallet().address).ok).toBe(true);
    expect(normalizeAddress("solana", "abc").ok).toBe(false);
    expect(normalizeAddress("ethereum", "0xAbC0000000000000000000000000000000000001")).toEqual({
      ok: true,
      address: "0xabc0000000000000000000000000000000000001",
    });
  });
});

describe("buildMessage", () => {
  it("binds the domain, address, nonce and expiry", () => {
    const m = buildMessage({
      origin: "https://draft-week.vercel.app",
      chain: "cardano",
      address: "addr1xyz",
      nonce: "abc123",
      issuedAt: new Date("2026-10-21T20:00:00Z"),
      expiresAt: new Date("2026-10-21T20:05:00Z"),
    });
    expect(m.split("\n")[0]).toBe("draft-week.vercel.app wants you to sign in with your Cardano account:");
    expect(m).toContain("\naddr1xyz\n");
    expect(m).toContain("Nonce: abc123");
    expect(m).toContain("Expiration Time: 2026-10-21T20:05:00.000Z");
  });
});

describe("verifySignature", () => {
  const message = "draft-week.vercel.app wants you to sign in\nNonce: n1";

  it("accepts a Cardano CIP-30 signature and rejects tampering", () => {
    const w = cardanoWallet();
    const { signature, key } = w.signData(message);
    expect(verifySignature("cardano", { address: w.bech32, message, signature, key })).toBe(true);
    expect(verifySignature("cardano", { address: w.bech32, message: `${message}x`, signature, key })).toBe(false);
    expect(verifySignature("cardano", { address: cardanoWallet().bech32, message, signature, key })).toBe(false);
    expect(verifySignature("cardano", { address: w.bech32, message, signature })).toBe(false);
  });

  it("rejects a key that does not own the claimed address", () => {
    const w = cardanoWallet();
    const forged = w.signData(message, w.otherKey());
    expect(verifySignature("cardano", { address: w.bech32, message, ...forged })).toBe(false);
  });

  it("accepts a Solana signature and rejects tampering", () => {
    const s = solanaWallet();
    const signature = s.signMessage(message);
    expect(verifySignature("solana", { address: s.address, message, signature })).toBe(true);
    expect(verifySignature("solana", { address: solanaWallet().address, message, signature })).toBe(false);
  });

  it("treats malformed input as a failed sign-in, not a crash", () => {
    expect(verifySignature("cardano", { address: "addr1x", message, signature: "zz", key: "zz" })).toBe(false);
    expect(verifySignature("solana", { address: "notbase58!", message, signature: "x" })).toBe(false);
  });
});
