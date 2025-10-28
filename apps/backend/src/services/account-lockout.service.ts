import { CacheService } from './cache.service'
import { securityLogger } from '@/utils/security-logger'

/**
 * Account Lockout Service (SEC-015, SEC-020)
 *
 * Implements progressive backoff for failed login attempts:
 * - 1-3 failures: No delay
 * - 4-6 failures: 1 minute lockout
 * - 7-9 failures: 5 minutes lockout
 * - 10+ failures: 15 minutes lockout
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
    { attempts: 3, lockoutMinutes: 0 }, // 1-3: No lockout
    { attempts: 6, lockoutMinutes: 1 }, // 4-6: 1 minute
    { attempts: 9, lockoutMinutes: 5 }, // 7-9: 5 minutes
    { attempts: Infinity, lockoutMinutes: 15 }, // 10+: 15 minutes
  ]

  private static readonly MAX_ATTEMPTS_BEFORE_PERMANENT = 20 // After 20 attempts, lock for 24h
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
      throw new Error(
        `Account temporarily locked. Too many failed login attempts. Try again at ${emailLockout.unlockAt?.toISOString()}`
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
      throw new Error(
        `Too many failed login attempts from your IP. Try again at ${ipLockout.unlockAt?.toISOString()}`
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
    await CacheService.set(
      key,
      { attempts, lockedUntil: data?.lockedUntil },
      24 * 60 * 60
    )

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
      const unlockAt = new Date(
        Date.now() + this.PERMANENT_LOCKOUT_HOURS * 60 * 60 * 1000
      )
      await CacheService.set(
        key,
        { attempts, lockedUntil: unlockAt.toISOString() },
        this.PERMANENT_LOCKOUT_HOURS * 60 * 60
      )

      securityLogger.accountLocked({
        email,
        ip,
        reason: `Permanent lockout (24h) after ${attempts} failed attempts`,
      })
      return
    }

    // Find appropriate lockout threshold
    const threshold = this.LOCKOUT_THRESHOLDS.find(
      (t) => attempts <= t.attempts
    )

    if (!threshold || threshold.lockoutMinutes === 0) {
      return // No lockout yet
    }

    // Calculate unlock time
    const unlockAt = new Date(Date.now() + threshold.lockoutMinutes * 60 * 1000)

    // Store lockout
    await CacheService.set(
      key,
      { attempts, lockedUntil: unlockAt.toISOString() },
      threshold.lockoutMinutes * 60
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
    const nextThreshold = this.LOCKOUT_THRESHOLDS.find(
      (t) => status.attempts < t.attempts
    )

    if (!nextThreshold) {
      return 0
    }

    return nextThreshold.attempts - status.attempts
  }

  /**
   * Admin function: Manually unlock an account
   */
  static async unlockAccount(
    email: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    await CacheService.delete(`lockout:email:${email}`)

    securityLogger.adminAction({
      userId: adminId,
      action: 'UNLOCK_ACCOUNT',
      metadata: { targetEmail: email },
      reason,
    })
  }
}
