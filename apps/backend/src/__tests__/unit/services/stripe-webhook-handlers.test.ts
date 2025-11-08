import {
  StripeWebhookHandlers,
  isStripeSubscriptionData,
} from '../../../services/stripe-webhook-handlers'
import { prisma } from '../../../config/prisma'
import { PlanType, SubscriptionStatus } from '@prisma/client'
import Stripe from 'stripe'
import { invalidatePlanCache } from '../../../middlewares/load-plan.middleware'

// Mock dependencies
jest.mock('../../../config/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    subscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('../../../middlewares/load-plan.middleware', () => ({
  invalidatePlanCache: jest.fn(),
}))

jest.mock('../../../config/sentry', () => ({
  captureException: jest.fn(),
}))

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

jest.mock('../../../services/email.service', () => ({
  EmailService: {
    sendSubscriptionConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  },
}))

describe('StripeWebhookHandlers', () => {
  let handlers: StripeWebhookHandlers
  let mockStripe: jest.Mocked<Stripe>
  let mockInvalidateCache: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockStripe = {
      checkout: {
        sessions: {
          listLineItems: jest.fn(),
        },
      },
      subscriptions: {
        retrieve: jest.fn(),
      },
    } as unknown as jest.Mocked<Stripe>

    mockInvalidateCache = jest.fn()

    handlers = new StripeWebhookHandlers(mockStripe, mockInvalidateCache)

    // Mock transaction to execute callback immediately
    ;(prisma.$transaction as jest.Mock).mockImplementation(async callback => {
      return await callback(prisma)
    })
  })

  describe('mapStripeStatus', () => {
    it('should map active to ACTIVE', () => {
      const result = handlers.mapStripeStatus('active')
      expect(result).toBe(SubscriptionStatus.ACTIVE)
    })

    it('should map past_due to PAST_DUE', () => {
      const result = handlers.mapStripeStatus('past_due')
      expect(result).toBe(SubscriptionStatus.PAST_DUE)
    })

    it('should map canceled to CANCELED', () => {
      const result = handlers.mapStripeStatus('canceled')
      expect(result).toBe(SubscriptionStatus.CANCELED)
    })

    it('should map trialing to TRIALING', () => {
      const result = handlers.mapStripeStatus('trialing')
      expect(result).toBe(SubscriptionStatus.TRIALING)
    })

    it('should map incomplete to INCOMPLETE', () => {
      const result = handlers.mapStripeStatus('incomplete')
      expect(result).toBe(SubscriptionStatus.INCOMPLETE)
    })

    it('should map incomplete_expired to CANCELED', () => {
      const result = handlers.mapStripeStatus('incomplete_expired')
      expect(result).toBe(SubscriptionStatus.CANCELED)
    })

    it('should map unpaid to PAST_DUE', () => {
      const result = handlers.mapStripeStatus('unpaid')
      expect(result).toBe(SubscriptionStatus.PAST_DUE)
    })

    it('should map paused to CANCELED', () => {
      const result = handlers.mapStripeStatus('paused')
      expect(result).toBe(SubscriptionStatus.CANCELED)
    })
  })

  describe('extractUserIdFromWebhook', () => {
    it('should extract userId from valid metadata', async () => {
      const metadata = {
        userId: 'cm123456789',
        planType: 'PRO',
      }

      const result = await handlers.extractUserIdFromWebhook(metadata, 'sub_123', true)

      expect(result.userId).toBe('cm123456789')
      expect(result.planType).toBe('PRO')
    })

    it('should return userId without planType when not requested', async () => {
      const metadata = {
        userId: 'cm123456789',
        planType: 'STARTER',
      }

      const result = await handlers.extractUserIdFromWebhook(metadata, 'sub_123', false)

      expect(result.userId).toBe('cm123456789')
      expect(result.planType).toBeUndefined()
    })

    it('should fallback to database when metadata is invalid', async () => {
      const invalidMetadata = { invalidKey: 'value' }

      ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'cm987654321',
        planType: PlanType.STARTER,
      })

      const result = await handlers.extractUserIdFromWebhook(invalidMetadata, 'sub_123', true)

      expect(result.userId).toBe('cm987654321')
      expect(result.planType).toBe(PlanType.STARTER)
      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
        select: { userId: true, planType: true },
      })
    })

    it('should throw error when metadata invalid and no DB record', async () => {
      const invalidMetadata = { invalidKey: 'value' }

      ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(
        handlers.extractUserIdFromWebhook(invalidMetadata, 'sub_123', false)
      ).rejects.toThrow('Cannot process webhook - missing userId in metadata')
    })
  })

  describe('handleCheckoutCompleted', () => {
    const mockSession: Partial<Stripe.Checkout.Session> = {
      id: 'cs_test_123',
      metadata: {
        userId: 'cm123456789',
        planType: 'PRO',
      },
      subscription: 'sub_123',
      customer: 'cus_123',
    }

    beforeEach(() => {
      ;(mockStripe.checkout.sessions.listLineItems as jest.Mock).mockResolvedValue({
        data: [{ price: { id: 'price_123' } }],
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@example.com',
      })
    })

    it('should create subscription for new checkout', async () => {
      await handlers.handleCheckoutCompleted(mockSession as Stripe.Checkout.Session)

      expect(prisma.subscription.upsert).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
        create: expect.objectContaining({
          userId: 'cm123456789',
          stripeSubscriptionId: 'sub_123',
          stripePriceId: 'price_123',
          stripeCustomerId: 'cus_123',
          status: SubscriptionStatus.ACTIVE,
          planType: PlanType.PRO,
          cancelAtPeriodEnd: false,
        }),
        update: expect.anything(),
      })

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'cm123456789' },
        data: expect.objectContaining({
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          subscriptionId: 'sub_123',
          planType: PlanType.PRO,
        }),
      })

      expect(mockInvalidateCache).toHaveBeenCalledWith('cm123456789')
      expect(invalidatePlanCache).toHaveBeenCalledWith('cm123456789')
    })

    it('should handle subscription as object', async () => {
      const sessionWithObjectSub = {
        ...mockSession,
        subscription: { id: 'sub_456' },
      }

      await handlers.handleCheckoutCompleted(sessionWithObjectSub as Stripe.Checkout.Session)

      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_456' },
        })
      )
    })

    it('should handle customer as object', async () => {
      const sessionWithObjectCustomer = {
        ...mockSession,
        customer: { id: 'cus_789' },
      }

      await handlers.handleCheckoutCompleted(sessionWithObjectCustomer as Stripe.Checkout.Session)

      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            stripeCustomerId: 'cus_789',
          }),
        })
      )
    })

    it('should throw error if metadata is invalid', async () => {
      const invalidSession = {
        ...mockSession,
        metadata: { invalidKey: 'value' },
      }

      await expect(
        handlers.handleCheckoutCompleted(invalidSession as Stripe.Checkout.Session)
      ).rejects.toThrow('Invalid checkout metadata')
    })

    it('should throw error if no subscription in session', async () => {
      const noSubSession = {
        ...mockSession,
        subscription: null,
      }

      await expect(
        handlers.handleCheckoutCompleted(noSubSession as Stripe.Checkout.Session)
      ).rejects.toThrow('No subscription in checkout session')
    })

    it('should throw error if no customer in session', async () => {
      const noCustomerSession = {
        ...mockSession,
        customer: null,
      }

      await expect(
        handlers.handleCheckoutCompleted(noCustomerSession as Stripe.Checkout.Session)
      ).rejects.toThrow('No customer ID in checkout session')
    })

    it('should throw error if no price ID found', async () => {
      ;(mockStripe.checkout.sessions.listLineItems as jest.Mock).mockResolvedValue({
        data: [],
      })

      await expect(
        handlers.handleCheckoutCompleted(mockSession as Stripe.Checkout.Session)
      ).rejects.toThrow('No price ID found in checkout session')
    })

    it('should throw error if user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        handlers.handleCheckoutCompleted(mockSession as Stripe.Checkout.Session)
      ).rejects.toThrow('User not found: cm123456789')
    })
  })

  describe('handleSubscriptionUpdated', () => {
    const mockSubscription = {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
      items: {
        data: [{ price: { id: 'price_123' } }],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
      current_period_start: 1704067200,
      current_period_end: 1706745600,
      cancel_at_period_end: false,
      canceled_at: null,
      metadata: {
        userId: 'cm123456789',
        planType: 'STARTER',
      },
    } as unknown as Stripe.Subscription

    it('should update subscription and user', async () => {
      await handlers.handleSubscriptionUpdated(mockSubscription as Stripe.Subscription)

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
        data: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          planType: PlanType.STARTER,
          stripePriceId: 'price_123',
          cancelAtPeriodEnd: false,
          canceledAt: null,
        }),
      })

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'cm123456789' },
        data: expect.objectContaining({
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          planType: PlanType.STARTER,
        }),
      })

      expect(mockInvalidateCache).toHaveBeenCalledWith('cm123456789')
      expect(invalidatePlanCache).toHaveBeenCalledWith('cm123456789')
    })

    it('should handle subscription cancellation', async () => {
      const canceledSub = {
        ...mockSubscription,
        status: 'canceled',
        cancel_at_period_end: true,
        canceled_at: 1704067200,
      }

      await handlers.handleSubscriptionUpdated(canceledSub as Stripe.Subscription)

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
        data: expect.objectContaining({
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: true,
          canceledAt: new Date(1704067200 * 1000),
        }),
      })
    })

    it('should throw error if subscription structure invalid', async () => {
      const invalidSub = { id: 'sub_123' }

      await expect(
        handlers.handleSubscriptionUpdated(invalidSub as Stripe.Subscription)
      ).rejects.toThrow('Invalid Stripe subscription structure')
    })

    it('should throw error if no price ID', async () => {
      const noPriceSub = {
        ...mockSubscription,
        items: {
          object: 'list',
          data: [],
          has_more: false,
          url: '/v1/subscription_items',
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
      } as unknown as Stripe.Subscription

      await expect(handlers.handleSubscriptionUpdated(noPriceSub)).rejects.toThrow(
        'Invalid Stripe subscription structure'
      )
    })

    it('should handle missing period dates gracefully', async () => {
      const noPeriodSub = {
        ...mockSubscription,
        current_period_start: undefined,
        current_period_end: undefined,
      }

      await handlers.handleSubscriptionUpdated(noPeriodSub as Stripe.Subscription)

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
        data: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          planType: PlanType.STARTER,
          stripePriceId: 'price_123',
          cancelAtPeriodEnd: false,
          canceledAt: null,
          // Period dates should NOT be in the update when missing
        }),
      })

      expect(prisma.user.update).toHaveBeenCalled()
    })
  })

  describe('handleSubscriptionDeleted', () => {
    const mockSubscription: Partial<Stripe.Subscription> = {
      id: 'sub_123',
      metadata: {
        userId: 'cm123456789',
      },
    }

    it('should mark subscription as canceled', async () => {
      await handlers.handleSubscriptionDeleted(mockSubscription as Stripe.Subscription)

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: false,
          canceledAt: expect.any(Date),
        },
      })

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'cm123456789' },
        data: {
          subscriptionStatus: SubscriptionStatus.CANCELED,
          planType: PlanType.FREE,
          subscriptionId: null,
          currentPeriodEnd: null,
        },
      })

      expect(mockInvalidateCache).toHaveBeenCalledWith('cm123456789')
      expect(invalidatePlanCache).toHaveBeenCalledWith('cm123456789')
    })

    it('should downgrade user to FREE plan', async () => {
      await handlers.handleSubscriptionDeleted(mockSubscription as Stripe.Subscription)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'cm123456789' },
        data: expect.objectContaining({
          planType: PlanType.FREE,
        }),
      })
    })
  })

  describe('handlePaymentFailed', () => {
    const mockInvoice = {
      subscription: 'sub_123' as string,
    } as unknown as Stripe.Invoice

    const mockSubscription = {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'past_due' as Stripe.Subscription.Status,
      items: {
        data: [{ price: { id: 'price_123' } }],
      },
      current_period_start: 1704067200,
      current_period_end: 1706745600,
      cancel_at_period_end: false,
      canceled_at: null,
      metadata: {
        userId: 'cm123456789',
      },
    } as unknown as Stripe.Subscription

    beforeEach(() => {
      ;(mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(mockSubscription)
    })

    it('should mark subscription as PAST_DUE', async () => {
      await handlers.handlePaymentFailed(mockInvoice as Stripe.Invoice)

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123')

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
        data: {
          status: SubscriptionStatus.PAST_DUE,
        },
      })

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'cm123456789' },
        data: {
          subscriptionStatus: SubscriptionStatus.PAST_DUE,
        },
      })

      expect(mockInvalidateCache).toHaveBeenCalledWith('cm123456789')
    })

    it('should return early if invoice has no subscription', async () => {
      const noSubInvoice = {}

      await handlers.handlePaymentFailed(noSubInvoice as Stripe.Invoice)

      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled()
      expect(prisma.subscription.update).not.toHaveBeenCalled()
    })

    it('should throw error if subscription structure invalid', async () => {
      ;(mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({ id: 'sub_123' })

      await expect(handlers.handlePaymentFailed(mockInvoice as Stripe.Invoice)).rejects.toThrow(
        'Invalid Stripe subscription structure'
      )
    })
  })

  describe('isStripeSubscriptionData', () => {
    it('should validate valid subscription data', () => {
      const validData = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [{ price: { id: 'price_123' } }],
        },
      }

      expect(isStripeSubscriptionData(validData)).toBe(true)
    })

    it('should reject null', () => {
      expect(isStripeSubscriptionData(null)).toBe(false)
    })

    it('should reject undefined', () => {
      expect(isStripeSubscriptionData(undefined)).toBe(false)
    })

    it('should reject non-object', () => {
      expect(isStripeSubscriptionData('string')).toBe(false)
      expect(isStripeSubscriptionData(123)).toBe(false)
    })

    it('should reject missing id', () => {
      const invalidData = {
        customer: 'cus_123',
        status: 'active',
        items: { data: [{ price: { id: 'price_123' } }] },
      }

      expect(isStripeSubscriptionData(invalidData)).toBe(false)
    })

    it('should reject missing customer', () => {
      const invalidData = {
        id: 'sub_123',
        status: 'active',
        items: { data: [{ price: { id: 'price_123' } }] },
      }

      expect(isStripeSubscriptionData(invalidData)).toBe(false)
    })

    it('should reject missing items', () => {
      const invalidData = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
      }

      expect(isStripeSubscriptionData(invalidData)).toBe(false)
    })

    it('should reject empty items.data array', () => {
      const invalidData = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        items: { data: [] },
      }

      expect(isStripeSubscriptionData(invalidData)).toBe(false)
    })
  })
})
