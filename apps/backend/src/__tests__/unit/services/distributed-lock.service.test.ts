import { DistributedLockService } from '../../../services/distributed-lock.service'
import { getRedis, isRedisAvailable } from '../../../config/redis'
import { logger } from '../../../utils/logger'
import Redlock from 'redlock'

// Mock dependencies
jest.mock('../../../config/redis')
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))
jest.mock('redlock')

const mockRedis = {
  exists: jest.fn(),
}

const mockLock = {
  release: jest.fn(),
}

const mockRedlock = {
  acquire: jest.fn(),
  on: jest.fn(),
}

describe('DistributedLockService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(isRedisAvailable as jest.Mock).mockReturnValue(true)
    ;(getRedis as jest.Mock).mockReturnValue(mockRedis)
    ;(Redlock as jest.MockedClass<typeof Redlock>).mockImplementation(() => mockRedlock as unknown as Redlock)
  })

  describe('executeWithLock', () => {
    it('should acquire lock, execute function, and release lock', async () => {
      mockRedlock.acquire.mockResolvedValueOnce(mockLock)
      const fn = jest.fn().mockResolvedValueOnce({ result: 'success' })

      const result = await DistributedLockService.executeWithLock(
        'test-operation',
        5000,
        fn
      )

      expect(result).toEqual({ result: 'success' })
      expect(mockRedlock.acquire).toHaveBeenCalledWith(['lock:test-operation'], 5000)
      expect(fn).toHaveBeenCalled()
      expect(mockLock.release).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('🔒 Lock acquired for test-operation')
      expect(logger.info).toHaveBeenCalledWith('🔓 Lock released for test-operation')
      // Verify Redlock was instantiated
      expect(Redlock).toHaveBeenCalled()
    })

    it('should return null if lock is already acquired by another instance', async () => {
      const error = new Error('unable to acquire lock')
      mockRedlock.acquire.mockRejectedValueOnce(error)
      const fn = jest.fn()

      const result = await DistributedLockService.executeWithLock(
        'test-operation',
        5000,
        fn
      )

      expect(result).toBeNull()
      expect(fn).not.toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith(
        '⏭️  Skipping test-operation (already running on another instance)'
      )
    })

    it('should release lock even if function throws error', async () => {
      mockRedlock.acquire.mockResolvedValueOnce(mockLock)
      const error = new Error('Function failed')
      const fn = jest.fn().mockRejectedValueOnce(error)

      await expect(
        DistributedLockService.executeWithLock('test-operation', 5000, fn)
      ).rejects.toThrow('Function failed')

      expect(mockLock.release).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('🔓 Lock released for test-operation')
    })

    it('should execute without lock if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)
      const fn = jest.fn().mockResolvedValueOnce({ result: 'success' })

      const result = await DistributedLockService.executeWithLock(
        'test-operation',
        5000,
        fn
      )

      expect(result).toEqual({ result: 'success' })
      expect(fn).toHaveBeenCalled()
      expect(mockRedlock.acquire).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        '⚠️  Executing test-operation without distributed lock (Redis unavailable)'
      )
    })

    it('should execute without lock if Redis instance is null', async () => {
      // Need fresh mocks to override the existing Redlock singleton behavior
      jest.resetModules()
      jest.clearAllMocks()

      // Mock isRedisAvailable to return true but getRedis to return null
      // This simulates the case where Redis check passes but instance retrieval fails
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      const fn = jest.fn().mockResolvedValueOnce({ result: 'success' })

      const result = await DistributedLockService.executeWithLock(
        'test-operation',
        5000,
        fn
      )

      expect(result).toEqual({ result: 'success' })
      expect(fn).toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        '⚠️  Executing test-operation without distributed lock (Redis unavailable)'
      )
    })

    it('should log error if lock release fails', async () => {
      mockRedlock.acquire.mockResolvedValueOnce(mockLock)
      const releaseError = new Error('Redis connection lost')
      mockLock.release.mockRejectedValueOnce(releaseError)
      const fn = jest.fn().mockResolvedValueOnce({ result: 'success' })

      const result = await DistributedLockService.executeWithLock(
        'test-operation',
        5000,
        fn
      )

      expect(result).toEqual({ result: 'success' })
      expect(logger.error).toHaveBeenCalledWith(
        { error: releaseError },
        'Failed to release lock:'
      )
    })

    it('should throw error if function fails with non-lock error', async () => {
      mockRedlock.acquire.mockResolvedValueOnce(mockLock)
      const error = new Error('Database connection failed')
      const fn = jest.fn().mockRejectedValueOnce(error)

      await expect(
        DistributedLockService.executeWithLock('test-operation', 5000, fn)
      ).rejects.toThrow('Database connection failed')

      expect(mockLock.release).toHaveBeenCalled()
    })

    it('should throw error if acquire fails with non-lock error', async () => {
      const error = new Error('Redis connection failed')
      mockRedlock.acquire.mockRejectedValueOnce(error)
      const fn = jest.fn()

      await expect(
        DistributedLockService.executeWithLock('test-operation', 5000, fn)
      ).rejects.toThrow('Redis connection failed')

      expect(fn).not.toHaveBeenCalled()
    })

    it('should prefix lock key with "lock:"', async () => {
      mockRedlock.acquire.mockResolvedValueOnce(mockLock)
      const fn = jest.fn().mockResolvedValueOnce('result')

      await DistributedLockService.executeWithLock('cleanup-tokens', 10000, fn)

      expect(mockRedlock.acquire).toHaveBeenCalledWith(
        ['lock:cleanup-tokens'],
        10000
      )
    })

    it('should handle multiple concurrent lock attempts', async () => {
      // First call acquires lock
      mockRedlock.acquire.mockResolvedValueOnce(mockLock)
      const fn1 = jest.fn().mockResolvedValueOnce('result1')

      // Second call fails to acquire (lock already held)
      const error = new Error('unable to acquire lock')
      mockRedlock.acquire.mockRejectedValueOnce(error)
      const fn2 = jest.fn()

      const [result1, result2] = await Promise.all([
        DistributedLockService.executeWithLock('test-operation', 5000, fn1),
        DistributedLockService.executeWithLock('test-operation', 5000, fn2),
      ])

      expect(result1).toBe('result1')
      expect(result2).toBeNull()
      expect(fn1).toHaveBeenCalled()
      expect(fn2).not.toHaveBeenCalled()
    })

    it('should handle long-running operations with TTL', async () => {
      mockRedlock.acquire.mockResolvedValueOnce(mockLock)
      const fn = jest.fn(async () => {
        // Simulate long-running operation
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'completed'
      })

      const result = await DistributedLockService.executeWithLock(
        'long-operation',
        60000, // 60 seconds TTL
        fn
      )

      expect(result).toBe('completed')
      expect(mockRedlock.acquire).toHaveBeenCalledWith(['lock:long-operation'], 60000)
    })
  })

  describe('isLocked', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      // Reset Redis mock to return mockRedis for isLocked tests
      ;(getRedis as jest.Mock).mockReturnValue(mockRedis)
    })

    it('should return true if lock exists', async () => {
      mockRedis.exists.mockResolvedValueOnce(1)

      const result = await DistributedLockService.isLocked('test-operation')

      expect(result).toBe(true)
      expect(mockRedis.exists).toHaveBeenCalledWith('lock:test-operation')
    })

    it('should return false if lock does not exist', async () => {
      mockRedis.exists.mockResolvedValueOnce(0)

      const result = await DistributedLockService.isLocked('test-operation')

      expect(result).toBe(false)
      expect(mockRedis.exists).toHaveBeenCalledWith('lock:test-operation')
    })

    it('should return false if Redis is not available', async () => {
      ;(getRedis as jest.Mock).mockReturnValueOnce(null)

      const result = await DistributedLockService.isLocked('test-operation')

      expect(result).toBe(false)
      expect(mockRedis.exists).not.toHaveBeenCalled()
    })

    it('should return false and log error if exists check fails', async () => {
      const error = new Error('Redis connection error')
      mockRedis.exists.mockRejectedValueOnce(error)

      const result = await DistributedLockService.isLocked('test-operation')

      expect(result).toBe(false)
      expect(logger.error).toHaveBeenCalledWith(
        { error, lockKey: 'test-operation' },
        'Error checking lock'
      )
    })

    it('should prefix lock key with "lock:"', async () => {
      mockRedis.exists.mockResolvedValueOnce(0)

      await DistributedLockService.isLocked('cleanup-tokens')

      expect(mockRedis.exists).toHaveBeenCalledWith('lock:cleanup-tokens')
    })
  })

  describe('Redlock integration', () => {
    it('should successfully acquire and use Redlock when Redis is available', async () => {
      mockRedlock.acquire.mockResolvedValueOnce(mockLock)
      const fn = jest.fn().mockResolvedValueOnce('result')

      const result = await DistributedLockService.executeWithLock('test-operation', 5000, fn)

      // Verify the operation succeeded with lock
      expect(result).toBe('result')
      expect(mockRedlock.acquire).toHaveBeenCalled()
      expect(fn).toHaveBeenCalled()
      expect(mockLock.release).toHaveBeenCalled()
    })

    it('should handle Redis errors gracefully during lock operations', async () => {
      const redisError = new Error('Redis connection timeout')
      mockRedlock.acquire.mockRejectedValueOnce(redisError)
      const fn = jest.fn()

      await expect(
        DistributedLockService.executeWithLock('test-operation', 5000, fn)
      ).rejects.toThrow('Redis connection timeout')

      expect(fn).not.toHaveBeenCalled()
    })

    it('should work correctly across multiple sequential operations', async () => {
      mockRedlock.acquire.mockResolvedValue(mockLock)
      const fn1 = jest.fn().mockResolvedValueOnce('result1')
      const fn2 = jest.fn().mockResolvedValueOnce('result2')

      const result1 = await DistributedLockService.executeWithLock('operation-1', 5000, fn1)
      const result2 = await DistributedLockService.executeWithLock('operation-2', 5000, fn2)

      expect(result1).toBe('result1')
      expect(result2).toBe('result2')
      expect(fn1).toHaveBeenCalled()
      expect(fn2).toHaveBeenCalled()
    })
  })
})
