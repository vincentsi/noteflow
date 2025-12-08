import { logger } from '@/utils/logger'
import { prisma } from '@/config/prisma'
import { PlanType, SubscriptionStatus } from '@prisma/client'
import Stripe from 'stripe'
import { z } from 'zod'
import { invalidatePlanCache } from '@/middlewares/load-plan.middleware'
import { EmailService } from './email.service'

/**
 * Interface for typing Stripe Subscription objects correctly
 * (compatibility with Stripe v19+ using snake_case)
 */
export interface StripeSubscriptionData {
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
export const checkoutMetadataSchema = z.object({
  userId: z.string().cuid(),
  planType: z.enum(['PRO', 'STARTER']),
})

export const subscriptionMetadataSchema = z.object({
  userId: z.string().cuid(),
  planType: z.enum(['PRO', 'STARTER']).optional(),
})

/**
 * Type guard to validate Stripe subscription structure
 */
export function isStripeSubscriptionData(data: unknown): data is StripeSubscriptionData {
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
 * Stripe Webhook Handlers
 *
 * Handles all Stripe webhook events with atomic database updates:
 * - checkout.session.completed: New subscription
 * - customer.subscription.updated: Renewal, plan change
 * - customer.subscription.deleted: Cancellation
 * - invoice.payment_failed: Payment failure
 *
 * @ai-prompt When modifying these handlers:
 * - ALL handlers MUST use prisma.$transaction (prevents partial updates)
 * - ALWAYS validate metadata with Zod before using userId (security critical)
 * - Call invalidateSubscriptionCache after every DB update
 * - Use extractUserIdFromWebhook for metadata validation with DB fallback
 * - Use mapStripeStatus to ensure DB enum consistency
 */
export class StripeWebhookHandlers {
  constructor(
    private stripe: Stripe,
    private invalidateCache: (userId: string) => Promise<void>
  ) {}

  /**
   * Converts Stripe status to database status
   */
  mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
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
   * Extracts userId from Stripe webhook metadata with database fallback
   * Handles cases where metadata is missing or corrupted
   *
   * @param metadata - Stripe subscription metadata
   * @param subscriptionId - Stripe subscription ID for error logging
   * @param includePlanType - Whether to also extract planType (optional)
   * @returns userId and optionally planType
   * @throws Error if userId cannot be recovered from either metadata or database
   */
  async extractUserIdFromWebhook(
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
      ...(includePlanType && validationResult.data.planType
        ? { planType: validationResult.data.planType }
        : {}),
    }
  }

  /**
   * Handles checkout.session.completed event
   * Creates a new subscription in database
   * PUBLIC: Called by webhook queue worker
   */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const validationResult = checkoutMetadataSchema.safeParse(session.metadata)

    if (!validationResult.success) {
      throw new Error(`Invalid checkout metadata: ${validationResult.error.message}`)
    }

    const { userId, planType } = validationResult.data

    if (!session.subscription) {
      throw new Error('No subscription in checkout session')
    }

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription.id

    // Get customer ID from session
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id

    if (!customerId) {
      throw new Error('No customer ID in checkout session')
    }

    // Use current time as period start (subscription just created)
    const now = new Date()
    const periodStart = now
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 days

    // Get line item to extract price ID
    const lineItems = await this.stripe.checkout.sessions.listLineItems(session.id)
    const priceId = lineItems.data[0]?.price?.id

    if (!priceId) {
      throw new Error('No price ID found in checkout session')
    }

    // Get user email for confirmation email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (!user) {
      throw new Error(`User not found: ${userId}`)
    }

    await prisma.$transaction(async tx => {
      await tx.subscription.upsert({
        where: {
          stripeSubscriptionId: subscriptionId,
        },
        create: {
          userId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          stripeCustomerId: customerId,
          status: SubscriptionStatus.ACTIVE,
          planType,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        update: {
          status: SubscriptionStatus.ACTIVE,
          planType,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          subscriptionId: subscriptionId,
          planType,
          currentPeriodEnd: periodEnd,
        },
      })
    })

    await this.invalidateCache(userId)
    await invalidatePlanCache(userId)

    // Send confirmation email (non-blocking - don't fail webhook if email fails)
    const amount = planType === 'PRO' ? '€15/month' : '€6/month'
    EmailService.sendSubscriptionConfirmationEmail(user.email, planType, amount).catch(error => {
      logger.error({ error, userId, planType }, '❌ Failed to send subscription confirmation email')
    })
  }

