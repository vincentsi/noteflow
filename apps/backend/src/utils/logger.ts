import type { FastifyRequest } from 'fastify'
import pino from 'pino'

/**
 * Global Pino logger for services and background tasks
 *
 * Use this when you don't have access to request.log:
 * - Background jobs (cron, cleanup)
 * - Services called outside HTTP context
 * - Startup/shutdown logs
 *
 * For HTTP requests, prefer request.log for automatic context
 */

// Safe env access for tests (process.env might not have validated env object)
const nodeEnv = process.env.NODE_ENV || 'development'

/**
 * Sanitize sensitive data in logs
 * Masks emails, passwords, tokens, API keys, IPs
 */
function sanitizeLogData(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeLogData)
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()

    // Mask sensitive fields
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('api_key')
    ) {
      sanitized[key] = '[REDACTED]'
    } else if (lowerKey.includes('email') && typeof value === 'string') {
      // Mask email: user@example.com -> u***@example.com
      sanitized[key] = value.replace(/^(.{1}).*?(@.*)$/, '$1***$2')
    } else if (lowerKey === 'ip' && typeof value === 'string') {
      // Mask IP: 192.168.1.100 -> 192.168.***.***
      sanitized[key] = value.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.***.***')
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

export const logger = pino({
  level: nodeEnv === 'production' ? 'info' : 'debug',
  // Sanitize logs in production to prevent data leaks
  serializers: {
    ...pino.stdSerializers,
    // Custom serializers for sensitive data
    req: req => {
      const sanitized = pino.stdSerializers.req(req)
      // Don't log authorization headers
      if (sanitized.headers) {
        delete sanitized.headers.authorization
        delete sanitized.headers.cookie
      }
      return sanitized
    },
    // Sanitize any object passed to logger
    ...(nodeEnv === 'production'
      ? {
          err: pino.stdSerializers.err,
          // Apply sanitization to all logged data in production
        }
      : {}),
  },
  transport:
    nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  // Redact sensitive fields automatically
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'api_key',
      'secret',
      'authorization',
      'cookie',
      '*.password',
      '*.token',
      '*.secret',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true, // Remove sensitive fields entirely
  },
})

/**
 * Sanitize and log sensitive data safely
 * Use this when logging objects that might contain emails, IPs, or other PII
 */
export function logSanitized(
  level: 'debug' | 'info' | 'warn' | 'error',
  data: Record<string, unknown>,
  message: string
) {
  const sanitized = sanitizeLogData(data)
  logger[level](sanitized, message)
}

/**
 * Structured logging helpers for consistent log format
 * Uses Pino (Fastify's built-in logger)
 *
 * Why structured logging?
 * - Easy to parse and query logs
 * - Better observability in production
 * - Consistent format across the app
 * - Works with log aggregation tools (ELK, Datadog, etc.)
 */

/**
 * Common log context from request
 */
export function getRequestContext(request: FastifyRequest) {
  return {
    requestId: request.id,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    userId: request.user?.userId,
  }
}

/**
 * Log user action with context
 */
export function logUserAction(
  request: FastifyRequest,
  action: string,
  metadata?: Record<string, unknown>
) {
  request.log.info(
    {
      ...getRequestContext(request),
      action,
      ...metadata,
    },
    `User action: ${action}`
  )
}

/**
 * Log authentication event
 */
export function logAuthEvent(
  request: FastifyRequest,
  event: 'login' | 'register' | 'logout' | 'refresh' | 'password_reset',
  metadata?: Record<string, unknown>
) {
  request.log.info(
    {
      ...getRequestContext(request),
      event: `auth.${event}`,
      ...metadata,
    },
    `Authentication event: ${event}`
  )
}

/**
 * Log API error with context
 */
export function logApiError(
  request: FastifyRequest,
  error: Error,
  metadata?: Record<string, unknown>
) {
  request.log.error(
    {
      ...getRequestContext(request),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...metadata,
    },
    `API error: ${error.message}`
  )
}

/**
 * Log security event (suspicious activity)
 */
export function logSecurityEvent(
  request: FastifyRequest,
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, unknown>
) {
  const logFn = severity === 'critical' || severity === 'high' ? request.log.warn : request.log.info

  logFn(
    {
      ...getRequestContext(request),
      security: true,
      severity,
      event,
      ...metadata,
    },
    `Security event: ${event}`
  )
}

/**
 * Log payment/subscription event
 */
export function logPaymentEvent(
  request: FastifyRequest,
  event: string,
  metadata?: Record<string, unknown>
) {
  request.log.info(
    {
      ...getRequestContext(request),
      payment: true,
      event,
      ...metadata,
    },
    `Payment event: ${event}`
  )
}

/**
 * Log performance metrics
 */
export function logPerformance(
  request: FastifyRequest,
  operation: string,
  durationMs: number,
  metadata?: Record<string, unknown>
) {
  const logFn = durationMs > 1000 ? request.log.warn : request.log.info

  logFn(
    {
      ...getRequestContext(request),
      performance: true,
      operation,
      durationMs,
      ...metadata,
    },
    `Performance: ${operation} took ${durationMs}ms`
  )
}

/**
 * Log database query (for debugging slow queries)
 */
export function logDatabaseQuery(
  request: FastifyRequest,
  query: string,
  durationMs: number,
  metadata?: Record<string, unknown>
) {
  const logFn = durationMs > 100 ? request.log.warn : request.log.debug

  logFn(
    {
      ...getRequestContext(request),
      database: true,
      query,
      durationMs,
      ...metadata,
    },
    `Database query took ${durationMs}ms`
  )
}

/**
 * Log cache hit/miss
 */
export function logCacheEvent(
  request: FastifyRequest,
  event: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  metadata?: Record<string, unknown>
) {
  request.log.debug(
    {
      ...getRequestContext(request),
      cache: true,
      event,
      key,
      ...metadata,
    },
    `Cache ${event}: ${key}`
  )
}

/**
 * Type-safe log levels
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel]
