import type { FastifyRequest, FastifyReply } from 'fastify'
import {
  requireSubscription,
  requireActiveSubscription,
  loadSubscription,
} from '../../../middlewares/subscription.middleware'
import { PlanType, SubscriptionStatus } from '@prisma/client'
import { stripeService } from '../../../services/stripe.service'

// Mock dependencies
jest.mock('../../../services/stripe.service', () => ({
  stripeService: {
    hasFeatureAccess: jest.fn(),
    hasActiveSubscription: jest.fn(),
    getUserSubscription: jest.fn(),
  },
}))

describe('Subscription Middleware', () => {
  let mockRequest: Partial<FastifyRequest> & { subscription?: unknown }
  let mockReply: Partial<FastifyReply>

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock request
    mockRequest = {
      user: undefined,
      subscription: undefined,
      log: {
        error: jest.fn(),
      } as unknown as FastifyRequest['log'],
    }

    // Setup mock reply with chainable methods
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    }
  })

  describe('requireSubscription', () => {
    describe('Authentication Check', () => {
      it('should return 401 if user is not authenticated', async () => {
        const middleware = requireSubscription(PlanType.STARTER)

        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(401)
        expect(mockReply.send).toHaveBeenCalledWith({
          success: false,
          error: 'Not authenticated',
        })
      })

      it('should return 401 if userId is missing', async () => {
        mockRequest.user = {
          userId: '',
          role: 'USER',
          email: 'test@example.com',
        }

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(401)
      })
    })

    describe('Plan Hierarchy (Without Cached Subscription)', () => {
      beforeEach(() => {
        mockRequest.user = {
          userId: 'user-123',
          role: 'USER',
          email: 'test@example.com',
        }
        // No cached subscription
        mockRequest.subscription = undefined
      })

      it('should allow STARTER plan when STARTER is required', async () => {
        ;(stripeService.hasFeatureAccess as jest.Mock).mockResolvedValueOnce(true)

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(stripeService.hasFeatureAccess).toHaveBeenCalledWith('user-123', PlanType.STARTER)
        expect(mockReply.status).not.toHaveBeenCalled()
      })

      it('should allow PRO plan when PRO is required', async () => {
        ;(stripeService.hasFeatureAccess as jest.Mock).mockResolvedValueOnce(true)

        const middleware = requireSubscription(PlanType.PRO)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(stripeService.hasFeatureAccess).toHaveBeenCalledWith('user-123', PlanType.PRO)
        expect(mockReply.status).not.toHaveBeenCalled()
      })

      it('should deny FREE plan when STARTER is required', async () => {
        ;(stripeService.hasFeatureAccess as jest.Mock).mockResolvedValueOnce(false)

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(403)
        expect(mockReply.send).toHaveBeenCalledWith({
          success: false,
          error: 'Subscription required',
          message: 'This feature requires STARTER plan or higher',
          requiredPlan: PlanType.STARTER,
        })
      })

      it('should deny FREE plan when PRO is required', async () => {
        ;(stripeService.hasFeatureAccess as jest.Mock).mockResolvedValueOnce(false)

        const middleware = requireSubscription(PlanType.PRO)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(403)
        expect(mockReply.send).toHaveBeenCalledWith({
          success: false,
          error: 'Subscription required',
          message: 'This feature requires PRO plan or higher',
          requiredPlan: PlanType.PRO,
        })
      })
    })

    describe('Plan Hierarchy (With Cached Subscription)', () => {
      beforeEach(() => {
        mockRequest.user = {
          userId: 'user-123',
          role: 'USER',
          email: 'test@example.com',
        }
      })

      it('should allow PRO user to access STARTER features', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).not.toHaveBeenCalled()
        expect(stripeService.hasFeatureAccess).not.toHaveBeenCalled() // Uses cached data
      })

      it('should allow PRO user to access PRO features', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.PRO)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).not.toHaveBeenCalled()
      })

      it('should allow STARTER user to access STARTER features', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).not.toHaveBeenCalled()
      })

      it('should deny STARTER user to access PRO features', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.PRO)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(403)
        expect(mockReply.send).toHaveBeenCalledWith({
          success: false,
          error: 'Subscription required',
          message: 'This feature requires PRO plan or higher',
          requiredPlan: PlanType.PRO,
        })
      })

      it('should deny FREE user to access STARTER features', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.FREE,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(403)
      })
    })

    describe('Subscription Status', () => {
      beforeEach(() => {
        mockRequest.user = {
          userId: 'user-123',
          role: 'USER',
          email: 'test@example.com',
        }
      })

      it('should allow access with ACTIVE subscription', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).not.toHaveBeenCalled()
      })

      it('should allow access with TRIALING subscription', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.TRIALING,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).not.toHaveBeenCalled()
      })

      it('should deny access with CANCELED subscription', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.CANCELED,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(403)
      })

      it('should deny access with PAST_DUE subscription', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(403)
      })

      it('should deny access with PAST_DUE subscription', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(403)
      })

      it('should allow FREE plan with null subscription when FREE is required', async () => {
        mockRequest.subscription = null

        const middleware = requireSubscription(PlanType.FREE)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).not.toHaveBeenCalled()
      })
    })

    describe('Error Handling', () => {
      beforeEach(() => {
        mockRequest.user = {
          userId: 'user-123',
          role: 'USER',
          email: 'test@example.com',
        }
      })

      it('should return 500 if stripeService throws error', async () => {
        ;(stripeService.hasFeatureAccess as jest.Mock).mockRejectedValueOnce(
          new Error('Database connection failed')
        )

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(500)
        expect(mockReply.send).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to verify subscription',
        })
        expect(mockRequest.log?.error).toHaveBeenCalled()
      })
    })

    describe('Performance Optimization', () => {
      beforeEach(() => {
        mockRequest.user = {
          userId: 'user-123',
          role: 'USER',
          email: 'test@example.com',
        }
      })

      it('should use cached subscription instead of calling stripeService', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(stripeService.hasFeatureAccess).not.toHaveBeenCalled()
        expect(mockReply.status).not.toHaveBeenCalled()
      })

      it('should call stripeService if subscription is not cached', async () => {
        mockRequest.subscription = undefined
        ;(stripeService.hasFeatureAccess as jest.Mock).mockResolvedValueOnce(true)

        const middleware = requireSubscription(PlanType.STARTER)
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(stripeService.hasFeatureAccess).toHaveBeenCalledWith('user-123', PlanType.STARTER)
      })
    })
  })

  describe('requireActiveSubscription', () => {
    describe('Authentication Check', () => {
      it('should return 401 if user is not authenticated', async () => {
        await requireActiveSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(401)
        expect(mockReply.send).toHaveBeenCalledWith({
          success: false,
          error: 'Not authenticated',
        })
      })
    })

    describe('Active Subscription Check (Without Cached Subscription)', () => {
      beforeEach(() => {
        mockRequest.user = {
          userId: 'user-123',
          role: 'USER',
          email: 'test@example.com',
        }
        mockRequest.subscription = undefined
      })

      it('should allow user with active subscription', async () => {
        ;(stripeService.hasActiveSubscription as jest.Mock).mockResolvedValueOnce(true)

        await requireActiveSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(stripeService.hasActiveSubscription).toHaveBeenCalledWith('user-123')
        expect(mockReply.status).not.toHaveBeenCalled()
      })

      it('should deny user without active subscription', async () => {
        ;(stripeService.hasActiveSubscription as jest.Mock).mockResolvedValueOnce(false)

        await requireActiveSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(403)
        expect(mockReply.send).toHaveBeenCalledWith({
          success: false,
          error: 'Active subscription required',
          message: 'This feature requires an active subscription',
        })
      })
    })

    describe('Active Subscription Check (With Cached Subscription)', () => {
      beforeEach(() => {
        mockRequest.user = {
          userId: 'user-123',
          role: 'USER',
          email: 'test@example.com',
        }
      })

      it('should allow user with ACTIVE subscription', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await requireActiveSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).not.toHaveBeenCalled()
        expect(stripeService.hasActiveSubscription).not.toHaveBeenCalled()
      })

      it('should allow user with TRIALING subscription', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.TRIALING,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await requireActiveSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).not.toHaveBeenCalled()
      })

      it('should deny user with null subscription', async () => {
        mockRequest.subscription = null

        await requireActiveSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(403)
      })

      it('should deny user with CANCELED subscription', async () => {
        mockRequest.subscription = {
          id: 'sub-123',
          userId: 'user-123',
          stripeSubscriptionId: 'sub_stripe_123',
          planType: PlanType.STARTER,
          status: SubscriptionStatus.CANCELED,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await requireActiveSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(403)
      })
    })

    describe('Error Handling', () => {
      beforeEach(() => {
        mockRequest.user = {
          userId: 'user-123',
          role: 'USER',
          email: 'test@example.com',
        }
        mockRequest.subscription = undefined
      })

      it('should return 500 if stripeService throws error', async () => {
        ;(stripeService.hasActiveSubscription as jest.Mock).mockRejectedValueOnce(
          new Error('Service error')
        )

        await requireActiveSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).toHaveBeenCalledWith(500)
        expect(mockReply.send).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to verify subscription',
        })
      })
    })
  })

  describe('loadSubscription', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'USER',
        email: 'test@example.com',
      }
    })

    it('should load subscription and cache in request', async () => {
      const mockSubscription = {
        id: 'sub-123',
        userId: 'user-123',
        stripeSubscriptionId: 'sub_stripe_123',
        planType: PlanType.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(stripeService.getUserSubscription as jest.Mock).mockResolvedValueOnce(mockSubscription)

      await loadSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(stripeService.getUserSubscription).toHaveBeenCalledWith('user-123')
      expect(mockRequest.subscription).toEqual(mockSubscription)
    })

    it('should set subscription to null if user has no subscription', async () => {
      ;(stripeService.getUserSubscription as jest.Mock).mockResolvedValueOnce(null)

      await loadSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockRequest.subscription).toBeNull()
    })

    it('should handle undefined subscription response', async () => {
      ;(stripeService.getUserSubscription as jest.Mock).mockResolvedValueOnce(undefined)

      await loadSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockRequest.subscription).toBeNull()
    })

    it('should not load subscription if user is not authenticated', async () => {
      mockRequest.user = undefined

      await loadSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(stripeService.getUserSubscription).not.toHaveBeenCalled()
      expect(mockRequest.subscription).toBeUndefined()
    })

    it('should not call reply methods', async () => {
      ;(stripeService.getUserSubscription as jest.Mock).mockResolvedValueOnce(null)

      await loadSubscription(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })
  })
})
