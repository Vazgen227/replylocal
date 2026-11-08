import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { AppError } from "./errors";
function key() {
  const raw = process.env.CHANNEL_ENCRYPTION_KEY ?? "";
  const value = Buffer.from(raw, "base64");
  if (value.length !== 32 || value.toString("base64") !== raw)
    throw new AppError(503, "ENCRYPTION_NOT_CONFIGURED");
  return value;
}
export function seal(value: unknown, aad: string) {
  const nonce = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), nonce);
  cipher.setAAD(Buffer.from(aad));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [nonce, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString("base64"))
    .join(".");
}
export function unseal<T>(value: string, aad: string): T {
  const [nonce, tag, data] = value
    .split(".")
    .map((s) => Buffer.from(s, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), nonce);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([decipher.update(data), decipher.final()]).toString(),
  );
}
export function equalSecret(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function validHmac(raw: string, secret: string, signature: string) {
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  return (
    /^[a-f0-9]{64}$/i.test(signature) &&
    equalSecret(expected, signature.toLowerCase())
  );
}
export async function rawBody(request: Request, limit = 262144) {
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new AppError(413, "BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
