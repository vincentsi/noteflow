import { CacheService } from './cache.service'
import { securityLogger } from '@/utils/security-logger'

/**
 * Account Lockout Service (SEC-015, SEC-020)
 *
 * Implements progressive backoff for failed login attempts:
 * - 1-5 failures: No delay
 * - 6-10 failures: 2 minute lockout
 * - 11-15 failures: 10 minutes lockout
 * - 16-29 failures: 30 minutes lockout
 * - 30+ failures: 24 hours lockout
 *
 * Uses both email and IP-based tracking to prevent:
 * - Brute force attacks on specific accounts
 * - Distributed attacks from single IP
 *
 * @example
 * ```typescript
 * // Before login attempt
 * await AccountLockoutService.checkLockout(email, ip)
 *
 * // After failed attempt
 * await AccountLockoutService.recordFailedAttempt(email, ip)
 *
 * // After successful login
 * await AccountLockoutService.resetAttempts(email, ip)
 * ```
 */
export class AccountLockoutService {
  private static readonly LOCKOUT_THRESHOLDS = [
    { attempts: 5, lockoutMinutes: 0 }, // 1-5: No lockout
    { attempts: 10, lockoutMinutes: 2 }, // 6-10: 2 minutes
    { attempts: 15, lockoutMinutes: 10 }, // 11-15: 10 minutes
    { attempts: Infinity, lockoutMinutes: 30 }, // 16+: 30 minutes
  ]

  private static readonly MAX_ATTEMPTS_BEFORE_PERMANENT = 30 // After 30 attempts, lock for 24h
  private static readonly PERMANENT_LOCKOUT_HOURS = 24

  /**
   * Check if account or IP is locked out
   * @throws Error if locked out with retry time
   */
  static async checkLockout(email: string, ip: string): Promise<void> {
    // Check email-based lockout
    const emailLockout = await this.getLockoutStatus(`lockout:email:${email}`)
    if (emailLockout.isLocked) {
      securityLogger.accountLocked({
        email,
        ip,
        reason: `Too many failed attempts from this account. Locked until ${emailLockout.unlockAt?.toISOString()}`,
      })
      //Do not expose exact unlock time to prevent timing attacks
      throw new Error(
        'Too many failed login attempts. Please try again later or reset your password.'
      )
    }

    // Check IP-based lockout
    const ipLockout = await this.getLockoutStatus(`lockout:ip:${ip}`)
    if (ipLockout.isLocked) {
      securityLogger.accountLocked({
        email,
        ip,
        reason: `Too many failed attempts from this IP. Locked until ${ipLockout.unlockAt?.toISOString()}`,
      })
      //Do not expose exact unlock time to prevent timing attacks
      throw new Error(
        'Too many failed login attempts. Please try again later or reset your password.'
      )
    }
  }

  /**
   * Record a failed login attempt
   * Implements progressive backoff
   */
  static async recordFailedAttempt(email: string, ip: string): Promise<void> {
    const emailKey = `lockout:email:${email}`
    const ipKey = `lockout:ip:${ip}`

    // Increment counters
    const emailAttempts = await this.incrementAttempts(emailKey)
    const ipAttempts = await this.incrementAttempts(ipKey)

    // Apply lockout if threshold exceeded
    await this.applyLockout(emailKey, emailAttempts, email, ip)
    await this.applyLockout(ipKey, ipAttempts, email, ip)

    // Log the failed attempt
    securityLogger.authFailure({
      email,
      ip,
      reason: `Failed login attempt (${emailAttempts} from email, ${ipAttempts} from IP)`,
    })
  }

  /**
   * Reset attempts after successful login
   */
  static async resetAttempts(email: string, ip: string): Promise<void> {
    await CacheService.delete(`lockout:email:${email}`)
    await CacheService.delete(`lockout:ip:${ip}`)
  }

