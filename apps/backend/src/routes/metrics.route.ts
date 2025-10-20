import { FastifyInstance } from 'fastify'
import { getMetrics, register } from '@/middlewares/metrics.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { requireRole } from '@/middlewares/rbac.middleware'
import { requireIPWhitelist } from '@/middlewares/ip-whitelist.middleware'

/**
 * Metrics Route
 *
 * Exposes Prometheus metrics for monitoring and alerting.
 * This endpoint is typically scraped by Prometheus every 15-30 seconds.
 *
 * **Security:**
 * - Protected by IP whitelisting (METRICS_ALLOWED_IPS env var)
 * - Protected by ADMIN role authentication
 * - Only administrators from whitelisted IPs can access metrics
 * - If METRICS_ALLOWED_IPS is empty, all IPs are allowed (dev mode)
 *
 * **Available Metrics:**
 * - `http_request_duration_ms` - HTTP request duration histogram (percentiles: p50, p95, p99)
 * - `http_requests_total` - Total HTTP requests counter (by method, route, status)
 * - `http_active_requests` - Currently active HTTP requests gauge
 * - `cache_hits_total` - Total cache hits counter (by cache key prefix)
 * - `cache_misses_total` - Total cache misses counter (by cache key prefix)
 * - `process_cpu_*` - CPU usage metrics
 * - `nodejs_heap_*` - Memory heap metrics
 * - `nodejs_eventloop_lag_*` - Event loop lag metrics
 *
 * @ai-prompt When modifying metrics endpoint:
 * - Endpoint is now protected by ADMIN role (prevents info disclosure)
 * - For Prometheus scraping, configure auth header in prometheus.yml:
 *   ```yaml
 *   scrape_configs:
 *     - job_name: 'nodejs-backend'
 *       authorization:
 *         type: Bearer
 *         credentials: <ADMIN_JWT_TOKEN>
 *   ```
 * - Alternative: Use IP whitelisting at reverse proxy level
 * - Content-Type MUST be text/plain;version=0.0.4 (Prometheus format)
 * - Endpoint should return quickly (<100ms)
 * - Metrics contain no sensitive data (no user IDs, emails, tokens in labels)
 * - Add custom business metrics via register.registerMetric()
 *
 * @example
 * ```bash
 * # Fetch metrics (requires admin JWT token)
 * curl -H "Cookie: accessToken=<ADMIN_JWT>" http://localhost:3001/metrics
 *
 * # Example output:
 * # HELP http_requests_total Total number of HTTP requests
 * # TYPE http_requests_total counter
 * http_requests_total{method="GET",route="/api/auth/me",status_code="200"} 156
 * http_requests_total{method="POST",route="/api/auth/login",status_code="200"} 42
 *
 * # HELP http_request_duration_ms Duration of HTTP requests in milliseconds
 * # TYPE http_request_duration_ms histogram
 * http_request_duration_ms_bucket{method="GET",route="/api/auth/me",status_code="200",le="10"} 89
 * http_request_duration_ms_bucket{method="GET",route="/api/auth/me",status_code="200",le="25"} 145
 * http_request_duration_ms_sum{method="GET",route="/api/auth/me",status_code="200"} 2847
 * http_request_duration_ms_count{method="GET",route="/api/auth/me",status_code="200"} 156
 * ```
 *
 * @example
 * ```yaml
 * # Prometheus configuration with authentication (prometheus.yml)
 * scrape_configs:
 *   - job_name: 'nodejs-backend'
 *     scrape_interval: 15s
 *     static_configs:
 *       - targets: ['localhost:3001']
 *     metrics_path: /metrics
 *     authorization:
 *       type: Bearer
 *       credentials: <ADMIN_JWT_TOKEN>
 * ```
 */
export async function metricsRoutes(fastify: FastifyInstance) {
  /**
   * GET /metrics
   * Prometheus metrics endpoint (ADMIN only)
   *
   * Returns all metrics in Prometheus text format.
   * Scraped by Prometheus server every 15-30 seconds.
   *
   * @security Requires ADMIN role
   */
  fastify.get(
    '/metrics',
    {
      preHandler: [requireIPWhitelist(), authMiddleware, requireRole('ADMIN')],
    },
    async (_request, reply) => {
      try {
        // Set Prometheus content type
        reply.header('Content-Type', register.contentType)

        // Get all metrics
        const metrics = await getMetrics()

        return metrics
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to generate metrics')
        return reply.status(500).send({
          success: false,
          error: 'Failed to generate metrics',
        })
      }
    }
  )
}
