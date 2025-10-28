import { getRedis, isRedisAvailable } from '@/config/redis'
import { recordCacheHit, recordCacheMiss } from '@/middlewares/metrics.middleware'
import { logger } from '@/utils/logger'
import { CACHE_CONFIG } from '@/constants/performance'

/**
 * Redis Cache Service
 *
 * Production-grade caching layer with enterprise features:
 * - Automatic JSON serialization/deserialization
 * - TTL (Time To Live) support with per-key configuration
 * - Graceful degradation (app works without Redis)
 * - Non-blocking pattern deletion (SCAN instead of KEYS)
 * - Type-safe operations with TypeScript generics
 * - Counter/increment support for rate limiting
 * - Cache statistics and monitoring
 *
 * @ai-prompt When modifying this service:
 * - NEVER use KEYS command (use SCAN for pattern deletion, non-blocking)
 * - ALWAYS handle errors gracefully (cache failures should NOT break app)
 * - Default TTL is 1 hour (3600 seconds) - adjust per use case
 * - JSON serialization automatic (no manual stringify/parse in calling code)
 * - deletePattern() uses batching to avoid memory issues with millions of keys
 * - increment() automatically sets TTL on first increment (rate limiting pattern)
 * - clearAll() uses flushdb (dangerous in production, consider flushdb ASYNC)
 * - isRedisAvailable() check prevents errors when Redis is down
 * - Use CacheKeys helpers for consistent key naming (user:123, subscription:456)
 * - Consider cache stampede protection for high-traffic keys (not implemented yet)
 *
 * @example
 * ```typescript
 * // Basic caching
 * await CacheService.set('user:123', userData, 3600)  // 1 hour
 * const user = await CacheService.get<User>('user:123')
 *
 * // Pattern deletion (invalidation)
 * await CacheService.deletePattern('user:*')  // Delete all user cache
 *
 * // Rate limiting with counters
 * const count = await CacheService.increment('ratelimit:login:192.168.1.1', 900)  // 15min
 * if (count > 5) throw new Error('Rate limit exceeded')
 *
 * // Consistent key naming
 * const key = CacheKeys.user(userId)  // Returns 'user:123'
 * await CacheService.set(key, userData, 300)  // 5min TTL
 * ```
 */
export class CacheService {
  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache (will be JSON stringified)
   * @param ttl Time to live in seconds (default: 1 hour)
   */
  static async set(key: string, value: unknown, ttl: number = 3600): Promise<void> {
    if (!isRedisAvailable()) {
      return // Silently fail if Redis not available
    }

    try {
      const redis = getRedis()
      if (!redis) return

      const serialized = JSON.stringify(value)
      await redis.setex(key, ttl, serialized)
    } catch (error) {
      logger.error({ error, key, ttl }, 'Cache set error')
      // Don't throw - cache errors should not break the app
    }
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  static async get<T = unknown>(key: string): Promise<T | null> {
    if (!isRedisAvailable()) {
      return null // Silently return null if Redis not available
    }

    try {
      const redis = getRedis()
      if (!redis) return null

      const cached = await redis.get(key)

      // Extract cache key prefix for metrics (e.g., 'user' from 'user:123')
      const keyPrefix = key.split(':')[0] || 'unknown'

      if (!cached) {
        // Cache miss
        recordCacheMiss(keyPrefix)
        return null
      }

      // Cache hit
      recordCacheHit(keyPrefix)
      return JSON.parse(cached) as T
    } catch (error) {
      logger.error({ error, key }, 'Cache get error')
      return null // Return null on error
    }
  }

  /**
   * Delete value from cache
   * @param key Cache key
   */
  static async delete(key: string): Promise<void> {
    if (!isRedisAvailable()) {
      return
    }

    try {
      const redis = getRedis()
      if (!redis) return

      await redis.del(key)
    } catch (error) {
      logger.error({ error, key }, 'Cache delete error')
    }
  }

  /**
   * Delete multiple keys matching a pattern using SCAN (non-blocking)
   * @param pattern Pattern to match (e.g., "user:*")
   *
   * Uses SCAN instead of KEYS to avoid blocking Redis.
   * SCAN iterates through the keyspace in small batches without blocking other operations.
   */
  static async deletePattern(pattern: string): Promise<void> {
    if (!isRedisAvailable()) {
      return
    }

    try {
      const redis = getRedis()
      if (!redis) return

      let cursor = '0'
      const keysToDelete: string[] = []

      // SCAN iterates with cursor until it returns '0' (full cycle complete)
      do {
        // SCAN returns [nextCursor, keys]
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          CACHE_CONFIG.SCAN_BATCH_SIZE
        )

        cursor = nextCursor
        keysToDelete.push(...keys)

        // Delete in batches to avoid memory issues with large datasets
        if (keysToDelete.length >= CACHE_CONFIG.DELETE_BATCH_SIZE) {
          if (keysToDelete.length > 0) {
            await redis.del(...keysToDelete)
            logger.info(
              { count: keysToDelete.length, pattern },
              'Deleted cache keys matching pattern'
            )
          }
          keysToDelete.length = 0 // Clear array
        }
      } while (cursor !== '0')

      // Delete remaining keys
      if (keysToDelete.length > 0) {
        await redis.del(...keysToDelete)
        logger.info(
          { count: keysToDelete.length, pattern },
          'Deleted cache keys matching pattern'
        )
      }
    } catch (error) {
      logger.error({ error, pattern }, 'Cache delete pattern error')
    }
  }

