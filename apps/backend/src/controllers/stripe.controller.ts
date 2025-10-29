import { FastifyRequest, FastifyReply } from 'fastify'
import { stripeService } from '@/services/stripe.service'
import { PlanType } from '@prisma/client'
import { z } from 'zod'

/**
 * Controller for Stripe routes
 * Handles checkout creation, webhooks, and billing portals
 */
export class StripeController {
  /**
   * Create Stripe checkout session
   * POST /api/stripe/create-checkout-session
   *
   * Body: {
   *   priceId: "price_xxx",
   *   planType: "PRO" | "STARTER"
   * }
   */
  async createCheckoutSession(
    request: FastifyRequest<{
      Body: {
        priceId: string
        planType: PlanType
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user?.userId
      const userEmail = request.user?.email

      if (!userId || !userEmail) {
        return reply.status(401).send({
          success: false,
          error: 'Not authenticated',
        })
      }

      // Validation
      const schema = z.object({
        priceId: z.string().startsWith('price_'),
        planType: z.nativeEnum(PlanType),
      })

      const { priceId, planType } = schema.parse(request.body)

      // Validate plan type is not FREE
      if (planType === PlanType.FREE) {
        return reply.status(400).send({
          success: false,
          error: 'Cannot create checkout session for FREE plan',
        })
      }

      // Check if user already has an active subscription
      // If yes, they should use the billing portal to change plans
      const hasActiveSubscription = await stripeService.hasActiveSubscription(userId)
      if (hasActiveSubscription) {
        return reply.status(400).send({
          success: false,
          error: 'Please use the billing portal to change your plan.',
          requiresBillingPortal: true,
        })
      }

      // Create session
      const session = await stripeService.createCheckoutSession(
        userId,
        userEmail,
        priceId,
        planType
      )

      reply.send({
        success: true,
        data: {
          sessionId: session.sessionId,
          url: session.url,
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request body',
          details: error.issues,
        })
      }

      if (error instanceof Error) {
        request.log.error(error)
        return reply.status(500).send({
          success: false,
          error: error.message,
        })
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      })
    }
  }

  /**
   * Create billing portal session
   * POST /api/stripe/create-portal-session
   *
   * Allows user to manage subscription (plan change, cancellation)
   */
  async createPortalSession(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Not authenticated',
        })
      }

      const session = await stripeService.createBillingPortalSession(userId)

      reply.send({
        success: true,
        data: {
          url: session.url,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        request.log.error(error)
        return reply.status(500).send({
          success: false,
          error: error.message,
        })
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      })
    }
  }

  /**
   * Stripe webhook
   * POST /api/stripe/webhook
   *
   * Processes Stripe events (checkout completed, subscription updated, etc.)
   * IMPORTANT: This route must NOT have auth middleware
   */
  async handleWebhook(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const signature = request.headers['stripe-signature']

      if (!signature || typeof signature !== 'string') {
        return reply.status(400).send({
          success: false,
          error: 'Missing stripe-signature header',
        })
      }

      // Validate Content-Type (Stripe sends 'application/json; charset=utf-8')
      const contentType = request.headers['content-type']
      if (!contentType?.startsWith('application/json')) {
        return reply.status(400).send({
          success: false,
          error: 'Content-Type must be application/json',
        })
      }

      // Get raw body for signature verification (captured by fastify-raw-body plugin)
      const rawBody = request.rawBody

      if (!Buffer.isBuffer(rawBody)) {
        request.log.error(
          { bodyType: typeof rawBody },
          'Webhook rawBody is not a Buffer - fastify-raw-body plugin may have failed'
        )
        return reply.status(400).send({
          success: false,
          error: 'Invalid webhook body format',
        })
      }

      await stripeService.handleWebhook(rawBody, signature)

      reply.send({ received: true })
    } catch (error) {
      if (error instanceof Error) {
        request.log.error({ err: error, message: error.message }, 'Webhook error')
        return reply.status(400).send({
          success: false,
          error: error.message,
        })
      }

      return reply.status(500).send({
        success: false,
        error: 'Webhook handling failed',
      })
    }
  }

  /**
   * Get user's current subscription
   * GET /api/stripe/subscription
   */
  async getSubscription(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Not authenticated',
        })
      }

      const subscription = await stripeService.getUserSubscription(userId)

      reply.send({
        success: true,
        data: {
          subscription,
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        request.log.error(error)
        return reply.status(500).send({
          success: false,
          error: error.message,
        })
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      })
    }
  }
}
