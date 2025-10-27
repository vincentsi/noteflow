import { env } from '@/config/env'
import { prisma } from '@/config/prisma'
import { queueStripeWebhook } from '@/queues/stripe-webhook.queue'
import { DistributedLockService } from '@/services/distributed-lock.service'
import { PlanType, SubscriptionStatus } from '@prisma/client'
import Stripe from 'stripe'
import { CacheKeys, CacheService } from './cache.service'
import { StripeWebhookHandlers } from './stripe-webhook-handlers'

/**
 * Stripe Subscription Service
 *
 * Handles subscription lifecycle with enterprise-grade patterns:
 * - Async webhook processing (BullMQ queue responds to Stripe in <1s)
 * - Atomic database updates (Prisma transactions for Subscription + User)
 * - Input validation (Zod schemas for all webhook metadata)
 * - Redis caching (5min TTL for subscriptions and feature access)
 * - Plan hierarchy (FREE: 0, PRO: 1, BUSINESS: 2)
 * - Status mapping (8 Stripe statuses → 6 DB statuses)
 *
 * @ai-prompt When modifying this service:
 * - ALL webhook handlers MUST use prisma.$transaction (prevents partial updates)
 * - ALWAYS validate metadata with Zod before using userId (security critical)
 * - Cache invalidation required after every subscription change
 * - Webhook signature verification is mandatory in handleWebhook()
 * - Use StripeSubscriptionData interface for type casting (Stripe v19+ compatibility)
 * - Status mapping via mapStripeStatus() ensures DB enum consistency
 * - Queue processing handles retries automatically (see stripe-webhook.queue.ts)
 * - Race conditions: upsert pattern handles duplicate webhook events
 * - Graceful degradation: Redis optional, app works without cache
 *
 * @example
 * ```typescript
 * // Create checkout session
 * const session = await stripeService.createCheckoutSession(
 *   userId,
 *   'user@example.com',
 *   'price_1234',
 *   PlanType.PRO
 * )
 * // Returns: { sessionId: 'cs_xxx', url: 'https://checkout.stripe.com/...' }
 *
 * // Check feature access (cached)
 * const hasAccess = await stripeService.hasFeatureAccess(userId, PlanType.PRO)
 * // PRO users: true for PRO features
 * // BUSINESS users: true for both PRO and BUSINESS features
 * // FREE users: false for paid features
 *
 * // Webhook processing (auto-queued)
 * await stripeService.handleWebhook(payload, signature)
 * // Responds immediately, processes in background via BullMQ
 * ```
 */
export class StripeService {
  private stripe!: Stripe // Definite assignment - initialized in constructor or mocked in tests
  private static readonly SUBSCRIPTION_CACHE_TTL = 5 * 60 // 5 minutes
  private static readonly FEATURE_ACCESS_CACHE_TTL = 5 * 60 // 5 minutes
  private webhookHandlers!: StripeWebhookHandlers

