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

export const logger = pino({
  level: nodeEnv === 'production' ? 'info' : 'debug',
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
})

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
