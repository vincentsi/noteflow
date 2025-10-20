import { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '@/config/env'

/**
 * IP Whitelisting Middleware
 *
 * Restricts access to endpoints based on client IP address.
 * Provides an additional security layer beyond authentication/authorization.
 *
 * **Use Cases:**
 * - Metrics endpoints (Prometheus scraping from specific IPs)
 * - Admin endpoints (restrict to corporate network)
 * - Webhooks (validate requests from known IPs only)
 * - Internal APIs (allow only internal services)
 *
 * **Configuration:**
 * Set METRICS_ALLOWED_IPS environment variable with comma-separated IP addresses:
 * ```env
 * METRICS_ALLOWED_IPS=127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12
 * ```
 *
 * **Important:**
 * - Empty METRICS_ALLOWED_IPS = all IPs allowed (dev mode)
 * - Use reverse proxy (X-Forwarded-For) for production
 * - Supports IPv4 and IPv6
 * - Supports CIDR notation (future enhancement)
 *
 * @ai-prompt When modifying this middleware:
 * - If METRICS_ALLOWED_IPS is empty, allow all IPs (dev mode convenience)
 * - In production, ALWAYS set METRICS_ALLOWED_IPS for sensitive endpoints
 * - Trust X-Forwarded-For header only behind trusted reverse proxy
 * - Log blocked IP attempts for security monitoring
 * - Consider rate limiting in addition to IP whitelisting
 * - IPv6 loopback: ::1, IPv4 loopback: 127.0.0.1
 *
 * @returns Fastify middleware function
 *
 * @example
 * ```typescript
 * // Metrics endpoint with IP whitelist + ADMIN role
 * app.get('/metrics', {
 *   preHandler: [requireIPWhitelist(), authMiddleware, requireRole('ADMIN')]
 * }, handler)
 *
 * // Webhook endpoint with IP whitelist only
 * app.post('/webhooks/stripe', {
 *   preHandler: [requireIPWhitelist()]
 * }, handler)
 * ```
 *
 * @example
 * ```env
 * # Development (allow all IPs)
 * METRICS_ALLOWED_IPS=
 *
 * # Production (restrict to Prometheus server + localhost)
 * METRICS_ALLOWED_IPS=127.0.0.1,::1,10.0.0.5
 *
 * # Production with CIDR (entire subnet)
 * METRICS_ALLOWED_IPS=10.0.0.0/24,172.16.0.0/12
 * ```
 */
export function requireIPWhitelist() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const allowedIPs = env.METRICS_ALLOWED_IPS

      // If no IPs configured, allow all (development convenience)
      if (!allowedIPs || allowedIPs.length === 0) {
        return // Allow all IPs
      }

      // Get client IP (supports X-Forwarded-For from reverse proxy)
      const clientIP = request.ip || request.headers['x-forwarded-for'] || request.socket.remoteAddress

      if (!clientIP) {
        request.log.warn({ url: request.url }, 'Could not determine client IP')
        return reply.status(403).send({
          success: false,
          error: 'Access denied: Cannot determine client IP',
        })
      }

      // Extract first IP if X-Forwarded-For contains multiple IPs
      const normalizedClientIP = typeof clientIP === 'string'
        ? clientIP.split(',')[0]?.trim()
        : (Array.isArray(clientIP) ? clientIP[0]?.trim() : clientIP)

      if (!normalizedClientIP) {
        request.log.warn({ url: request.url }, 'Could not normalize client IP')
        return reply.status(403).send({
          success: false,
          error: 'Access denied: Invalid client IP',
        })
      }

      // Check if client IP is in whitelist
      const isAllowed = allowedIPs.includes(normalizedClientIP)

      if (!isAllowed) {
        request.log.warn(
          {
            clientIP: normalizedClientIP,
            url: request.url,
            method: request.method,
          },
          'IP whitelist: Access denied'
        )

        return reply.status(403).send({
          success: false,
          error: 'Access denied: IP not whitelisted',
        })
      }

      // IP is whitelisted, proceed
      request.log.debug(
        { clientIP: normalizedClientIP, url: request.url },
        'IP whitelist: Access granted'
      )
    } catch (error) {
      request.log.error({ error }, 'IP whitelist middleware error')
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      })
    }
  }
}
