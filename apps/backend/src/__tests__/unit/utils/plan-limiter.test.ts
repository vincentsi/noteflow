import { PlanLimiter } from '../../../utils/plan-limiter'
import { prisma } from '../../../config/prisma'
import { CacheService } from '../../../services/cache.service'
import { PlanType } from '@prisma/client'
import { PlanLimitError, NotFoundError } from '../../../utils/custom-errors'

// Mock dependencies
jest.mock('../../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    savedArticle: {
      count: jest.fn(),
    },
    summary: {
      count: jest.fn(),
    },
    note: {
      count: jest.fn(),
    },
  },
}))

jest.mock('../../../services/cache.service', () => ({
  CacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
  CacheKeys: {
    articleCount: jest.fn((userId: string) => `article-count:${userId}`),
  },
}))

jest.mock('@/utils/cache-key-helpers', () => ({
  getSummaryUsageCacheKey: jest.fn((userId: string) => `summary:usage:${userId}:2024:0`),
}))

describe('PlanLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkLimit', () => {
    describe('User Validation', () => {
      it('should throw NotFoundError if user does not exist', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)

        await expect(PlanLimiter.checkLimit('user-123', 'article')).rejects.toThrow(
          NotFoundError
        )
        await expect(PlanLimiter.checkLimit('user-123', 'article')).rejects.toThrow(
          'User not found'
        )
      })

      it('should query user with correct parameters', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(5)

        await PlanLimiter.checkLimit('user-456', 'article')

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user-456' },
          select: { planType: true },
        })
      })
    })

    describe('Article Limits', () => {
      it('should allow FREE user with 9 articles to save another (limit 10)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(9)

        await expect(PlanLimiter.checkLimit('user-123', 'article')).resolves.not.toThrow()
      })

      it('should deny FREE user with 10 articles (limit 10)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(10)

        await expect(PlanLimiter.checkLimit('user-123', 'article')).rejects.toThrow(
          'Article limit reached. Your FREE plan allows 10 saved articles.'
        )
      })

      it('should allow STARTER user with 49 articles to save another (limit 50)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.STARTER,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(49)

        await expect(PlanLimiter.checkLimit('user-123', 'article')).resolves.not.toThrow()
      })

      it('should deny STARTER user with 50 articles (limit 50)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.STARTER,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(50)

        await expect(PlanLimiter.checkLimit('user-123', 'article')).rejects.toThrow(
          'Article limit reached. Your STARTER plan allows 50 saved articles.'
        )
      })

      it('should always allow PRO user regardless of article count (unlimited)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.PRO,
        })

        await expect(PlanLimiter.checkLimit('user-123', 'article')).resolves.not.toThrow()

        // Should not even query cache/DB for count
        expect(CacheService.get).not.toHaveBeenCalled()
      })
    })

    describe('Summary Limits', () => {
      it('should allow FREE user with 4 summaries this month (limit 5)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(4)

        await expect(PlanLimiter.checkLimit('user-123', 'summary')).resolves.not.toThrow()
      })

      it('should deny FREE user with 5 summaries this month (limit 5)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(5)

        await expect(PlanLimiter.checkLimit('user-123', 'summary')).rejects.toThrow(
          'Summary limit reached. Your FREE plan allows 5 summaries/month.'
        )
      })

      it('should allow STARTER user with 19 summaries this month (limit 20)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.STARTER,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(19)

        await expect(PlanLimiter.checkLimit('user-123', 'summary')).resolves.not.toThrow()
      })

      it('should deny STARTER user with 20 summaries this month (limit 20)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.STARTER,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(20)

        await expect(PlanLimiter.checkLimit('user-123', 'summary')).rejects.toThrow(
          'Summary limit reached. Your STARTER plan allows 20 summaries/month.'
        )
      })

      it('should always allow PRO user for summaries (unlimited)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.PRO,
        })

        await expect(PlanLimiter.checkLimit('user-123', 'summary')).resolves.not.toThrow()

        expect(CacheService.get).not.toHaveBeenCalled()
      })
    })

    describe('Note Limits', () => {
      it('should allow FREE user with 19 notes (limit 20)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(19)

        await expect(PlanLimiter.checkLimit('user-123', 'note')).resolves.not.toThrow()
      })

      it('should deny FREE user with 20 notes (limit 20)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(20)

        await expect(PlanLimiter.checkLimit('user-123', 'note')).rejects.toThrow(
          'Note limit reached. Your FREE plan allows 20 notes.'
        )
      })

      it('should allow STARTER user with 99 notes (limit 100)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.STARTER,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(99)

        await expect(PlanLimiter.checkLimit('user-123', 'note')).resolves.not.toThrow()
      })

      it('should deny STARTER user with 100 notes (limit 100)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.STARTER,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(100)

        await expect(PlanLimiter.checkLimit('user-123', 'note')).rejects.toThrow(
          'Note limit reached. Your STARTER plan allows 100 notes.'
        )
      })

      it('should always allow PRO user for notes (unlimited)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.PRO,
        })

        await expect(PlanLimiter.checkLimit('user-123', 'note')).resolves.not.toThrow()

        expect(CacheService.get).not.toHaveBeenCalled()
      })
    })

    describe('Caching Behavior', () => {
      it('should use cached count if available', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(5)

        await PlanLimiter.checkLimit('user-123', 'article')

        expect(CacheService.get).toHaveBeenCalled()
        expect(prisma.savedArticle.count).not.toHaveBeenCalled()
      })

      it('should query database if cache miss', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null) // Cache miss
        ;(prisma.savedArticle.count as jest.Mock).mockResolvedValueOnce(7)

        await PlanLimiter.checkLimit('user-123', 'article')

        expect(CacheService.get).toHaveBeenCalled()
        expect(prisma.savedArticle.count).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
        })
        expect(CacheService.set).toHaveBeenCalled()
      })

      it('should cache database result after query', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.STARTER,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)
        ;(prisma.note.count as jest.Mock).mockResolvedValueOnce(42)

        await PlanLimiter.checkLimit('user-123', 'note')

        expect(CacheService.set).toHaveBeenCalledWith(
          'note-count:user-123',
          42,
          expect.any(Number)
        )
      })
    })

    describe('Edge Cases', () => {
      it('should handle exactly at limit (boundary)', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(10)

        await expect(PlanLimiter.checkLimit('user-123', 'article')).rejects.toThrow(
          PlanLimitError
        )
      })

      it('should handle one below limit', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(9)

        await expect(PlanLimiter.checkLimit('user-123', 'article')).resolves.not.toThrow()
      })

      it('should handle zero usage', async () => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
          planType: PlanType.FREE,
        })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(0)

        await expect(PlanLimiter.checkLimit('user-123', 'article')).resolves.not.toThrow()
      })
    })
  })

  describe('invalidateCache', () => {
    it('should delete article cache', async () => {
      await PlanLimiter.invalidateCache('user-123', 'article')

      expect(CacheService.delete).toHaveBeenCalledWith('article-count:user-123')
    })

    it('should delete summary cache', async () => {
      await PlanLimiter.invalidateCache('user-456', 'summary')

      expect(CacheService.delete).toHaveBeenCalledWith('summary:usage:user-456:2024:0')
    })

    it('should delete note cache', async () => {
      await PlanLimiter.invalidateCache('user-789', 'note')

      expect(CacheService.delete).toHaveBeenCalledWith('note-count:user-789')
    })
  })

  describe('getQuota', () => {
    it('should return quota for FREE user with articles', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        planType: PlanType.FREE,
      })
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(7)

      const quota = await PlanLimiter.getQuota('user-123', 'article')

      expect(quota).toEqual({
        used: 7,
        limit: 10,
        remaining: 3,
      })
    })

    it('should return quota for STARTER user with summaries', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        planType: PlanType.STARTER,
      })
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(15)

      const quota = await PlanLimiter.getQuota('user-123', 'summary')

      expect(quota).toEqual({
        used: 15,
        limit: 20,
        remaining: 5,
      })
    })

    it('should return unlimited quota for PRO user', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        planType: PlanType.PRO,
      })
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)
      ;(prisma.note.count as jest.Mock).mockResolvedValueOnce(500)

      const quota = await PlanLimiter.getQuota('user-123', 'note')

      expect(quota).toEqual({
        used: 500,
        limit: 'unlimited',
        remaining: 'unlimited',
      })
    })

    it('should return 0 remaining when at limit', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        planType: PlanType.FREE,
      })
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(5)

      const quota = await PlanLimiter.getQuota('user-123', 'summary')

      expect(quota).toEqual({
        used: 5,
        limit: 5,
        remaining: 0,
      })
    })

    it('should return 0 remaining when over limit', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        planType: PlanType.FREE,
      })
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(12)

      const quota = await PlanLimiter.getQuota('user-123', 'article')

      expect(quota).toEqual({
        used: 12,
        limit: 10,
        remaining: 0,
      })
    })

    it('should throw NotFoundError if user does not exist', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(PlanLimiter.getQuota('user-123', 'article')).rejects.toThrow(
        NotFoundError
      )
    })

    it('should query database if cache miss', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        planType: PlanType.STARTER,
      })
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)
      ;(prisma.savedArticle.count as jest.Mock).mockResolvedValueOnce(25)

      const quota = await PlanLimiter.getQuota('user-123', 'article')

      expect(prisma.savedArticle.count).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      })
      expect(quota.used).toBe(25)
    })
  })

  describe('Plan Hierarchy', () => {
    it('should enforce different limits per plan for articles', async () => {
      const plans: Array<{ plan: PlanType; count: number; shouldPass: boolean }> = [
        { plan: PlanType.FREE, count: 10, shouldPass: false },
        { plan: PlanType.FREE, count: 9, shouldPass: true },
        { plan: PlanType.STARTER, count: 50, shouldPass: false },
        { plan: PlanType.STARTER, count: 49, shouldPass: true },
        { plan: PlanType.PRO, count: 999999, shouldPass: true },
      ]

      for (const { plan, count, shouldPass } of plans) {
        jest.clearAllMocks()
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ planType: plan })
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(count)

        if (shouldPass) {
          await expect(PlanLimiter.checkLimit('user-123', 'article')).resolves.not.toThrow()
        } else {
          await expect(PlanLimiter.checkLimit('user-123', 'article')).rejects.toThrow(
            PlanLimitError
          )
        }
      }
    })

    it('should enforce different limits per plan for summaries', async () => {
      const plans: Array<{ plan: PlanType; count: number; shouldPass: boolean }> = [
        { plan: PlanType.FREE, count: 5, shouldPass: false },
        { plan: PlanType.FREE, count: 4, shouldPass: true },
        { plan: PlanType.STARTER, count: 20, shouldPass: false },
        { plan: PlanType.STARTER, count: 19, shouldPass: true },
        { plan: PlanType.PRO, count: 999999, shouldPass: true },
      ]

      for (const { plan, count, shouldPass } of plans) {
        jest.clearAllMocks()
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ planType: plan })
        ;(CacheService.get as jest.Mock).mockResolvedValue(count)

        if (shouldPass) {
          await expect(PlanLimiter.checkLimit('user-123', 'summary')).resolves.not.toThrow()
        } else {
          await expect(PlanLimiter.checkLimit('user-123', 'summary')).rejects.toThrow(
            PlanLimitError
          )
        }
      }
    })

    it('should enforce different limits per plan for notes', async () => {
      const plans: Array<{ plan: PlanType; count: number; shouldPass: boolean }> = [
        { plan: PlanType.FREE, count: 20, shouldPass: false },
        { plan: PlanType.FREE, count: 19, shouldPass: true },
        { plan: PlanType.STARTER, count: 100, shouldPass: false },
        { plan: PlanType.STARTER, count: 99, shouldPass: true },
        { plan: PlanType.PRO, count: 999999, shouldPass: true },
      ]

      for (const { plan, count, shouldPass } of plans) {
        jest.clearAllMocks()
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ planType: plan })
        ;(CacheService.get as jest.Mock).mockResolvedValue(count)

        if (shouldPass) {
          await expect(PlanLimiter.checkLimit('user-123', 'note')).resolves.not.toThrow()
        } else {
          await expect(PlanLimiter.checkLimit('user-123', 'note')).rejects.toThrow(
            PlanLimitError
          )
        }
      }
    })
  })
})
