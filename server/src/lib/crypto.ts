import crypto from "crypto";

// Encrypts secrets (a user's GitHub token) before they are stored. AES-256-GCM, so tampering is detected.
// The key comes from ENCRYPTION_KEY, or from JWT_SECRET when that is not set.
function key(): Buffer {
  const s = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-me");
  if (!s) throw new Error("Set ENCRYPTION_KEY or JWT_SECRET to store GitHub tokens.");
  return crypto.createHash("sha256").update(s).digest();
}

export function seal(text: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

// Returns null when the value is damaged or the key has changed since it was saved.
export function unseal(blob: string): string | null {
  try {
    const [iv, tag, enc] = String(blob).split(".").map((s) => Buffer.from(s, "base64"));
    const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
