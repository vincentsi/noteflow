import { getSummaryUsageCacheKey } from '../../../utils/cache-key-helpers'
import { CacheKeys } from '../../../services/cache.service'

// Mock CacheKeys.summaryUsage
jest.mock('../../../services/cache.service', () => ({
  CacheKeys: {
    summaryUsage: jest.fn((userId: string, year: number, month: number) => {
      return `summary:usage:${userId}:${year}:${month}`
    }),
  },
}))

describe('cache-key-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSummaryUsageCacheKey', () => {
    it('should generate cache key with provided date', () => {
      const userId = 'user-123'
      const date = new Date('2024-03-15T10:30:00Z')

      const key = getSummaryUsageCacheKey(userId, date)

      expect(CacheKeys.summaryUsage).toHaveBeenCalledWith(userId, 2024, 2) // March = month 2 (0-indexed)
      expect(key).toBe('summary:usage:user-123:2024:2')
    })

    it('should use current date if no date provided', () => {
      const userId = 'user-456'
      const now = new Date()

      const key = getSummaryUsageCacheKey(userId)

      expect(CacheKeys.summaryUsage).toHaveBeenCalledWith(
        userId,
        now.getFullYear(),
        now.getMonth()
      )
      expect(key).toContain('summary:usage:user-456')
    })

    it('should handle January correctly (month 0)', () => {
      const userId = 'user-123'
      const date = new Date('2024-01-15T10:30:00Z')

      const key = getSummaryUsageCacheKey(userId, date)

      expect(CacheKeys.summaryUsage).toHaveBeenCalledWith(userId, 2024, 0)
      expect(key).toBe('summary:usage:user-123:2024:0')
    })

    it('should handle December correctly (month 11)', () => {
      const userId = 'user-123'
      const date = new Date('2024-12-15T12:00:00Z')

      const key = getSummaryUsageCacheKey(userId, date)

      expect(CacheKeys.summaryUsage).toHaveBeenCalledWith(userId, 2024, 11)
      expect(key).toBe('summary:usage:user-123:2024:11')
    })

    it('should handle month boundary consistently', () => {
      const userId = 'user-123'

      // Middle of February
      const midFeb = new Date('2024-02-15T12:00:00Z')
      const keyFeb = getSummaryUsageCacheKey(userId, midFeb)

      // Middle of March
      const midMar = new Date('2024-03-15T12:00:00Z')
      const keyMar = getSummaryUsageCacheKey(userId, midMar)

      // Keys should be different
      expect(keyFeb).toBe('summary:usage:user-123:2024:1') // February
      expect(keyMar).toBe('summary:usage:user-123:2024:2') // March
      expect(keyFeb).not.toBe(keyMar)
    })

    it('should handle year boundary correctly', () => {
      const userId = 'user-123'

      // Middle of December 2023
      const midDec2023 = new Date('2023-12-15T12:00:00Z')
      const key2023 = getSummaryUsageCacheKey(userId, midDec2023)

      // Middle of January 2024
      const midJan2024 = new Date('2024-01-15T12:00:00Z')
      const key2024 = getSummaryUsageCacheKey(userId, midJan2024)

      expect(key2023).toBe('summary:usage:user-123:2023:11') // December 2023
      expect(key2024).toBe('summary:usage:user-123:2024:0')  // January 2024
      expect(key2023).not.toBe(key2024)
    })

    it('should generate same key for same user and date', () => {
      const userId = 'user-123'
      const date = new Date('2024-05-15T10:30:00Z')

      const key1 = getSummaryUsageCacheKey(userId, date)
      const key2 = getSummaryUsageCacheKey(userId, date)

      expect(key1).toBe(key2)
    })

    it('should generate different keys for different users', () => {
      const date = new Date('2024-05-15T10:30:00Z')

      const key1 = getSummaryUsageCacheKey('user-123', date)
      const key2 = getSummaryUsageCacheKey('user-456', date)

      expect(key1).not.toBe(key2)
      expect(key1).toBe('summary:usage:user-123:2024:4')
      expect(key2).toBe('summary:usage:user-456:2024:4')
    })

    it('should generate different keys for different months', () => {
      const userId = 'user-123'

      const march = new Date('2024-03-15T10:30:00Z')
      const april = new Date('2024-04-15T10:30:00Z')

      const keyMarch = getSummaryUsageCacheKey(userId, march)
      const keyApril = getSummaryUsageCacheKey(userId, april)

      expect(keyMarch).not.toBe(keyApril)
      expect(keyMarch).toBe('summary:usage:user-123:2024:2')
      expect(keyApril).toBe('summary:usage:user-123:2024:3')
    })

    it('should generate different keys for different years', () => {
      const userId = 'user-123'

      const year2023 = new Date('2023-05-15T10:30:00Z')
      const year2024 = new Date('2024-05-15T10:30:00Z')

      const key2023 = getSummaryUsageCacheKey(userId, year2023)
      const key2024 = getSummaryUsageCacheKey(userId, year2024)

      expect(key2023).not.toBe(key2024)
      expect(key2023).toBe('summary:usage:user-123:2023:4')
      expect(key2024).toBe('summary:usage:user-123:2024:4')
    })

    it('should handle dates at different times of the same day consistently', () => {
      const userId = 'user-123'
      const date = '2024-05-15'

      const morning = new Date(`${date}T08:00:00Z`)
      const noon = new Date(`${date}T12:00:00Z`)
      const evening = new Date(`${date}T20:00:00Z`)

      const keyMorning = getSummaryUsageCacheKey(userId, morning)
      const keyNoon = getSummaryUsageCacheKey(userId, noon)
      const keyEvening = getSummaryUsageCacheKey(userId, evening)

      // All should generate the same key since they're in the same month
      expect(keyMorning).toBe(keyNoon)
      expect(keyNoon).toBe(keyEvening)
      expect(keyMorning).toBe('summary:usage:user-123:2024:4')
    })

    it('should call CacheKeys.summaryUsage with correct parameters', () => {
      const userId = 'user-789'
      const date = new Date('2024-07-20T15:45:00Z')

      getSummaryUsageCacheKey(userId, date)

      expect(CacheKeys.summaryUsage).toHaveBeenCalledTimes(1)
      expect(CacheKeys.summaryUsage).toHaveBeenCalledWith(userId, 2024, 6) // July = month 6
    })

    it('should handle leap year February correctly', () => {
      const userId = 'user-123'

      // 2024 is a leap year
      const leapYearFeb29 = new Date('2024-02-29T12:00:00Z')
      const keyLeap = getSummaryUsageCacheKey(userId, leapYearFeb29)

      expect(keyLeap).toBe('summary:usage:user-123:2024:1')
    })

    it('should handle timezone differences correctly', () => {
      const userId = 'user-123'

      // Same moment in time, different timezone representations
      const utc = new Date('2024-05-15T23:00:00Z')
      const keyUtc = getSummaryUsageCacheKey(userId, utc)

      // Key should be based on the date object's year/month
      expect(keyUtc).toBe('summary:usage:user-123:2024:4')
    })

    it('should handle invalid dates gracefully', () => {
      const userId = 'user-123'
      const invalidDate = new Date('invalid')

      const key = getSummaryUsageCacheKey(userId, invalidDate)

      // Should still call CacheKeys.summaryUsage with NaN values
      expect(CacheKeys.summaryUsage).toHaveBeenCalledWith(userId, NaN, NaN)
      expect(key).toBe('summary:usage:user-123:NaN:NaN')
    })

    it('should be used consistently between service and worker code', () => {
      const userId = 'user-123'
      const summaryCreatedAt = new Date('2024-03-15T10:30:00Z')

      // Service uses current date
      const serviceKey = getSummaryUsageCacheKey(userId, new Date('2024-03-15T10:30:00Z'))

      // Worker uses summary.createdAt for consistency
      const workerKey = getSummaryUsageCacheKey(userId, summaryCreatedAt)

      // Both should generate the same key
      expect(serviceKey).toBe(workerKey)
    })
  })
})
