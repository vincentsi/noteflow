import { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '@/config/env'

/**
 * Stripe IP Whitelisting Middleware
 *
 * Restricts Stripe webhook endpoint to known Stripe IP addresses.
 * Provides defense-in-depth security layer in addition to signature verification.
 *
 * **Official Stripe Webhook IPs** (as of 2025):
 * - 3.18.12.63
 * - 3.130.192.231
 * - 13.235.14.237
 * - 13.235.122.149
 * - 18.211.135.69
 * - 35.154.171.200
 * - 52.15.183.38
 * - 54.88.130.119
 * - 54.88.130.237
 * - 54.187.174.169
 * - 54.187.205.235
 * - 54.187.216.72
 *
 * **Configuration:**
 * Set STRIPE_WEBHOOK_ALLOWED_IPS environment variable:
 * ```env
 * # Production (restrict to Stripe IPs)
 * STRIPE_WEBHOOK_ALLOWED_IPS=3.18.12.63,3.130.192.231,13.235.14.237,13.235.122.149,18.211.135.69,35.154.171.200,52.15.183.38,54.88.130.119,54.88.130.237,54.187.174.169,54.187.205.235,54.187.216.72
 *
 * # Development (allow all IPs for testing)
 * STRIPE_WEBHOOK_ALLOWED_IPS=
 * ```
 *
 * **Important:**
 * - Empty STRIPE_WEBHOOK_ALLOWED_IPS = all IPs allowed (dev mode)
 * - In production, ALWAYS set this variable for webhook security
 * - Update IPs regularly from: https://stripe.com/docs/ips
 * - Logs blocked attempts for security monitoring
 *
 * @ai-prompt When modifying this middleware:
 * - If STRIPE_WEBHOOK_ALLOWED_IPS is empty, allow all IPs (dev convenience)
 * - In production, ALWAYS enforce IP whitelist for webhook endpoint
 * - Trust X-Forwarded-For header only behind trusted reverse proxy (Nginx)
 * - Log ALL blocked attempts with client IP and timestamp
 * - Update Stripe IPs list quarterly (check Stripe docs)
 * - This is defense-in-depth, signature verification is still required
 *
 * @returns Fastify middleware function
 *
 * @example
 * ```typescript
 * // Stripe webhook route with IP whitelist
 * app.post('/api/stripe/webhook', {
 *   preHandler: [requireStripeIPWhitelist()]
 * }, stripeController.handleWebhook)
 * ```
 */
export function requireStripeIPWhitelist() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const allowedIPs = env.STRIPE_WEBHOOK_ALLOWED_IPS

      // If no IPs configured, allow all (relies on Stripe signature verification)
      if (!allowedIPs || allowedIPs.length === 0) {
        request.log.warn(
          '⚠️  Stripe IP whitelist: No IPs configured, allowing all requests (relying on signature verification only)'
        )
        return // Allow all IPs when whitelist is empty
      }

      // Get client IP (supports X-Forwarded-For from reverse proxy)
      // In production, we trust the proxy since trustProxy is enabled
      const clientIP =
        request.ip || request.headers['x-forwarded-for'] || request.socket.remoteAddress

      if (!clientIP) {
        request.log.warn({ url: request.url }, 'Stripe webhook: Could not determine client IP')
        return reply.status(403).send({
          success: false,
          error: 'Access denied: Cannot determine client IP',
        })
      }

      // Extract first IP if X-Forwarded-For contains multiple IPs
      const normalizedClientIP =
        typeof clientIP === 'string'
          ? clientIP.split(',')[0]?.trim()
          : Array.isArray(clientIP)
            ? clientIP[0]?.trim()
            : clientIP

      if (!normalizedClientIP) {
        request.log.warn({ url: request.url }, 'Stripe webhook: Could not normalize client IP')
        return reply.status(403).send({
          success: false,
          error: 'Access denied: Invalid client IP',
        })
      }

      // Check if client IP is in Stripe whitelist
      const isAllowed = allowedIPs.includes(normalizedClientIP)

      if (!isAllowed) {
        request.log.warn(
          {
            clientIP: normalizedClientIP,
            url: request.url,
            method: request.method,
            allowedIPs: allowedIPs.slice(0, 3), // Log first 3 IPs only
          },
          '🚨 Stripe webhook: Access denied - IP not whitelisted'
        )

        return reply.status(403).send({
          success: false,
          error: 'Access denied: IP not whitelisted for Stripe webhooks',
        })
      }

      // IP is whitelisted, proceed
      request.log.debug(
        { clientIP: normalizedClientIP },
        '✅ Stripe webhook: IP whitelisted, proceeding'
      )
    } catch (error) {
      request.log.error({ error }, 'Stripe IP whitelist middleware error')
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      })
    }
  }
}
