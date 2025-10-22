import { logger } from '@/utils/logger'
import { env } from '@/config/env'
import { prisma } from '@/config/prisma'
import { queueStripeWebhook } from '@/queues/stripe-webhook.queue'
import { DistributedLockService } from '@/services/distributed-lock.service'
import { PlanType, SubscriptionStatus } from '@prisma/client'
import Stripe from 'stripe'
import { z } from 'zod'
import { CacheKeys, CacheService } from './cache.service'

/**
 * Interface for typing Stripe Subscription objects correctly
 * (compatibility with Stripe v19+ using snake_case)
 */
interface StripeSubscriptionData {
  id: string
  customer: string
  status: Stripe.Subscription.Status
  items: {
    data: Array<{
      price: {
        id: string
      }
    }>
  }
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
  metadata?: Record<string, string>
}

/**
 * Zod schemas for validating Stripe webhook metadata
 * Prevents injection attacks and ensures type safety
 */
const checkoutMetadataSchema = z.object({
  userId: z.string().cuid(),
  planType: z.enum(['PRO', 'STARTER']),
})

const subscriptionMetadataSchema = z.object({
  userId: z.string().cuid(),
  planType: z.enum(['PRO', 'STARTER']).optional(),
})

/**
 * Type guard to validate Stripe subscription structure
 */
