import { StripeService } from '../../../services/stripe.service'
import { prisma } from '../../../config/prisma'
import { PlanType, SubscriptionStatus } from '@prisma/client'

// Mock env before importing service
jest.mock('../../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    STRIPE_SECRET_KEY: 'sk_test_mock_key_12345',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_mock_123',
  },
}))

jest.mock('../../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('../../../services/cache.service', () => ({
  CacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    deletePattern: jest.fn().mockResolvedValue(undefined),
  },
  CacheKeys: {
    subscription: (userId: string) => `v1:subscription:${userId}`,
    featureAccess: (userId: string, plan: string) => `v1:feature-access:${userId}:${plan}`,
  },
}))

jest.mock('../../../queues/stripe-webhook.queue', () => ({
  queueStripeWebhook: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_test123',
      }),
    },
    subscriptions: {
      retrieve: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }))
})

describe('StripeService', () => {
  let stripeService: StripeService

  beforeEach(() => {
    jest.clearAllMocks()
    stripeService = new StripeService()
  })

  describe('getOrCreateCustomer', () => {
    it('should return existing customer ID if user has one', async () => {
      const mockUser = {
        id: 'user_123',
        stripeCustomerId: 'cus_existing',
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await stripeService.getOrCreateCustomer('user_123', 'test@example.com')

      expect(result).toBe('cus_existing')
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        select: { stripeCustomerId: true },
      })
    })

    it('should create new customer if user does not have one', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_123',
        stripeCustomerId: null,
      })

      const result = await stripeService.getOrCreateCustomer('user_123', 'test@example.com')

      expect(result).toBe('cus_test123')
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { stripeCustomerId: 'cus_test123' },
      })
    })
  })

  describe('hasActiveSubscription', () => {
    it('should return true if user has active subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: SubscriptionStatus.ACTIVE,
        planType: PlanType.PRO,
      }

      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)

      const result = await stripeService.hasActiveSubscription('user_123')

      expect(result).toBe(true)
    })

    it('should return false if user has no subscription', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await stripeService.hasActiveSubscription('user_123')

      expect(result).toBe(false)
    })
  })

  describe('hasFeatureAccess', () => {
    it('should return true if user has required plan', async () => {
      const mockUser = {
        planType: PlanType.PRO,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await stripeService.hasFeatureAccess('user_123', PlanType.PRO)

      expect(result).toBe(true)
    })

    it('should return true if user has higher plan (PRO > STARTER)', async () => {
      const mockUser = {
        planType: PlanType.PRO,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await stripeService.hasFeatureAccess('user_123', PlanType.STARTER)

      expect(result).toBe(true)
    })

    it('should return false if user has lower plan', async () => {
      const mockUser = {
        planType: PlanType.STARTER,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await stripeService.hasFeatureAccess('user_123', PlanType.PRO)

      expect(result).toBe(false)
    })

    it('should return false if subscription is not active', async () => {
      const mockUser = {
        planType: PlanType.PRO,
        subscriptionStatus: SubscriptionStatus.CANCELED,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await stripeService.hasFeatureAccess('user_123', PlanType.PRO)

      expect(result).toBe(false)
    })

    it('should return false if user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await stripeService.hasFeatureAccess('user_123', PlanType.PRO)

      expect(result).toBe(false)
    })
  })

  describe('getUserSubscription', () => {
    it('should retrieve active subscription from database', async () => {
      const mockSubscription = {
        id: 'sub_123',
        userId: 'user_123',
        status: SubscriptionStatus.ACTIVE,
        planType: PlanType.PRO,
      }

      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)

      const result = await stripeService.getUserSubscription('user_123')

      expect(result).toEqual(mockSubscription)
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user_123',
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should return null if no active subscription', async () => {
      ;(prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await stripeService.getUserSubscription('user_123')

      expect(result).toBeNull()
    })
  })
})