  /**
   * Get lockout status for a key
   */
  private static async getLockoutStatus(
    key: string
  ): Promise<{ isLocked: boolean; unlockAt: Date | null; attempts: number }> {
    const data = await CacheService.get<{
      attempts: number
      lockedUntil: string
    }>(key)

    if (!data) {
      return { isLocked: false, unlockAt: null, attempts: 0 }
    }

    const lockedUntil = data.lockedUntil ? new Date(data.lockedUntil) : null
    const isLocked = lockedUntil ? lockedUntil > new Date() : false

    return {
      isLocked,
      unlockAt: lockedUntil,
      attempts: data.attempts || 0,
    }
  }

  /**
   * Increment attempt counter
   * Returns new attempt count
   */
  private static async incrementAttempts(key: string): Promise<number> {
    const data = await CacheService.get<{
      attempts: number
      lockedUntil?: string
    }>(key)

    const attempts = (data?.attempts || 0) + 1

    // Store attempts with 24h TTL (resets after 1 day of inactivity)
    await CacheService.set(key, { attempts, lockedUntil: data?.lockedUntil }, 24 * 60 * 60)

    return attempts
  }

  /**
   * Apply progressive lockout based on attempt count
   */
  private static async applyLockout(
    key: string,
    attempts: number,
    email: string,
    ip: string
  ): Promise<void> {
    // Permanent lockout after too many attempts
    if (attempts >= this.MAX_ATTEMPTS_BEFORE_PERMANENT) {
      // SEC-009: Add jitter to prevent timing analysis attacks
      const jitter = Math.random() * 5 * 60 * 1000 // 0-5 minutes random jitter
      const unlockAt = new Date(Date.now() + this.PERMANENT_LOCKOUT_HOURS * 60 * 60 * 1000 + jitter)
      await CacheService.set(
        key,
        { attempts, lockedUntil: unlockAt.toISOString() },
        this.PERMANENT_LOCKOUT_HOURS * 60 * 60 + Math.ceil(jitter / 1000)
      )

      securityLogger.accountLocked({
        email,
        ip,
        reason: `Permanent lockout (24h) after ${attempts} failed attempts`,
      })
      return
    }

    // Find appropriate lockout threshold
    const threshold = this.LOCKOUT_THRESHOLDS.find(t => attempts <= t.attempts)

    if (!threshold || threshold.lockoutMinutes === 0) {
      return // No lockout yet
    }

    // SEC-009: Add jitter (0-60 seconds) to prevent timing analysis attacks
    // Prevents attackers from determining exact lockout thresholds
    const jitterSeconds = Math.floor(Math.random() * 60) // 0-60 seconds
    const jitterMs = jitterSeconds * 1000

    // Calculate unlock time with jitter
    const unlockAt = new Date(Date.now() + threshold.lockoutMinutes * 60 * 1000 + jitterMs)

    // Store lockout
    await CacheService.set(
      key,
      { attempts, lockedUntil: unlockAt.toISOString() },
      threshold.lockoutMinutes * 60 + jitterSeconds
    )

    securityLogger.accountLocked({
      email,
      ip,
      reason: `Account locked for ${threshold.lockoutMinutes} minute(s) after ${attempts} failed attempts`,
    })
  }

  /**
   * Get remaining attempts before lockout
   * Useful for warning users
   */
  static async getRemainingAttempts(email: string): Promise<number> {
    const status = await this.getLockoutStatus(`lockout:email:${email}`)

    if (status.isLocked) {
      return 0
    }

    // Find next threshold
    const nextThreshold = this.LOCKOUT_THRESHOLDS.find(t => status.attempts < t.attempts)

    if (!nextThreshold) {
      return 0
    }

    return nextThreshold.attempts - status.attempts
  }

  /**
   * Admin function: Manually unlock an account
   */
  static async unlockAccount(email: string, adminId: string, reason: string): Promise<void> {
    await CacheService.delete(`lockout:email:${email}`)

    securityLogger.adminAction({
      userId: adminId,
      action: 'UNLOCK_ACCOUNT',
      metadata: { targetEmail: email },
      reason,
    })
  }
}
