import crypto from 'crypto';

/**
 * Generates a cryptographically secure random token
 * Used for email verification and password reset links
 */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Generates a secure UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hashes a token using SHA-256 before storing in DB
 * The raw token is sent to the user; only the hash is stored.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compares a raw token with a stored hash (constant-time comparison)
 */
export function compareTokenHash(rawToken: string, storedHash: string): boolean {
  const hash = hashToken(rawToken);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

/**
 * Generates a complaint ID in the format: PREFIX-YYYY-XXXX
 * e.g., JANSEVA-2026-1245 or WTR-2026-7834
 */
export function generateComplaintId(prefix: string): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `${prefix}-${year}-${randomPart}`;
}

/**
 * Generates a citizen ID in the format: CIT-YYYY-XXXXXXXX
 */
export function generateCitizenId(): string {
  const year = new Date().getFullYear();
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CIT-${year}-${randomPart}`;
}