  /**
   * Get value with version check for race condition prevention (PERF-004)
   * @param key Cache key
   * @returns Object with data and version number
   */
  static async getWithVersion<T = unknown>(key: string): Promise<{ data: T | null; version: number }> {
    if (!isRedisAvailable()) {
      return { data: null, version: 0 }
    }

    try {
      const redis = getRedis()
      if (!redis) return { data: null, version: 0 }

      const versionKey = `${key}:version`
      const [cached, versionStr] = await Promise.all([
        redis.get(key),
        redis.get(versionKey),
      ])

      const version = versionStr ? parseInt(versionStr, 10) : 0
      const keyPrefix = key.split(':')[0] || 'unknown'

      if (!cached) {
        recordCacheMiss(keyPrefix)
        return { data: null, version }
      }

      recordCacheHit(keyPrefix)
      return {
        data: JSON.parse(cached) as T,
        version,
      }
    } catch (error) {
      logger.error({ error, key }, 'Cache getWithVersion error')
      return { data: null, version: 0 }
    }
  }

  /**
   * Set value with version check to prevent stale data (PERF-004)
   * @param key Cache key
   * @param value Value to cache
   * @param expectedVersion Expected version (from getWithVersion)
   * @param ttl Time to live in seconds
   * @returns true if set successfully, false if version mismatch
   */
  static async setWithVersion(
    key: string,
    value: unknown,
    expectedVersion: number,
    ttl: number = 3600
  ): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false
    }

    try {
      const redis = getRedis()
      if (!redis) return false

      const versionKey = `${key}:version`
      const serialized = JSON.stringify(value)

      // Use Lua script for atomic version check + set
      // This prevents race conditions between check and set
      const script = `
        local current_version = redis.call('GET', KEYS[2])
        if current_version == false then
          current_version = '0'
        end

        if tonumber(current_version) == tonumber(ARGV[1]) then
          redis.call('SETEX', KEYS[1], ARGV[3], ARGV[2])
          redis.call('SETEX', KEYS[2], ARGV[3], tostring(tonumber(current_version) + 1))
          return 1
        else
          return 0
        end
      `

      const result = await redis.eval(
        script,
        2,
        key,
        versionKey,
        expectedVersion.toString(),
        serialized,
        ttl.toString()
      )

      return result === 1
    } catch (error) {
      logger.error({ error, key }, 'Cache setWithVersion error')
      return false
    }
  }

  /**
   * Invalidate cache by incrementing version (PERF-004)
   * This makes all existing cached data for this key stale
   * @param key Cache key
   */
  static async invalidateVersion(key: string): Promise<void> {
    if (!isRedisAvailable()) {
      return
    }

    try {
      const redis = getRedis()
      if (!redis) return

      const versionKey = `${key}:version`
      await redis.incr(versionKey)
      // Set TTL on version key to match data TTL
      await redis.expire(versionKey, 3600)
    } catch (error) {
      logger.error({ error, key }, 'Cache invalidateVersion error')
    }
  }

  /**
   * Check if key exists in cache
   * @param key Cache key
   */
  static async exists(key: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false
    }

    try {
      const redis = getRedis()
      if (!redis) return false

      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      logger.error({ error, key }, 'Cache exists error')
      return false
    }
  }

  /**
   * Increment a counter
   * Useful for rate limiting
   * @param key Counter key
   * @param ttl TTL in seconds (default: 1 hour)
   */
  static async increment(key: string, ttl: number = 3600): Promise<number> {
    if (!isRedisAvailable()) {
      return 0
    }

    try {
      const redis = getRedis()
      if (!redis) return 0

      const count = await redis.incr(key)

      // Set TTL only on first increment
      if (count === 1) {
        await redis.expire(key, ttl)
      }

      return count
    } catch (error) {
      logger.error({ error, key }, 'Cache increment error')
      return 0
    }
  }

  /**
   * Get TTL (time to live) of a key in seconds
   * @param key Cache key
   * @returns TTL in seconds, -1 if no TTL, -2 if key doesn't exist
   */
  static async getTTL(key: string): Promise<number> {
    if (!isRedisAvailable()) {
      return -2
    }

    try {
      const redis = getRedis()
      if (!redis) return -2

      return await redis.ttl(key)
    } catch (error) {
      logger.error({ error, key }, 'Cache getTTL error')
      return -2
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  static async clearAll(): Promise<void> {
    if (!isRedisAvailable()) {
      return
    }

    try {
      const redis = getRedis()
      if (!redis) return

      await redis.flushdb()
      logger.info('Cache cleared successfully')
    } catch (error) {
      logger.error({ error }, 'Cache clear all error')
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats() {
    if (!isRedisAvailable()) {
      return {
        available: false,
        keys: 0,
        memory: '0 B',
      }
    }

    try {
      const redis = getRedis()
      if (!redis) {
        return {
          available: false,
          keys: 0,
          memory: '0 B',
        }
      }

      const info = await redis.info('stats')
      const dbsize = await redis.dbsize()

      return {
        available: true,
        keys: dbsize,
        info,
      }
    } catch (error) {
      logger.error({ error }, 'Cache stats error')
      return {
        available: false,
        keys: 0,
        memory: '0 B',
      }
    }
  }
}

/**
 * Cache version - Increment when data structure changes to invalidate old cache
 * This prevents stale data issues when cache schemas evolve
 *
 * @example
 * v1 -> v2: Added 'planType' field to user cache
 * v2 -> v3: Changed subscription structure
 */
const CACHE_VERSION = 'v1'

/**
 * Cache key builders
 * Centralize cache key naming for consistency and versioning
 *
 * All keys include version prefix to prevent collisions after schema changes
 */
export const CacheKeys = {
  // User cache
  user: (userId: string) => `${CACHE_VERSION}:user:${userId}`,
  userByEmail: (email: string) => `${CACHE_VERSION}:user:email:${email}`,

  // Subscription cache
  subscription: (userId: string) => `${CACHE_VERSION}:subscription:${userId}`,

  // Feature access cache
  featureAccess: (userId: string, plan: string) =>
    `${CACHE_VERSION}:feature-access:${userId}:${plan}`,

  // Article count cache
  articleCount: (userId: string) => `${CACHE_VERSION}:article-count:${userId}`,

  // Summary usage cache (monthly)
  summaryUsage: (userId: string, year: number, month: number) =>
    `${CACHE_VERSION}:summary-usage:${userId}:${year}-${month}`,

  // Rate limit cache (no version needed - short-lived data)
  rateLimit: (identifier: string, endpoint: string) =>
    `ratelimit:${endpoint}:${identifier}`,

  // Session cache (optional)
  session: (sessionId: string) => `${CACHE_VERSION}:session:${sessionId}`,

  // CSRF tokens (no version needed - ephemeral data)
  csrf: (userId: string, tokenHash: string) => `csrf:${userId}:${tokenHash}`,
} as const
