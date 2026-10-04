import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64,
    { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
    (error, result) => error ? reject(error) : resolve(result)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt);
  return `scrypt-v1:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hash] = stored.split(':');
  if (algorithm !== 'scrypt-v1' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(hash ?? '')) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(hash, 'hex'));
}
// Same expensive operation for unknown accounts; this is not an account credential.
export const dummyHash = `scrypt-v1:${'0'.repeat(32)}:${'0'.repeat(128)}`;
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
