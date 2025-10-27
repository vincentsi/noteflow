import { prismaMock } from '../../helpers/test-db'
import { GDPRService } from '../../../services/gdpr.service'
import { stripeService } from '../../../services/stripe.service'
import { Role, PlanType, SubscriptionStatus } from '@prisma/client'

jest.mock('../../../services/stripe.service')

describe('GDPRService', () => {
  let gdprService: GDPRService

  beforeEach(() => {
    gdprService = new GDPRService()
    jest.clearAllMocks()
  })

  describe('deleteUserData', () => {
    it('should delete user and Stripe customer', async () => {
      const userId = 'user-123'
      const stripeCustomerId = 'cus_123'

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test User',
        role: 'USER',
        emailVerified: true,
        planType: 'FREE',
        language: 'fr',
        stripeCustomerId,
        subscriptionStatus: 'NONE',
        subscriptionId: null,
        currentPeriodEnd: null,
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.refreshToken.count.mockResolvedValue(2)
      prismaMock.verificationToken.count.mockResolvedValue(1)
      prismaMock.passwordResetToken.count.mockResolvedValue(0)
      prismaMock.csrfToken.count.mockResolvedValue(3)
      prismaMock.subscription.count.mockResolvedValue(1)

      prismaMock.user.delete.mockResolvedValue({
        id: userId,
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test User',
        role: 'USER',
        emailVerified: true,
        planType: 'FREE',
        language: 'fr',
        stripeCustomerId,
        subscriptionStatus: 'NONE',
        subscriptionId: null,
        currentPeriodEnd: null,
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      jest.spyOn(stripeService, 'deleteCustomer').mockResolvedValue(undefined)

      const result = await gdprService.deleteUserData(userId)

      expect(result.success).toBe(true)
      expect(result.deletedData.user).toBe(true)
      expect(result.deletedData.stripeCustomer).toBe(true)
      expect(result.deletedData.refreshTokens).toBe(2)
      expect(result.deletedData.subscriptions).toBe(1)

      // Verify Stripe customer was deleted BEFORE database deletion
      expect(stripeService.deleteCustomer).toHaveBeenCalledWith(stripeCustomerId)
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      })
    })

    it('should delete user without Stripe customer', async () => {
      const userId = 'user-123'

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test User',
        role: 'USER',
        emailVerified: true,
        planType: 'FREE',
        language: 'fr',
        stripeCustomerId: null, // No Stripe customer
        subscriptionStatus: 'NONE',
        subscriptionId: null,
        currentPeriodEnd: null,
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.refreshToken.count.mockResolvedValue(1)
      prismaMock.verificationToken.count.mockResolvedValue(0)
      prismaMock.passwordResetToken.count.mockResolvedValue(0)
      prismaMock.csrfToken.count.mockResolvedValue(1)
      prismaMock.subscription.count.mockResolvedValue(0)

      prismaMock.user.delete.mockResolvedValue({
        id: userId,
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test User',
        role: 'USER',
        emailVerified: true,
        planType: 'FREE',
        language: 'fr',
        stripeCustomerId: null,
        subscriptionStatus: 'NONE',
        subscriptionId: null,
        currentPeriodEnd: null,
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      jest.spyOn(stripeService, 'deleteCustomer').mockResolvedValue(undefined)

      const result = await gdprService.deleteUserData(userId)

      expect(result.success).toBe(true)
      expect(result.deletedData.stripeCustomer).toBe(false)
      expect(stripeService.deleteCustomer).not.toHaveBeenCalled()
      expect(prismaMock.user.delete).toHaveBeenCalled()
    })

    it('should throw error if Stripe deletion fails (GDPR compliance)', async () => {
      const userId = 'user-123'
      const stripeCustomerId = 'cus_123'

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test User',
        role: 'USER',
        emailVerified: true,
        planType: 'PRO',
        language: 'fr',
        stripeCustomerId,
        subscriptionStatus: 'ACTIVE',
        subscriptionId: null,
        currentPeriodEnd: null,
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.refreshToken.count.mockResolvedValue(2)
      prismaMock.verificationToken.count.mockResolvedValue(1)
      prismaMock.passwordResetToken.count.mockResolvedValue(0)
      prismaMock.csrfToken.count.mockResolvedValue(3)
      prismaMock.subscription.count.mockResolvedValue(1)

      // Simulate Stripe API failure
      jest.spyOn(stripeService, 'deleteCustomer').mockRejectedValue(
        new Error('Stripe API error: Customer not found')
      )

      await expect(
        gdprService.deleteUserData(userId)
      ).rejects.toThrow('Failed to delete payment data. Aborting user deletion for GDPR compliance.')

      // Verify user was NOT deleted from database
      expect(prismaMock.user.delete).not.toHaveBeenCalled()
    })

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent-user'

      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(
        gdprService.deleteUserData(userId)
      ).rejects.toThrow('User not found')
    })
  })

  describe('exportUserData', () => {
    it('should export user data without password', async () => {
      const userId = 'user-123'

      const mockUserData = {
        id: userId,
        email: 'test@test.com',
        password: 'hashed-password',
        name: 'Test User',
        role: Role.USER,
        emailVerified: true,
        planType: PlanType.FREE,
        language: 'fr',
        stripeCustomerId: null,
        subscriptionStatus: SubscriptionStatus.NONE,
        subscriptionId: null,
        currentPeriodEnd: null,
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshTokens: [],
        verificationTokens: [],
        resetTokens: [],
        csrfTokens: [],
        subscriptions: [],
      }

      prismaMock.user.findUnique.mockResolvedValue(mockUserData)

      const result = await gdprService.exportUserData(userId)

      expect(result.user).toBeDefined()
      expect(result.user.email).toBe('test@test.com')
      expect('password' in result.user).toBe(false)
      expect(result.metadata.exportDate).toBeDefined()
      expect(result.personalData).toBeDefined()
    })
  })
})
