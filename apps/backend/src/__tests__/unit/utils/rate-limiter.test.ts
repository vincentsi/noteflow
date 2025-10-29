import {
  checkRateLimit,
  resetRateLimit,
  getRemainingAttempts,
} from '../../../utils/rate-limiter'
import { CacheService } from '../../../services/cache.service'
import { isRedisAvailable } from '../../../config/redis'

// Mock dependencies
jest.mock('../../../config/redis', () => ({
  isRedisAvailable: jest.fn(),
}))

jest.mock('../../../services/cache.service', () => ({
  CacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    increment: jest.fn(),
    getTTL: jest.fn(),
  },
}))

describe('rate-limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear in-memory store by requiring fresh module
    jest.resetModules()
  })

  describe('checkRateLimit with Redis', () => {
    beforeEach(() => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(true)
    })

    it('should allow first attempt and set counter', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

      const result = await checkRateLimit('test-key', 5, 60000)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
      expect(CacheService.set).toHaveBeenCalledWith('ratelimit:test-key', 1, 60)
    })

    it('should allow second attempt and increment counter', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(1)

      const result = await checkRateLimit('test-key', 5, 60000)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(3)
      expect(CacheService.increment).toHaveBeenCalledWith('ratelimit:test-key')
    })

    it('should allow up to max attempts', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(4)

      const result = await checkRateLimit('test-key', 5, 60000)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)
      expect(CacheService.increment).toHaveBeenCalled()
    })

    it('should deny when max attempts reached', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(5)
      ;(CacheService.getTTL as jest.Mock).mockResolvedValueOnce(3600)

      const result = await checkRateLimit('test-key', 5, 60000)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(CacheService.increment).not.toHaveBeenCalled()
    })

    it('should deny when attempts exceed max', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(10)
      ;(CacheService.getTTL as jest.Mock).mockResolvedValueOnce(3600)

      const result = await checkRateLimit('test-key', 5, 60000)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should prefix key with "ratelimit:"', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

      await checkRateLimit('user:email:test@example.com', 3, 60000)

      expect(CacheService.get).toHaveBeenCalledWith('ratelimit:user:email:test@example.com')
      expect(CacheService.set).toHaveBeenCalledWith(
        'ratelimit:user:email:test@example.com',
        1,
        60
      )
    })

    it('should convert windowMs to seconds for TTL', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

      await checkRateLimit('test-key', 5, 3600000) // 1 hour in ms

      expect(CacheService.set).toHaveBeenCalledWith('ratelimit:test-key', 1, 3600) // seconds
    })

    it('should return resetAt timestamp', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

      const now = Date.now()
      const result = await checkRateLimit('test-key', 5, 60000)

      expect(result.resetAt).toBeInstanceOf(Date)
      expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(now + 60000)
    })

    it('should get actual reset time from TTL when rate limited', async () => {
      const now = Date.now()
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(5)
      ;(CacheService.getTTL as jest.Mock).mockResolvedValueOnce(1800) // 30 min remaining

      const result = await checkRateLimit('test-key', 5, 60000)

      expect(result.allowed).toBe(false)
      expect(CacheService.getTTL).toHaveBeenCalledWith('ratelimit:test-key')
      expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(now + 1800000)
    })

    it('should handle different time windows', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

      const oneHour = 60 * 60 * 1000
      await checkRateLimit('test-key', 10, oneHour)

      expect(CacheService.set).toHaveBeenCalledWith('ratelimit:test-key', 1, 3600)
    })
  })

  describe('checkRateLimit without Redis (in-memory fallback)', () => {
    beforeEach(() => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)
    })

    it('should allow first attempt with in-memory store', async () => {
      const result = await checkRateLimit('test-key', 5, 60000)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
      expect(CacheService.set).not.toHaveBeenCalled()
    })

    it('should track subsequent attempts in memory', async () => {
      const { checkRateLimit: checkRateLimitFresh } = await import('../../../utils/rate-limiter')

      await checkRateLimitFresh('memory-key', 3, 60000)
      const result2 = await checkRateLimitFresh('memory-key', 3, 60000)
      const result3 = await checkRateLimitFresh('memory-key', 3, 60000)

      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(1)
      expect(result3.allowed).toBe(true)
      expect(result3.remaining).toBe(0)
    })

    it('should deny when max attempts reached in memory', async () => {
      const { checkRateLimit: checkRateLimitFresh } = await import('../../../utils/rate-limiter')

      await checkRateLimitFresh('memory-key2', 2, 60000)
      await checkRateLimitFresh('memory-key2', 2, 60000)
      const result3 = await checkRateLimitFresh('memory-key2', 2, 60000)

      expect(result3.allowed).toBe(false)
      expect(result3.remaining).toBe(0)
    })

    it('should reset after window expires in memory', async () => {
      const { checkRateLimit: checkRateLimitFresh } = await import('../../../utils/rate-limiter')

      // Set window to 1ms so it expires immediately
      await checkRateLimitFresh('expire-key', 2, 1)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 5))

      const result = await checkRateLimitFresh('expire-key', 2, 60000)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)
    })

    it('should handle different keys independently in memory', async () => {
      const { checkRateLimit: checkRateLimitFresh } = await import('../../../utils/rate-limiter')

      await checkRateLimitFresh('key-a', 3, 60000)
      await checkRateLimitFresh('key-a', 3, 60000)

      const resultA = await checkRateLimitFresh('key-a', 3, 60000)
      const resultB = await checkRateLimitFresh('key-b', 3, 60000)

      expect(resultA.remaining).toBe(0)
      expect(resultB.remaining).toBe(2)
    })
  })

  describe('resetRateLimit', () => {
    it('should delete Redis key when Redis available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(true)

      await resetRateLimit('test-key')

      expect(CacheService.delete).toHaveBeenCalledWith('ratelimit:test-key')
    })

    it('should clear in-memory entry when Redis unavailable', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      const { checkRateLimit: checkRateLimitFresh, resetRateLimit: resetRateLimitFresh } =
        await import('../../../utils/rate-limiter')

      // Add some attempts
      await checkRateLimitFresh('reset-key', 3, 60000)
      await checkRateLimitFresh('reset-key', 3, 60000)

      // Reset
      await resetRateLimitFresh('reset-key')

      // Should start fresh
      const result = await checkRateLimitFresh('reset-key', 3, 60000)
      expect(result.remaining).toBe(2)
    })

    it('should handle resetting non-existent key', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(true)

      await expect(resetRateLimit('non-existent-key')).resolves.not.toThrow()

      expect(CacheService.delete).toHaveBeenCalledWith('ratelimit:non-existent-key')
    })
  })

  describe('getRemainingAttempts', () => {
    describe('with Redis', () => {
      beforeEach(() => {
        ;(isRedisAvailable as jest.Mock).mockReturnValue(true)
      })

      it('should return max attempts if no limit active', async () => {
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

        const remaining = await getRemainingAttempts('test-key', 5)

        expect(remaining).toBe(5)
      })

      it('should return remaining attempts', async () => {
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(2)

        const remaining = await getRemainingAttempts('test-key', 5)

        expect(remaining).toBe(3)
      })

      it('should return 0 when max reached', async () => {
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(5)

        const remaining = await getRemainingAttempts('test-key', 5)

        expect(remaining).toBe(0)
      })

      it('should return 0 when count exceeds max', async () => {
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(10)

        const remaining = await getRemainingAttempts('test-key', 5)

        expect(remaining).toBe(0)
      })

      it('should prefix key with "ratelimit:"', async () => {
        ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

        await getRemainingAttempts('test-key', 5)

        expect(CacheService.get).toHaveBeenCalledWith('ratelimit:test-key')
      })
    })

    describe('without Redis (in-memory)', () => {
      beforeEach(() => {
        ;(isRedisAvailable as jest.Mock).mockReturnValue(false)
      })

      it('should return max attempts if no entry', async () => {
        const remaining = await getRemainingAttempts('new-key', 5)

        expect(remaining).toBe(5)
      })

      it('should return remaining from in-memory store', async () => {
        const {
          checkRateLimit: checkRateLimitFresh,
          getRemainingAttempts: getRemainingAttemptsFresh,
        } = await import('../../../utils/rate-limiter')

        await checkRateLimitFresh('memory-key', 5, 60000)
        await checkRateLimitFresh('memory-key', 5, 60000)

        const remaining = await getRemainingAttemptsFresh('memory-key', 5)

        expect(remaining).toBe(3)
      })

      it('should return max attempts if window expired', async () => {
        const {
          checkRateLimit: checkRateLimitFresh,
          getRemainingAttempts: getRemainingAttemptsFresh,
        } = await import('../../../utils/rate-limiter')

        await checkRateLimitFresh('expire-key', 5, 1)

        // Wait for window to expire
        await new Promise(resolve => setTimeout(resolve, 5))

        const remaining = await getRemainingAttemptsFresh('expire-key', 5)

        expect(remaining).toBe(5)
      })
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(true)
    })

    it('should handle maxAttempts of 1', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

      const result1 = await checkRateLimit('strict-key', 1, 60000)
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(0)
    })

    it('should handle very short time windows', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

      const result = await checkRateLimit('short-window', 5, 100) // 100ms

      expect(result.allowed).toBe(true)
      expect(CacheService.set).toHaveBeenCalledWith('ratelimit:short-window', 1, 1)
    })

    it('should handle very long time windows', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

      const oneDay = 24 * 60 * 60 * 1000
      await checkRateLimit('long-window', 10, oneDay)

      expect(CacheService.set).toHaveBeenCalledWith('ratelimit:long-window', 1, 86400)
    })

    it('should handle special characters in keys', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)

      await checkRateLimit('email:test+user@example.com', 3, 60000)

      expect(CacheService.get).toHaveBeenCalledWith('ratelimit:email:test+user@example.com')
    })

    it('should return consistent resetAt across attempts', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(null)
      const result1 = await checkRateLimit('consistent-key', 5, 60000)

      ;(CacheService.get as jest.Mock).mockResolvedValueOnce(1)
      const result2 = await checkRateLimit('consistent-key', 5, 60000)

      // ResetAt should be roughly the same (within 1 second tolerance)
      const diff = Math.abs(result1.resetAt.getTime() - result2.resetAt.getTime())
      expect(diff).toBeLessThan(1000)
    })
  })
})
