import { prismaMock } from '../../helpers/test-db'
import { SummaryService } from '../../../services/summary.service'
import { PlanType, SummaryStyle } from '@prisma/client'
import { queueSummary } from '../../../queues/summary.queue'

jest.mock('../../../queues/summary.queue')

describe('SummaryService', () => {
  let summaryService: SummaryService

  beforeEach(() => {
    summaryService = new SummaryService()
    jest.clearAllMocks()
  })

  describe('createSummary', () => {
    it('should create summary job and return jobId', async () => {
      const mockJob = { id: 'job-123' }

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.FREE,
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

      prismaMock.summary.count.mockResolvedValue(2)
      ;(queueSummary as jest.Mock).mockResolvedValue(mockJob)

      const result = await summaryService.createSummary(
        'user-123',
        'Long text to summarize',
        SummaryStyle.SHORT,
        'fr'
      )

      expect(result.jobId).toBe('job-123')
      expect(queueSummary).toHaveBeenCalledWith({
        userId: 'user-123',
        text: 'Long text to summarize',
        style: SummaryStyle.SHORT,
        language: 'fr',
      })
    })

    it('should check plan limits before creating job (FREE plan)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.FREE,
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

      prismaMock.summary.count.mockResolvedValue(5) // At FREE limit

      await expect(
        summaryService.createSummary(
          'user-123',
          'Text',
          SummaryStyle.SHORT,
          'fr'
        )
      ).rejects.toThrow('Summary limit reached')
    })

    it('should check plan limits for STARTER plan', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.STARTER,
        language: 'fr',
        stripeCustomerId: null,
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

      prismaMock.summary.count.mockResolvedValue(20) // At STARTER limit

      await expect(
        summaryService.createSummary(
          'user-123',
          'Text',
          SummaryStyle.SHORT,
          'fr'
        )
      ).rejects.toThrow('Summary limit reached')
    })

    it('should allow PRO users unlimited summaries', async () => {
      const mockJob = { id: 'job-456' }

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.PRO,
        language: 'fr',
        stripeCustomerId: null,
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

      prismaMock.summary.count.mockResolvedValue(9999) // Way over any limit
      ;(queueSummary as jest.Mock).mockResolvedValue(mockJob)

      const result = await summaryService.createSummary(
        'user-123',
        'Text',
        SummaryStyle.SHORT,
        'fr'
      )

      expect(result.jobId).toBe('job-456')
      expect(queueSummary).toHaveBeenCalled()
    })

    it('should count summaries from current month only', async () => {
      const mockJob = { id: 'job-789' }

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.FREE,
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

      prismaMock.summary.count.mockResolvedValue(3)
      ;(queueSummary as jest.Mock).mockResolvedValue(mockJob)

      const result = await summaryService.createSummary(
        'user-123',
        'Text',
        SummaryStyle.SHORT,
        'fr'
      )

      expect(result.jobId).toBe('job-789')

      // Verify that count was called with date filter (current month)
      expect(prismaMock.summary.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(
        summaryService.createSummary(
          'invalid-user',
          'Text',
          SummaryStyle.SHORT,
          'fr'
        )
      ).rejects.toThrow('User not found')
    })
  })
})
