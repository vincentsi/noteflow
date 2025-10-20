import { FastifyRequest, FastifyReply } from 'fastify'
import {
  register,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client'

// Extend FastifyRequest to include metrics metadata
interface MetricsRequest extends FastifyRequest {
  startTime?: number
}

/**
 * Prometheus Metrics Middleware
 *
 * Production-grade monitoring with Prometheus metrics:
 * - HTTP request duration histogram (with percentiles)
 * - HTTP request counter (by method, route, status)
 * - Active requests gauge (current load)
 * - Slow query detection (>100ms warning logs)
 * - Cache hit/miss ratio metrics
 * - Default Node.js metrics (memory, CPU, event loop, etc.)
 *
 * @ai-prompt When modifying metrics:
 * - ALWAYS use histograms for durations (not gauges)
 * - Buckets should cover expected response times (10ms to 10s)
 * - Labels MUST be low cardinality (no user IDs, emails, tokens)
 * - Method, route, status_code are safe labels
 * - Slow query threshold: 100ms (configurable)
 * - Cache metrics track hit/miss ratio
 * - Default metrics include: process_cpu, nodejs_heap_size, nodejs_eventloop_lag
 * - /metrics endpoint exposes all metrics (scrape target for Prometheus)
 * - Consider adding custom business metrics (registrations, logins, payments)
 *
 * @example
 * ```typescript
 * // In app.ts
 * import { metricsMiddleware, getMetrics } from '@/middlewares/metrics.middleware'
 *
 * // Register middleware globally
 * app.addHook('onRequest', metricsMiddleware)
 *
 * // Expose metrics endpoint
 * app.get('/metrics', async (req, reply) => {
 *   reply.header('Content-Type', register.contentType)
 *   return getMetrics()
 * })
 * ```
 *
 * @example
 * ```yaml
 * # Prometheus scrape config
 * scrape_configs:
 *   - job_name: 'nodejs-backend'
 *     static_configs:
 *       - targets: ['localhost:3001']
 *     metrics_path: /metrics
 *     scrape_interval: 15s
 * ```
 */

// Enable default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register })

// HTTP Request Duration Histogram
// Buckets: 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
})

// HTTP Request Counter
const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
})

// Active Requests Gauge (current load)
const httpActiveRequests = new Gauge({
  name: 'http_active_requests',
  help: 'Number of HTTP requests currently being processed',
})

// Cache Metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_key_prefix'],
})

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_key_prefix'],
})

import { env } from '@/config/env'

// Slow Query Threshold (configurable)
const SLOW_QUERY_THRESHOLD_MS = Number(env.SLOW_QUERY_THRESHOLD)

/**
 * Metrics middleware for Fastify (onRequest hook)
 * Increments active requests counter
 */
export async function metricsMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  // Store start time in request context
  ;(request as MetricsRequest).startTime = Date.now()

  // Increment active requests
  httpActiveRequests.inc()
}

/**
 * Metrics response hook for Fastify (onResponse hook)
 * Records request duration and count
 */
export async function metricsResponseHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const start = (request as MetricsRequest).startTime || Date.now()
  const duration = Date.now() - start
  const statusCode = reply.statusCode.toString()
  const method = request.method
  const route = request.routeOptions?.url || request.url

  // Normalize route (remove IDs for low cardinality)
  const normalizedRoute = normalizeRoute(route)

  // Record metrics
  httpRequestDuration.labels(method, normalizedRoute, statusCode).observe(duration)
  httpRequestTotal.labels(method, normalizedRoute, statusCode).inc()
  httpActiveRequests.dec()

  // Slow query detection
  if (duration > SLOW_QUERY_THRESHOLD_MS) {
    request.log.warn(
      {
        method,
        route: normalizedRoute,
        duration,
        statusCode,
        threshold: SLOW_QUERY_THRESHOLD_MS,
      },
      `⚠️  Slow request detected (${duration}ms)`
    )
  }
}

/**
 * Normalize route to prevent high cardinality
 * Replaces dynamic segments with placeholders
 *
 * Examples:
 * - /api/users/123 → /api/users/:id
 * - /api/posts/abc-def-ghi → /api/posts/:id
 * - /api/auth/me → /api/auth/me (no change)
 */
function normalizeRoute(route: string): string {
  return route
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUIDs
    .replace(/\/[0-9]+/g, '/:id') // Numeric IDs
    .replace(/\/[a-z0-9]{20,}/gi, '/:id') // Long alphanumeric IDs (tokens, etc.)
}

/**
 * Get all metrics in Prometheus format
 * Used by /metrics endpoint
 */
export async function getMetrics(): Promise<string> {
  return register.metrics()
}

/**
 * Get metrics registry (for custom metrics)
 */
export { register }

/**
 * Record cache hit
 * @param cacheKeyPrefix - Prefix of cache key (e.g., 'user', 'subscription')
 */
export function recordCacheHit(cacheKeyPrefix: string): void {
  cacheHits.labels(cacheKeyPrefix).inc()
}

/**
 * Record cache miss
 * @param cacheKeyPrefix - Prefix of cache key (e.g., 'user', 'subscription')
 */
export function recordCacheMiss(cacheKeyPrefix: string): void {
  cacheMisses.labels(cacheKeyPrefix).inc()
}