  /**
   * Maps Stripe price ID to plan type
   * CRITICAL: This is the source of truth for plan detection from webhooks
   * When user upgrades in billing portal, metadata isn't updated but priceId is
   */
  private getPlanTypeFromPriceId(priceId: string): PlanType {
    // Get price IDs from environment variables
    const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID

    if (priceId === starterPriceId) {
      return PlanType.STARTER
    }
    if (priceId === proPriceId) {
      return PlanType.PRO
    }

    // Log warning if price ID doesn't match any known plans
    logger.warn(
      { priceId, starterPriceId, proPriceId },
      'Unknown price ID in subscription - defaulting to STARTER'
    )

    return PlanType.STARTER
  }

  /**
   * Handles customer.subscription.updated event
   * Updates subscription in database (renewal, plan change)
   * PUBLIC: Called by webhook queue worker
   */
  async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    if (!isStripeSubscriptionData(stripeSubscription)) {
      throw new Error('Invalid Stripe subscription structure')
    }

    const subscription = stripeSubscription

    // Extract userId (ignore metadata planType, it's not updated on plan changes)
    const { userId } = await this.extractUserIdFromWebhook(
      subscription.metadata,
      subscription.id,
      false // Don't use metadata planType
    )

    const priceId = subscription.items.data[0]?.price.id

    if (!priceId) {
      throw new Error('No price ID found in subscription')
    }

    // Detect plan type from price ID (handles upgrades/downgrades in billing portal)
    const detectedPlanType = this.getPlanTypeFromPriceId(priceId)

    // CRITICAL: Always fetch fresh subscription data from Stripe API
    // Webhook events may have stale or missing period dates during plan changes
    // This ensures we always have accurate billing cycle information
    let periodStart: Date
    let periodEnd: Date

    try {
      const freshSubscriptionResponse = await this.stripe.subscriptions.retrieve(subscription.id)
      const freshSubscription = freshSubscriptionResponse as unknown as StripeSubscriptionData

      if (!isStripeSubscriptionData(freshSubscription)) {
        throw new Error('Invalid fresh subscription data structure')
      }

      periodStart = new Date(freshSubscription.current_period_start * 1000)
      periodEnd = new Date(freshSubscription.current_period_end * 1000)

      // Validate dates
      if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
        throw new Error('Invalid dates in fresh subscription data')
      }

      logger.info(
        {
          subscriptionId: subscription.id,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          planType: detectedPlanType,
        },
        'Retrieved fresh subscription dates from Stripe API'
      )
    } catch (error) {
      // Fallback to webhook data if API call fails
      logger.error(
        { error, subscriptionId: subscription.id },
        'Failed to fetch fresh subscription - using webhook data'
      )

      periodStart = subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : new Date()
      periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default: +30 days
    }

    await prisma.$transaction(async tx => {
      await tx.subscription.update({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        data: {
          status: this.mapStripeStatus(subscription.status),
          planType: detectedPlanType,
          stripePriceId: priceId,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: this.mapStripeStatus(subscription.status),
          planType: detectedPlanType,
          currentPeriodEnd: periodEnd,
        },
      })
    })

    await this.invalidateCache(userId)
    await invalidatePlanCache(userId)
  }

  /**
   * Handles customer.subscription.deleted event
   * Marks subscription as canceled
   * PUBLIC: Called by webhook queue worker
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
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

    await this.invalidateCache(userId)
    await invalidatePlanCache(userId)
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

    const stripeSubscription = await this.stripe.subscriptions.retrieve(invoice.subscription)

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

    await this.invalidateCache(userId)
  }
}
