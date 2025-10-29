import { CacheService, CacheKeys } from '../../../services/cache.service'
import { getRedis, isRedisAvailable } from '../../../config/redis'
import { recordCacheHit, recordCacheMiss } from '../../../middlewares/metrics.middleware'
import { logger } from '../../../utils/logger'

// Mock dependencies
jest.mock('../../../config/redis')
jest.mock('../../../middlewares/metrics.middleware')
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

const mockRedis = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  flushdb: jest.fn(),
  info: jest.fn(),
  dbsize: jest.fn(),
  eval: jest.fn(),
}

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(isRedisAvailable as jest.Mock).mockReturnValue(true)
    ;(getRedis as jest.Mock).mockReturnValue(mockRedis)
  })

  describe('set', () => {
    it('should set value in cache with TTL', async () => {
      const key = 'test:key'
      const value = { id: '123', name: 'Test User' }
      const ttl = 3600

      await CacheService.set(key, value, ttl)

      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(value)
      )
    })

    it('should use default TTL of 3600 seconds if not provided', async () => {
      const key = 'test:key'
      const value = { data: 'test' }

      await CacheService.set(key, value)

      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        3600,
        JSON.stringify(value)
      )
    })

    it('should silently fail if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      await CacheService.set('test:key', { data: 'test' })

      expect(mockRedis.setex).not.toHaveBeenCalled()
    })

    it('should log error and not throw if setex fails', async () => {
      const error = new Error('Redis connection error')
      mockRedis.setex.mockRejectedValueOnce(error)

      await expect(
        CacheService.set('test:key', { data: 'test' })
      ).resolves.not.toThrow()

      expect(logger.error).toHaveBeenCalledWith(
        { error, key: 'test:key', ttl: 3600 },
        'Cache set error'
      )
    })

    it('should handle null Redis instance', async () => {
      ;(getRedis as jest.Mock).mockReturnValue(null)

      await CacheService.set('test:key', { data: 'test' })

      expect(mockRedis.setex).not.toHaveBeenCalled()
    })
  })

  describe('get', () => {
    it('should get value from cache and record cache hit', async () => {
      const key = 'user:123'
      const value = { id: '123', name: 'Test User' }
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(value))

      const result = await CacheService.get(key)

      expect(result).toEqual(value)
      expect(mockRedis.get).toHaveBeenCalledWith(key)
      expect(recordCacheHit).toHaveBeenCalledWith('user')
    })

    it('should return null and record cache miss if key not found', async () => {
      const key = 'user:123'
      mockRedis.get.mockResolvedValueOnce(null)

      const result = await CacheService.get(key)

      expect(result).toBeNull()
      expect(recordCacheMiss).toHaveBeenCalledWith('user')
    })

    it('should extract correct key prefix for metrics', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ data: 'test' }))

      await CacheService.get('subscription:user-123')
      expect(recordCacheHit).toHaveBeenCalledWith('subscription')

      mockRedis.get.mockResolvedValueOnce(null)
      await CacheService.get('article-count:user-456')
      expect(recordCacheMiss).toHaveBeenCalledWith('article-count')
    })

    it('should handle key without prefix', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ data: 'test' }))

      await CacheService.get('simplekey')

      expect(recordCacheHit).toHaveBeenCalledWith('simplekey')
    })

    it('should return null if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      const result = await CacheService.get('test:key')

      expect(result).toBeNull()
      expect(mockRedis.get).not.toHaveBeenCalled()
    })

    it('should return null and log error if get fails', async () => {
      const error = new Error('Redis read error')
      mockRedis.get.mockRejectedValueOnce(error)

      const result = await CacheService.get('test:key')

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        { error, key: 'test:key' },
        'Cache get error'
      )
    })

    it('should parse JSON correctly', async () => {
      const complexValue = {
        id: '123',
        nested: { field: 'value' },
        array: [1, 2, 3],
        date: new Date().toISOString(),
      }
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(complexValue))

      const result = await CacheService.get('test:key')

      expect(result).toEqual(complexValue)
    })
  })

  describe('delete', () => {
    it('should delete key from cache', async () => {
      const key = 'test:key'

      await CacheService.delete(key)

      expect(mockRedis.del).toHaveBeenCalledWith(key)
    })

    it('should silently fail if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      await CacheService.delete('test:key')

      expect(mockRedis.del).not.toHaveBeenCalled()
    })

    it('should log error if delete fails', async () => {
      const error = new Error('Redis delete error')
      mockRedis.del.mockRejectedValueOnce(error)

      await CacheService.delete('test:key')

      expect(logger.error).toHaveBeenCalledWith(
        { error, key: 'test:key' },
        'Cache delete error'
      )
    })
  })

  describe('deletePattern', () => {
    it('should delete all keys matching pattern using SCAN', async () => {
      // Mock SCAN to return keys in batches
      mockRedis.scan
        .mockResolvedValueOnce(['1', ['user:1', 'user:2', 'user:3']])
        .mockResolvedValueOnce(['2', ['user:4', 'user:5']])
        .mockResolvedValueOnce(['0', ['user:6']]) // cursor '0' means complete

      await CacheService.deletePattern('user:*')

      // Should call SCAN 3 times
      expect(mockRedis.scan).toHaveBeenCalledTimes(3)
      expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'user:*', 'COUNT', 100)

      // Should delete all keys in batches
      expect(mockRedis.del).toHaveBeenCalledWith('user:1', 'user:2', 'user:3', 'user:4', 'user:5', 'user:6')
    })

    it('should delete keys in batches when count exceeds batch size', async () => {
      // Create 150 keys (exceeds DELETE_BATCH_SIZE of 100)
      const keys = Array.from({ length: 150 }, (_, i) => `user:${i}`)
      mockRedis.scan
        .mockResolvedValueOnce(['1', keys.slice(0, 100)])
        .mockResolvedValueOnce(['0', keys.slice(100)])

      await CacheService.deletePattern('user:*')

      // Should delete all keys (implementation batches internally, but calls del once with all keys)
      expect(mockRedis.del).toHaveBeenCalled()
      const allDeletedKeys = mockRedis.del.mock.calls.flatMap(call => call)
      expect(allDeletedKeys).toHaveLength(150)
    })

    it('should handle empty result from SCAN', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', []])

      await CacheService.deletePattern('nonexistent:*')

      expect(mockRedis.del).not.toHaveBeenCalled()
    })

    it('should log deleted key count', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', ['key1', 'key2', 'key3']])

      await CacheService.deletePattern('test:*')

      expect(logger.info).toHaveBeenCalledWith(
        { count: 3, pattern: 'test:*' },
        'Deleted cache keys matching pattern'
      )
    })

    it('should silently fail if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      await CacheService.deletePattern('user:*')

      expect(mockRedis.scan).not.toHaveBeenCalled()
    })

    it('should log error if deletePattern fails', async () => {
      const error = new Error('Redis SCAN error')
      mockRedis.scan.mockRejectedValueOnce(error)

      await CacheService.deletePattern('user:*')

      expect(logger.error).toHaveBeenCalledWith(
        { error, pattern: 'user:*' },
        'Cache delete pattern error'
      )
    })
  })

  describe('getWithVersion', () => {
    it('should get value with version number', async () => {
      const key = 'user:123'
      const value = { id: '123', name: 'Test' }
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(value)) // data
        .mockResolvedValueOnce('5') // version

      const result = await CacheService.getWithVersion(key)

      expect(result).toEqual({
        data: value,
        version: 5,
      })
      expect(mockRedis.get).toHaveBeenCalledWith(key)
      expect(mockRedis.get).toHaveBeenCalledWith('user:123:version')
    })

    it('should return version 0 if no version exists', async () => {
      const key = 'user:123'
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify({ id: '123' }))
        .mockResolvedValueOnce(null) // no version

      const result = await CacheService.getWithVersion(key)

      expect(result.version).toBe(0)
    })

    it('should return null data and version 0 if key not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null)

      const result = await CacheService.getWithVersion('user:123')

      expect(result).toEqual({
        data: null,
        version: 0,
      })
      expect(recordCacheMiss).toHaveBeenCalledWith('user')
    })

    it('should record cache hit when data exists', async () => {
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify({ data: 'test' }))
        .mockResolvedValueOnce('1')

      await CacheService.getWithVersion('user:123')

      expect(recordCacheHit).toHaveBeenCalledWith('user')
    })
  })

  describe('setWithVersion', () => {
    it('should set value if version matches using Lua script', async () => {
      mockRedis.eval.mockResolvedValueOnce(1) // success

      const result = await CacheService.setWithVersion(
        'user:123',
        { id: '123' },
        5,
        3600
      )

      expect(result).toBe(true)
      expect(mockRedis.eval).toHaveBeenCalled()

      // Check Lua script parameters
      const [_script, keyCount, key, versionKey, expectedVersion, _serialized, ttl] =
        mockRedis.eval.mock.calls[0]

      expect(keyCount).toBe(2)
      expect(key).toBe('user:123')
      expect(versionKey).toBe('user:123:version')
      expect(expectedVersion).toBe('5')
      expect(ttl).toBe('3600')
    })

    it('should return false if version does not match', async () => {
      mockRedis.eval.mockResolvedValueOnce(0) // version mismatch

      const result = await CacheService.setWithVersion(
        'user:123',
        { id: '123' },
        5,
        3600
      )

      expect(result).toBe(false)
    })

    it('should return false if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      const result = await CacheService.setWithVersion('user:123', {}, 1)

      expect(result).toBe(false)
      expect(mockRedis.eval).not.toHaveBeenCalled()
    })

    it('should log error and return false if eval fails', async () => {
      const error = new Error('Lua script error')
      mockRedis.eval.mockRejectedValueOnce(error)

      const result = await CacheService.setWithVersion('user:123', {}, 1)

      expect(result).toBe(false)
      expect(logger.error).toHaveBeenCalledWith(
        { error, key: 'user:123' },
        'Cache setWithVersion error'
      )
    })
  })

  describe('invalidateVersion', () => {
    it('should increment version key', async () => {
      await CacheService.invalidateVersion('user:123')

      expect(mockRedis.incr).toHaveBeenCalledWith('user:123:version')
      expect(mockRedis.expire).toHaveBeenCalledWith('user:123:version', 3600)
    })

    it('should silently fail if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      await CacheService.invalidateVersion('user:123')

      expect(mockRedis.incr).not.toHaveBeenCalled()
    })

    it('should log error if invalidate fails', async () => {
      const error = new Error('Redis incr error')
      mockRedis.incr.mockRejectedValueOnce(error)

      await CacheService.invalidateVersion('user:123')

      expect(logger.error).toHaveBeenCalledWith(
        { error, key: 'user:123' },
        'Cache invalidateVersion error'
      )
    })
  })

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedis.exists.mockResolvedValueOnce(1)

      const result = await CacheService.exists('user:123')

      expect(result).toBe(true)
      expect(mockRedis.exists).toHaveBeenCalledWith('user:123')
    })

    it('should return false if key does not exist', async () => {
      mockRedis.exists.mockResolvedValueOnce(0)

      const result = await CacheService.exists('user:123')

      expect(result).toBe(false)
    })

    it('should return false if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      const result = await CacheService.exists('user:123')

      expect(result).toBe(false)
      expect(mockRedis.exists).not.toHaveBeenCalled()
    })

    it('should return false and log error if exists fails', async () => {
      const error = new Error('Redis exists error')
      mockRedis.exists.mockRejectedValueOnce(error)

      const result = await CacheService.exists('user:123')

      expect(result).toBe(false)
      expect(logger.error).toHaveBeenCalledWith(
        { error, key: 'user:123' },
        'Cache exists error'
      )
    })
  })

  describe('increment', () => {
    it('should increment counter and set TTL on first increment', async () => {
      mockRedis.incr.mockResolvedValueOnce(1) // first increment

      const result = await CacheService.increment('ratelimit:login:192.168.1.1', 900)

      expect(result).toBe(1)
      expect(mockRedis.incr).toHaveBeenCalledWith('ratelimit:login:192.168.1.1')
      expect(mockRedis.expire).toHaveBeenCalledWith('ratelimit:login:192.168.1.1', 900)
    })

    it('should not set TTL on subsequent increments', async () => {
      mockRedis.incr.mockResolvedValueOnce(5) // not first increment

      const result = await CacheService.increment('ratelimit:login:192.168.1.1', 900)

      expect(result).toBe(5)
      expect(mockRedis.expire).not.toHaveBeenCalled()
    })

    it('should use default TTL of 3600 if not provided', async () => {
      mockRedis.incr.mockResolvedValueOnce(1)

      await CacheService.increment('counter:test')

      expect(mockRedis.expire).toHaveBeenCalledWith('counter:test', 3600)
    })

    it('should return 0 if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      const result = await CacheService.increment('counter:test')

      expect(result).toBe(0)
      expect(mockRedis.incr).not.toHaveBeenCalled()
    })

    it('should return 0 and log error if increment fails', async () => {
      const error = new Error('Redis incr error')
      mockRedis.incr.mockRejectedValueOnce(error)

      const result = await CacheService.increment('counter:test')

      expect(result).toBe(0)
      expect(logger.error).toHaveBeenCalledWith(
        { error, key: 'counter:test' },
        'Cache increment error'
      )
    })
  })

  describe('getTTL', () => {
    it('should return TTL in seconds', async () => {
      mockRedis.ttl.mockResolvedValueOnce(3600)

      const result = await CacheService.getTTL('user:123')

      expect(result).toBe(3600)
      expect(mockRedis.ttl).toHaveBeenCalledWith('user:123')
    })

    it('should return -1 if key has no TTL', async () => {
      mockRedis.ttl.mockResolvedValueOnce(-1)

      const result = await CacheService.getTTL('user:123')

      expect(result).toBe(-1)
    })

    it('should return -2 if key does not exist', async () => {
      mockRedis.ttl.mockResolvedValueOnce(-2)

      const result = await CacheService.getTTL('user:123')

      expect(result).toBe(-2)
    })

    it('should return -2 if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      const result = await CacheService.getTTL('user:123')

      expect(result).toBe(-2)
      expect(mockRedis.ttl).not.toHaveBeenCalled()
    })
  })

  describe('clearAll', () => {
    it('should clear all cache using flushdb', async () => {
      await CacheService.clearAll()

      expect(mockRedis.flushdb).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('Cache cleared successfully')
    })

    it('should silently fail if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      await CacheService.clearAll()

      expect(mockRedis.flushdb).not.toHaveBeenCalled()
    })

    it('should log error if clearAll fails', async () => {
      const error = new Error('Redis flushdb error')
      mockRedis.flushdb.mockRejectedValueOnce(error)

      await CacheService.clearAll()

      expect(logger.error).toHaveBeenCalledWith(
        { error },
        'Cache clear all error'
      )
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockInfo = 'redis_version:6.2.0\ntotal_connections_received:100'
      mockRedis.info.mockResolvedValueOnce(mockInfo)
      mockRedis.dbsize.mockResolvedValueOnce(1234)

      const result = await CacheService.getStats()

      expect(result).toEqual({
        available: true,
        keys: 1234,
        info: mockInfo,
      })
      expect(mockRedis.info).toHaveBeenCalledWith('stats')
      expect(mockRedis.dbsize).toHaveBeenCalled()
    })

    it('should return unavailable stats if Redis is not available', async () => {
      ;(isRedisAvailable as jest.Mock).mockReturnValue(false)

      const result = await CacheService.getStats()

      expect(result).toEqual({
        available: false,
        keys: 0,
        memory: '0 B',
      })
    })

    it('should return unavailable stats if getStats fails', async () => {
      const error = new Error('Redis stats error')
      mockRedis.info.mockRejectedValueOnce(error)

      const result = await CacheService.getStats()

      expect(result).toEqual({
        available: false,
        keys: 0,
        memory: '0 B',
      })
      expect(logger.error).toHaveBeenCalledWith(
        { error },
        'Cache stats error'
      )
    })
  })

  describe('CacheKeys', () => {
    it('should generate correct cache keys with version prefix', () => {
      expect(CacheKeys.user('123')).toBe('v1:user:123')
      expect(CacheKeys.userByEmail('test@example.com')).toBe(
        'v1:user:email:test@example.com'
      )
      expect(CacheKeys.subscription('user-123')).toBe('v1:subscription:user-123')
      expect(CacheKeys.featureAccess('user-123', 'PRO')).toBe(
        'v1:feature-access:user-123:PRO'
      )
      expect(CacheKeys.articleCount('user-123')).toBe('v1:article-count:user-123')
    })

    it('should generate summary usage keys with year and month', () => {
      expect(CacheKeys.summaryUsage('user-123', 2024, 12)).toBe(
        'v1:summary-usage:user-123:2024-12'
      )
    })

    it('should generate rate limit keys without version prefix', () => {
      expect(CacheKeys.rateLimit('192.168.1.1', '/api/login')).toBe(
        'ratelimit:/api/login:192.168.1.1'
      )
    })

    it('should generate session keys with version prefix', () => {
      expect(CacheKeys.session('session-abc123')).toBe('v1:session:session-abc123')
    })

    it('should generate CSRF keys without version prefix', () => {
      expect(CacheKeys.csrf('user-123', 'hash-abc')).toBe(
        'csrf:user-123:hash-abc'
      )
    })
  })
})