function isStripeSubscriptionData(data: unknown): data is StripeSubscriptionData {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.customer === 'string' &&
    typeof obj.status === 'string' &&
    obj.items !== null &&
    typeof obj.items === 'object' &&
    'data' in obj.items &&
    Array.isArray((obj.items as { data: unknown }).data) &&
    (obj.items as { data: unknown[] }).data.length > 0
  )
}

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
   * Creates a new subscription in database
   * PUBLIC: Called by webhook queue worker
   */
  async handleCheckoutCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const validationResult = checkoutMetadataSchema.safeParse(session.metadata)

    if (!validationResult.success) {
      throw new Error(
        `Invalid checkout metadata: ${validationResult.error.message}`
      )
    }

    const { userId, planType } = validationResult.data

    if (!session.subscription) {
      throw new Error('No subscription in checkout session')
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string
    )

    if (!isStripeSubscriptionData(stripeSubscription)) {
      throw new Error('Invalid Stripe subscription structure')
    }

    const sub = stripeSubscription
    const priceId = sub.items.data[0]?.price.id

    if (!priceId) {
      throw new Error('No price ID found in subscription')
    }

    await prisma.$transaction(async tx => {
      await tx.subscription.upsert({
        where: {
          stripeSubscriptionId: sub.id,
        },
        create: {
          userId,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          stripeCustomerId: sub.customer as string,
          status: this.mapStripeStatus(sub.status),
          planType,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        update: {
          status: this.mapStripeStatus(sub.status),
          planType,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: this.mapStripeStatus(sub.status),
          subscriptionId: sub.id,
          planType,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      })
    })

    await this.invalidateSubscriptionCache(userId)
  }

  /**
   * Handles customer.subscription.updated event
   * Updates subscription in database (renewal, plan change)
   * PUBLIC: Called by webhook queue worker
   */
  async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    if (!isStripeSubscriptionData(stripeSubscription)) {
      throw new Error('Invalid Stripe subscription structure')
    }

    const subscription = stripeSubscription

    // Extract userId and planType with database fallback
    const { userId, planType } = await this.extractUserIdFromWebhook(
      subscription.metadata,
      subscription.id,
      true // Include planType
    )

    const priceId = subscription.items.data[0]?.price.id

    if (!priceId) {
      throw new Error('No price ID found in subscription')
    }

    await prisma.$transaction(async tx => {
      await tx.subscription.update({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          status: this.mapStripeStatus(subscription.status),
          planType: planType || undefined,
          stripePriceId: priceId,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : null,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: this.mapStripeStatus(subscription.status),
          planType: planType || undefined,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
    })

    await this.invalidateSubscriptionCache(userId)
  }

  /**
   * Handles customer.subscription.deleted event
   * Marks subscription as canceled
   * PUBLIC: Called by webhook queue worker
   */
  async handleSubscriptionDeleted(
    subscription: Stripe.Subscription
  ): Promise<void> {
    const { userId } = await this.extractUserIdFromWebhook(
      subscription.metadata,
      subscription.id,
      false
    )

    await prisma.$transaction(async tx => {
      await tx.subscription.update({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: false,
          canceledAt: new Date(),
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: SubscriptionStatus.CANCELED,
          planType: PlanType.FREE,
          subscriptionId: null,
          currentPeriodEnd: null,
        },
      })
    })

    await this.invalidateSubscriptionCache(userId)
  }

  /**
   * Handles invoice.payment_failed event
   * Marks subscription as PAST_DUE
   * PUBLIC: Called by webhook queue worker
   */
  async handlePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
    const invoice = stripeInvoice as unknown as { subscription?: string }
    if (!invoice.subscription) {
      return
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      invoice.subscription
    )

    if (!isStripeSubscriptionData(stripeSubscription)) {
      throw new Error('Invalid Stripe subscription structure')
    }

    const subscription = stripeSubscription

    const { userId } = await this.extractUserIdFromWebhook(
      subscription.metadata,
      subscription.id,
      false
    )

    await prisma.$transaction(async tx => {
      await tx.subscription.update({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          status: SubscriptionStatus.PAST_DUE,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: SubscriptionStatus.PAST_DUE,
        },
      })
    })

    await this.invalidateSubscriptionCache(userId)
  }

  /**
   * Extracts userId from Stripe webhook metadata with database fallback
   * Handles cases where metadata is missing or corrupted
   *
   * @param metadata - Stripe subscription metadata
   * @param subscriptionId - Stripe subscription ID for error logging
   * @param includeP lanType - Whether to also extract planType (optional)
   * @returns userId and optionally planType
   * @throws Error if userId cannot be recovered from either metadata or database
   *
   * @private
   */
  private async extractUserIdFromWebhook(
    metadata: unknown,
    subscriptionId: string,
    includePlanType: boolean = false
  ): Promise<{ userId: string; planType?: PlanType }> {
    const validationResult = subscriptionMetadataSchema.safeParse(metadata)

    if (!validationResult.success) {
      logger.error(
        {
          error: validationResult.error.message,
          subscriptionId,
        },
        'Invalid subscription metadata - attempting fallback'
      )

      // CRITICAL: Attempt to recover userId from existing DB record
      const existingSub = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        select: { userId: true, planType: includePlanType },
      })

      if (!existingSub) {
        const errorMsg = `Cannot process webhook - missing userId in metadata and no existing subscription found: ${subscriptionId}`
        logger.error({ subscriptionId }, errorMsg)

        // Send alert to Sentry for manual intervention
        const { captureException } = await import('@/config/sentry')
        captureException(new Error(errorMsg), {
          subscriptionId,
          metadata,
        })

        throw new Error(errorMsg)
      }

      // Use existing data as fallback
      logger.warn(
        { subscriptionId, userId: existingSub.userId, planType: existingSub.planType },
        'Using fallback data from existing subscription'
      )

      return {
        userId: existingSub.userId,
        ...(includePlanType && existingSub.planType ? { planType: existingSub.planType } : {}),
      }
    }

    // Metadata is valid
    return {
      userId: validationResult.data.userId,
      ...(includePlanType && validationResult.data.planType ? { planType: validationResult.data.planType } : {}),
    }
  }

  /**
   * Converts Stripe status to database status
   */
  private mapStripeStatus(
    stripeStatus: Stripe.Subscription.Status
  ): SubscriptionStatus {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.CANCELED,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.PAST_DUE,
      paused: SubscriptionStatus.CANCELED,
    }

    return statusMap[stripeStatus] || SubscriptionStatus.NONE
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
