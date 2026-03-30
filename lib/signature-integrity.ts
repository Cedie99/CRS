import { createHmac, createHash, timingSafeEqual } from "crypto";

/**
 * Compute an HMAC-SHA256 seal that binds:
 *   - which CIS record (cisId)
 *   - exactly when it was signed (signedAt ISO string)
 *   - the full PNG data (dataUrl)
 *   - the server secret (SIGNATURE_HMAC_SECRET)
 *
 * If any of these four inputs change, the seal becomes invalid.
 */
export function computeSeal(cisId: string, signedAt: Date, dataUrl: string): string {
  const secret = process.env.SIGNATURE_HMAC_SECRET;
  if (!secret) throw new Error("SIGNATURE_HMAC_SECRET is not set");
  const payload = [cisId, signedAt.toISOString(), dataUrl].join("|");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Constant-time seal verification.
 * Returns false if the seal is missing, malformed, or doesn't match.
 */
export function verifySeal(
  cisId: string,
  signedAt: Date,
  dataUrl: string,
  seal: string
): boolean {
  try {
    const expected = Buffer.from(computeSeal(cisId, signedAt, dataUrl), "hex");
    const actual = Buffer.from(seal, "hex");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/**
 * Full SHA-256 hex of the signature PNG.
 * Stored in the append-only audit log so tampering with the DB
 * column can be detected even without the server secret.
 */
export function sha256Fingerprint(dataUrl: string): string {
  return createHash("sha256").update(dataUrl).digest("hex");
}

/**
 * Short display fingerprint — first 16 hex chars in 4-char groups.
 * e.g. "a3f9 c1b2 d4e5 f678"
 */
export function displayFingerprint(dataUrl: string): string {
  const full = sha256Fingerprint(dataUrl);
  return full.slice(0, 16).match(/.{4}/g)!.join(" ");
}
