import { logger } from './logger'

/**
 * Security Event Logger (SEC-011)
 *
 * Centralized logging for security events with structured data
 * Provides audit trail for:
 * - Authentication failures
 * - Permission denials
 * - Rate limit violations
 * - Suspicious patterns
 * - Administrative actions
 *
 * All logs include:
 * - Event type (for filtering)
 * - Timestamp (ISO 8601)
 * - Request metadata (IP, user agent)
 * - Sanitized user data (no sensitive info)
 *
 * @example
 * ```typescript
 * import { securityLogger } from '@/utils/security-logger'
 *
 * // Log failed login
 * securityLogger.authFailure(email, request.ip, 'Invalid password')
 *
 * // Log permission denied
 * securityLogger.permissionDenied(userId, 'DELETE /api/notes/123', 'Not owner')
 * ```
 */

export interface SecurityEventContext {
  ip?: string
  userAgent?: string
  requestId?: string
  userId?: string
  email?: string
  resource?: string
  action?: string
  reason?: string
  metadata?: Record<string, unknown>
}

/**
 * Authentication Events
 */
export const securityLogger = {
  /**
   * Log successful authentication
   * Used for audit trail and analytics
   */
  authSuccess(context: SecurityEventContext): void {
    logger.info(
      {
        event: 'AUTH_SUCCESS',
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent,
        timestamp: new Date().toISOString(),
      },
      'User authenticated successfully'
    )
  },

  /**
   * Log authentication failure
   * Critical for detecting brute force attacks
   */
  authFailure(context: SecurityEventContext): void {
    logger.warn(
      {
        event: 'AUTH_FAILURE',
        email: context.email ? context.email.substring(0, 3) + '***' : undefined, // Partially hide email
        ip: context.ip,
        userAgent: context.userAgent,
        reason: context.reason,
        timestamp: new Date().toISOString(),
      },
      'Authentication failed'
    )
  },

  /**
   * Log account lockout
   * Indicates potential brute force attack
   */
  accountLocked(context: SecurityEventContext): void {
    logger.warn(
      {
        event: 'ACCOUNT_LOCKED',
        email: context.email ? context.email.substring(0, 3) + '***' : undefined,
        ip: context.ip,
        reason: context.reason || 'Too many failed login attempts',
        timestamp: new Date().toISOString(),
      },
      'Account temporarily locked'
    )
  },

  /**
   * Authorization Events
   */

  /**
   * Log permission denied (403)
   * Indicates potential unauthorized access attempt
   */
  permissionDenied(context: SecurityEventContext): void {
    logger.warn(
      {
        event: 'PERMISSION_DENIED',
        userId: context.userId,
        resource: context.resource,
        action: context.action,
        reason: context.reason,
        ip: context.ip,
        timestamp: new Date().toISOString(),
      },
      'Permission denied'
    )
  },

  /**
   * Log ownership verification failure
   * Critical for detecting IDOR attempts
   */
  ownershipViolation(context: SecurityEventContext): void {
    logger.warn(
      {
        event: 'OWNERSHIP_VIOLATION',
        userId: context.userId,
        resource: context.resource,
        action: context.action,
        ip: context.ip,
        timestamp: new Date().toISOString(),
      },
      'User attempted to access resource they do not own'
    )
  },

  /**
   * Rate Limiting Events
   */

  /**
   * Log rate limit exceeded
   * Indicates potential DoS attack or abuse
   */
  rateLimitExceeded(context: SecurityEventContext): void {
    logger.warn(
      {
        event: 'RATE_LIMIT_EXCEEDED',
        identifier: context.userId || context.ip,
        endpoint: context.resource,
        ip: context.ip,
        userAgent: context.userAgent,
        timestamp: new Date().toISOString(),
      },
      'Rate limit exceeded'
    )
  },

  /**
   * Administrative Events
   */

  /**
   * Log admin action
   * Critical for compliance and audit requirements
   */
  adminAction(context: SecurityEventContext): void {
    logger.info(
      {
        event: 'ADMIN_ACTION',
        adminId: context.userId,
        action: context.action,
        targetUserId: context.metadata?.targetUserId,
        reason: context.reason,
        timestamp: new Date().toISOString(),
      },
      'Admin action performed'
    )
  },

  /**
   * Log role change
   * High-risk operation requiring audit trail
   */
  roleChanged(context: SecurityEventContext): void {
    logger.info(
      {
        event: 'ROLE_CHANGED',
        adminId: context.userId,
        targetUserId: context.metadata?.targetUserId,
        oldRole: context.metadata?.oldRole,
        newRole: context.metadata?.newRole,
        timestamp: new Date().toISOString(),
      },
      'User role changed'
    )
  },

  /**
   * Sensitive Operations
   */

  /**
   * Log password change
   * Required for security compliance
   */
  passwordChanged(context: SecurityEventContext): void {
    logger.info(
      {
        event: 'PASSWORD_CHANGED',
        userId: context.userId,
        ip: context.ip,
        initiatedBy: context.metadata?.initiatedBy || 'user', // 'user' or 'admin' or 'reset'
        timestamp: new Date().toISOString(),
      },
      'Password changed'
    )
  },

  /**
   * Log email change
   * High-risk operation requiring audit trail
   */
  emailChanged(context: SecurityEventContext): void {
    logger.info(
      {
        event: 'EMAIL_CHANGED',
        userId: context.userId,
        oldEmail: context.metadata?.oldEmail
          ? String(context.metadata.oldEmail).substring(0, 3) + '***'
          : undefined,
        newEmail: context.email ? context.email.substring(0, 3) + '***' : undefined,
        ip: context.ip,
        timestamp: new Date().toISOString(),
      },
      'Email address changed'
    )
  },

  /**
   * Log GDPR data export
   * Compliance requirement
   */
  gdprDataExport(context: SecurityEventContext): void {
    logger.info(
      {
        event: 'GDPR_DATA_EXPORT',
        userId: context.userId,
        ip: context.ip,
        timestamp: new Date().toISOString(),
      },
      'User data exported (GDPR)'
    )
  },

  /**
   * Log GDPR data deletion
   * Critical compliance event
   */
  gdprDataDeletion(context: SecurityEventContext): void {
    logger.info(
      {
        event: 'GDPR_DATA_DELETION',
        userId: context.userId,
        ip: context.ip,
        reason: context.reason,
        timestamp: new Date().toISOString(),
      },
      'User data deleted (GDPR)'
    )
  },

  /**
   * Log GDPR data anonymization
   * Alternative to deletion for GDPR compliance
   */
  gdprDataAnonymization(context: SecurityEventContext): void {
    logger.info(
      {
        event: 'GDPR_DATA_ANONYMIZATION',
        userId: context.userId,
        ip: context.ip,
        timestamp: new Date().toISOString(),
      },
      'User data anonymized (GDPR)'
    )
  },

  /**
   * Suspicious Activity Detection
   */

  /**
   * Log suspicious pattern detected
   * Requires investigation
   */
  suspiciousActivity(context: SecurityEventContext): void {
    logger.warn(
      {
        event: 'SUSPICIOUS_ACTIVITY',
        userId: context.userId,
        ip: context.ip,
        pattern: context.reason,
        metadata: context.metadata,
        timestamp: new Date().toISOString(),
      },
      'Suspicious activity detected'
    )
  },

  /**
   * Log multiple failed attempts from same IP
   * Potential brute force attack
   */
  bruteForceAttempt(context: SecurityEventContext): void {
    logger.warn(
      {
        event: 'BRUTE_FORCE_ATTEMPT',
        ip: context.ip,
        target: context.resource,
        attemptCount: context.metadata?.attemptCount,
        timeWindow: context.metadata?.timeWindow,
        timestamp: new Date().toISOString(),
      },
      'Potential brute force attack detected'
    )
  },

  /**
   * Token Management Events
   */

  /**
   * Log token invalidation
   * Required for session management audit
   */
  tokenInvalidated(context: SecurityEventContext): void {
    logger.info(
      {
        event: 'TOKEN_INVALIDATED',
        userId: context.userId,
        tokenType: context.metadata?.tokenType, // 'access', 'refresh', 'csrf', 'reset'
        reason: context.reason,
        timestamp: new Date().toISOString(),
      },
      'Token invalidated'
    )
  },

  /**
   * Log CSRF token rotation
   * Security enhancement tracking
   */
  csrfTokenRotated(context: SecurityEventContext): void {
    logger.info(
      {
        event: 'CSRF_TOKEN_ROTATED',
        userId: context.userId,
        reason: context.reason,
        timestamp: new Date().toISOString(),
      },
      'CSRF token rotated after sensitive operation'
    )
  },
}