  constructor() {
    // In test mode, allow missing Stripe key (will be mocked)
    if (!env.STRIPE_SECRET_KEY && env.NODE_ENV !== 'test') {
      throw new Error('STRIPE_SECRET_KEY is required')
    }

    // Create Stripe instance only if key exists (allows test mocking)
    if (env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-09-30.clover',
        typescript: true,
      })
      this.webhookHandlers = new StripeWebhookHandlers(
        this.stripe,
        this.invalidateSubscriptionCache.bind(this)
      )
    }
  }

  /**
   * Creates or retrieves a Stripe customer for a user
   * Uses distributed lock to prevent race condition when multiple
   * concurrent checkout requests try to create the same customer
   *
   * @param userId - User ID
   * @param email - User email
   * @returns Stripe customer ID
   *
   * Race condition protection:
   * - Without lock: 2 concurrent checkouts → 2 Stripe customers created
   * - With lock: Only first request creates, second waits and reuses
   */
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    // Use distributed lock to prevent duplicate customer creation
    const result = await DistributedLockService.executeWithLock(
      `stripe-customer-${userId}`,
      30000, // 30s TTL (enough for Stripe API call)
      async () => {
        // Re-check after acquiring lock (another request may have created it)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { stripeCustomerId: true },
        })

        if (user?.stripeCustomerId) {
          return user.stripeCustomerId
        }

        // Create customer in Stripe
        const customer = await this.stripe.customers.create({
          email,
          metadata: {
            userId,
          },
        })

        // Save customer ID to database
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customer.id },
        })

        return customer.id
      }
    )

    // If lock couldn't be acquired (unlikely), retry after short delay
    if (result === null) {
      // Wait for other instance to finish and retry
      await new Promise(resolve => setTimeout(resolve, 1000))

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      })

      if (!user?.stripeCustomerId) {
        throw new Error('Failed to create Stripe customer (lock acquisition failed)')
      }

      return user.stripeCustomerId
    }

    return result
  }

  /**
   * Creates a Stripe checkout session
   * @param userId - User ID
   * @param email - User email
   * @param priceId - Stripe price ID (price_xxx)
   * @param planType - Plan type (PRO, BUSINESS)
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    priceId: string,
    planType: PlanType
  ): Promise<{ sessionId: string; url: string }> {
    const customerId = await this.getOrCreateCustomer(userId, email)

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/dashboard/billing?canceled=true`,
      metadata: {
        userId,
        planType,
      },
      subscription_data: {
        metadata: {
          userId,
          planType,
        },
      },
    })

    if (!session.url) {
      throw new Error('Failed to create checkout session URL')
    }

    return {
      sessionId: session.id,
      url: session.url,
    }
  }

  /**
   * Creates a billing portal session
   * Allows users to manage/cancel their subscription
   */
  async createBillingPortalSession(userId: string): Promise<{ url: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this user')
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.FRONTEND_URL}/dashboard/billing`,
    })

    return { url: session.url }
  }

  /**
   * Processes Stripe webhooks
   * Uses queue for async processing:
   * - Responds to Stripe in <1s (avoids 30s timeout)
   * - Automatic retry on failure
   * - Graceful degradation if Redis unavailable
   *
   * Important events:
   * - checkout.session.completed: New subscription
   * - customer.subscription.updated: Update (renewal, plan change)
   * - customer.subscription.deleted: Cancellation
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required')
    }

    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )

    await queueStripeWebhook(event)
  }

  /**
   * Handles checkout.session.completed event
   * Delegates to webhook handler
   * PUBLIC: Called by webhook queue worker
   */
  async handleCheckoutCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    return this.webhookHandlers.handleCheckoutCompleted(session)
  }

  /**
   * Handles customer.subscription.updated event
   * Delegates to webhook handler
   * PUBLIC: Called by webhook queue worker
   */
  async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    return this.webhookHandlers.handleSubscriptionUpdated(stripeSubscription)
  }

  /**
   * Handles customer.subscription.deleted event
   * Delegates to webhook handler
   * PUBLIC: Called by webhook queue worker
   */
  async handleSubscriptionDeleted(
    subscription: Stripe.Subscription
  ): Promise<void> {
    return this.webhookHandlers.handleSubscriptionDeleted(subscription)
  }

  /**
   * Handles invoice.payment_failed event
   * Delegates to webhook handler
   * PUBLIC: Called by webhook queue worker
   */
  async handlePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
    return this.webhookHandlers.handlePaymentFailed(stripeInvoice)
  }

  /**
   * Retrieves user subscription information (with cache)
   * 5-minute cache to reduce database load
   *
   * Cache stampede protection:
   * - Uses distributed lock to prevent multiple DB queries when cache expires
   * - Without lock: Cache expires → 1000 concurrent requests → 1000 DB queries
   * - With lock: Only first request hits DB, others wait for cached result
   */
  async getUserSubscription(userId: string) {
    const cacheKey = CacheKeys.subscription(userId)
    const cached = await CacheService.get(cacheKey)

    if (cached) {
      return cached
    }

    // Use distributed lock to prevent cache stampede
    const result = await DistributedLockService.executeWithLock(
      `subscription-refresh-${userId}`,
      10000, // 10s TTL (enough for DB query)
      async () => {
        // Double-check cache after acquiring lock
        // (another request may have already populated it)
        const recheck = await CacheService.get(cacheKey)
        if (recheck) {
          return recheck
        }

        // Query database (only one request does this)
        const subscription = await prisma.subscription.findFirst({
          where: {
            userId,
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        // Cache result for future requests
        if (subscription) {
          await CacheService.set(
            cacheKey,
            subscription,
            StripeService.SUBSCRIPTION_CACHE_TTL
          )
        }

        return subscription
      }
    )

    // If lock couldn't be acquired, query DB directly (degraded mode)
    if (result === null) {
      return await prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    }

    return result
  }

  /**
   * Checks if user has an active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId)
    return !!subscription
  }

  /**
   * Checks if user has access to a feature based on plan (with cache)
   * 5-minute cache to avoid repeated database queries
   */
  async hasFeatureAccess(
    userId: string,
    requiredPlan: PlanType
  ): Promise<boolean> {
    const cacheKey = CacheKeys.featureAccess(userId, requiredPlan)
    const cached = await CacheService.get<boolean>(cacheKey)

    if (cached !== null) {
      return cached
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true, subscriptionStatus: true },
    })

    if (!user) {
      await CacheService.set(cacheKey, false, 60)
      return false
    }

    const isActive =
      user.subscriptionStatus === SubscriptionStatus.ACTIVE ||
      user.subscriptionStatus === SubscriptionStatus.TRIALING

    if (!isActive) {
      await CacheService.set(cacheKey, false, 60)
      return false
    }

    const planHierarchy: Record<PlanType, number> = {
      FREE: 0,
      STARTER: 1,
      PRO: 2,
    }

    const hasAccess =
      planHierarchy[user.planType] >= planHierarchy[requiredPlan]

    await CacheService.set(
      cacheKey,
      hasAccess,
      StripeService.FEATURE_ACCESS_CACHE_TTL
    )

    return hasAccess
  }

  /**
   * Invalidates subscription cache after webhook update
   * Called after subscription modification
   */
  private async invalidateSubscriptionCache(userId: string): Promise<void> {
    await CacheService.delete(CacheKeys.subscription(userId))
    // Delete all feature-access cache for this user (all plans)
    await CacheService.deletePattern(`*:feature-access:${userId}:*`)
  }
}

export const stripeService = new StripeService()
