import type { FastifyInstance } from 'fastify'
import { prisma } from '@/config/prisma'
import { getRedis, isRedisAvailable } from '@/config/redis'
import { env } from '@/config/env'
import { healthCheckSchema } from '@/schemas/openapi.schema'

/**
 * Health check routes
 *
 * Provides comprehensive health status for:
 * - Database connectivity (PostgreSQL via Prisma)
 * - Redis cache availability (optional, non-blocking)
 * - External APIs (Stripe, Resend - optional)
 * - System metrics (uptime, memory, Node.js version)
 *
 * Useful for:
 * - Docker healthchecks
 * - Load balancer health probes
 * - Monitoring systems (Prometheus, Datadog)
 * - Status pages
 *
 * Endpoints:
 * - GET /health - Basic health (database only, fast)
 * - GET /health/detailed - Full health check (all services, slower)
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Basic health check
   * Only checks critical services (database)
   * Fast response (~10-50ms)
   */
  app.get('/health', { schema: healthCheckSchema }, async (request, reply) => {
    const checks = {
      database: false,
      redis: isRedisAvailable(), // Just check if connected, don't ping
    }

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.database = true
    } catch (error) {
      request.log.error({ error }, 'Database health check failed')
    }

    const healthy = checks.database // Only database is critical

    if (!healthy) {
      return reply.status(503).send({
        status: 'unhealthy',
        checks,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      })
    }

    return {
      status: 'ok',
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  })

  /**
   * Detailed health check
   * Checks all services including external APIs
   * Slower response (~100-500ms)
   */
  app.get('/health/detailed', async (request, reply) => {
    const checks = {
      database: { status: 'unknown' as 'ok' | 'error' | 'unknown', latency: 0 },
      redis: { status: 'unknown' as 'ok' | 'error' | 'unknown' | 'disabled', latency: 0 },
      stripe: { status: 'unknown' as 'ok' | 'error' | 'unknown' | 'disabled' },
      resend: { status: 'unknown' as 'ok' | 'error' | 'unknown' | 'disabled' },
    }

    // Check database
    try {
      const start = Date.now()
      await prisma.$queryRaw`SELECT 1`
      checks.database = { status: 'ok', latency: Date.now() - start }
    } catch (error) {
      request.log.error({ error }, 'Database health check failed')
      checks.database = { status: 'error', latency: 0 }
    }

    // Check Redis
    if (isRedisAvailable()) {
      try {
        const redis = getRedis()
        if (redis) {
          const start = Date.now()
          await redis.ping()
          checks.redis = { status: 'ok', latency: Date.now() - start }
        } else {
          checks.redis = { status: 'disabled', latency: 0 }
        }
      } catch (error) {
        request.log.error({ error }, 'Redis health check failed')
        checks.redis = { status: 'error', latency: 0 }
      }
    } else {
      checks.redis = { status: 'disabled', latency: 0 }
    }

    // Check Stripe (optional)
    if (env.STRIPE_SECRET_KEY) {
      try {
        // Just check if key is valid format, don't make actual API call
        // (to avoid rate limits and slow response)
        const isValidFormat = env.STRIPE_SECRET_KEY.startsWith('sk_')
        checks.stripe = { status: isValidFormat ? 'ok' : 'error' }
      } catch (error) {
        request.log.error({ error }, 'Stripe health check failed')
        checks.stripe = { status: 'error' }
      }
    } else {
      checks.stripe = { status: 'disabled' }
    }

    // Check Resend (optional)
    if (env.RESEND_API_KEY) {
      try {
        // Just check if key is valid format
        const isValidFormat = env.RESEND_API_KEY.startsWith('re_')
        checks.resend = { status: isValidFormat ? 'ok' : 'error' }
      } catch (error) {
        request.log.error({ error }, 'Resend health check failed')
        checks.resend = { status: 'error' }
      }
    } else {
      checks.resend = { status: 'disabled' }
    }

    // System metrics
    const memoryUsage = process.memoryUsage()
    const system = {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      },
      nodeVersion: process.version,
      environment: env.NODE_ENV,
    }

    // Overall health status
    const isCriticalHealthy = checks.database.status === 'ok'
    const hasWarnings =
      checks.redis.status === 'error' ||
      checks.stripe.status === 'error' ||
      checks.resend.status === 'error'

    const status = !isCriticalHealthy
      ? 'unhealthy'
      : hasWarnings
        ? 'degraded'
        : 'ok'

    if (!isCriticalHealthy) {
      return reply.status(503).send({
        status,
        checks,
        system,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      status,
      checks,
      system,
      timestamp: new Date().toISOString(),
    }
  })
}
