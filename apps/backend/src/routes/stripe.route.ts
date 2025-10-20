import { FastifyInstance } from 'fastify'
import { env } from '@/config/env'
import { StripeController } from '../controllers/stripe.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { requireStripeIPWhitelist } from '../middlewares/stripe-ip-whitelist.middleware'
import {
  createCheckoutSessionSchema,
  getSubscriptionSchema,
} from '@/schemas/openapi.schema'

/**
 * Stripe Routes
 * Prefix: /api/stripe
 */
export async function stripeRoutes(fastify: FastifyInstance) {
  const controller = new StripeController()

  // ===== Protected routes (with auth) =====
  fastify.register(async function (fastify) {
    // Auth middleware on all routes in this group
    fastify.addHook('preHandler', authMiddleware)

    /**
     * Create checkout session
     * POST /api/stripe/create-checkout-session
     *
     * Body: {
     *   priceId: "price_xxx",
     *   planType: "PRO" | "STARTER"
     * }
     *
     * Response: {
     *   sessionId: "cs_xxx",
     *   url: "https://checkout.stripe.com/..."
     * }
     */
    fastify.post(
      '/create-checkout-session',
      { schema: createCheckoutSessionSchema },
      controller.createCheckoutSession.bind(controller)
    )

    /**
     * Create billing portal session
     * POST /api/stripe/create-portal-session
     *
     * Response: {
     *   url: "https://billing.stripe.com/..."
     * }
     */
    fastify.post(
      '/create-portal-session',
      controller.createPortalSession.bind(controller)
    )

    /**
     * Get current subscription
     * GET /api/stripe/subscription
     *
     * Response: {
     *   subscription: { ... }
     * }
     */
    fastify.get(
      '/subscription',
      { schema: getSubscriptionSchema },
      controller.getSubscription.bind(controller)
    )
  })

  // ===== Webhook (WITHOUT auth but WITH IP whitelist) =====
  /**
   * Stripe Webhook
   * POST /api/stripe/webhook
   *
   * SECURITY LAYERS:
   * 1. IP whitelisting (defense-in-depth, restricts to known Stripe IPs)
   * 2. Signature verification (mandatory, validates webhook authenticity)
   * 3. Rate limiting (prevents DoS attacks)
   *
   * IMPORTANT:
   * - No auth middleware (Stripe signature verification used instead)
   * - IP whitelist configured via STRIPE_WEBHOOK_ALLOWED_IPS env var
   * - Body must be raw (Buffer) to verify signature
   * - Custom content type parser in app.ts preserves raw body
   * - Rate limit: 100 requests per minute (prevents webhook spam/DDoS) (disabled in dev/test)
   */
  fastify.post(
    '/webhook',
    {
      preHandler: requireStripeIPWhitelist(), // NEW: Defense-in-depth IP restriction
      config:
        env.NODE_ENV === 'production'
          ? {
              rateLimit: {
                max: 100,
                timeWindow: '1 minute',
              },
            }
          : {},
    },
    controller.handleWebhook.bind(controller)
  )
}
