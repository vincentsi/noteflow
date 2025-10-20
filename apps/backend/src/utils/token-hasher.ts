import { createHash } from 'crypto'

/**
 * Token Hashing Utility
 *
 * Security: All tokens must be hashed before storing in database
 * - Prevents token theft if database is compromised
 * - Uses SHA-256 (one-way hash, cannot be reversed)
 * - Fast hashing (~0.1ms per token)
 *
 * Usage:
 * - Store: hashToken(token) -> save hash to DB
 * - Verify: hashToken(incomingToken) -> compare with DB hash
 */
export class TokenHasher {
  /**
   * Hash a token using SHA-256
   * @param token - Plain text token
   * @returns Hashed token (64 hex characters)
   */
  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  /**
   * Verify a token against its hash
   * @param token - Plain text token to verify
   * @param hash - Stored hash from database
   * @returns true if token matches hash
   */
  static verify(token: string, hash: string): boolean {
    const tokenHash = this.hash(token)
    return tokenHash === hash
  }
}
