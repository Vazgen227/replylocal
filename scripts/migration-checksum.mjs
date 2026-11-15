import { createHash } from 'node:crypto';

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/**
 * Checksum stored for newly applied migrations. Line endings are normalized to LF so the
 * same migration has one checksum whether it was checked out on Windows (CRLF) or Linux (LF).
 */
export function migrationChecksum(sql) {
  return sha256(sql.replace(/\r\n/g, '\n'));
}

/**
 * True when an already applied migration still has the same content. Earlier versions stored
 * the checksum of the raw file bytes, so a row may hold either the LF or the CRLF variant.
 * Any change other than line endings is still rejected.
 */
export function sameMigration(storedChecksum, sql) {
  const lf = sql.replace(/\r\n/g, '\n');
  return [sha256(lf), sha256(lf.replace(/\n/g, '\r\n'))].includes(storedChecksum);
}
