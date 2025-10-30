import { AccountLockoutService } from '../../../services/account-lockout.service'
import { CacheService } from '../../../services/cache.service'
import { securityLogger } from '../../../utils/security-logger'

// Mock dependencies
jest.mock('../../../services/cache.service')
jest.mock('../../../utils/security-logger', () => ({
  securityLogger: {
    accountLocked: jest.fn(),
    authFailure: jest.fn(),
  },
}))

describe('AccountLockoutService', () => {
  const testEmail = 'test@example.com'
  const testIp = '192.168.1.1'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkLockout', () => {
    it('should not throw error if no lockout exists', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValue(null)

      await expect(AccountLockoutService.checkLockout(testEmail, testIp)).resolves.not.toThrow()
    })

    it('should throw error if email is locked', async () => {
      const lockoutTime = new Date(Date.now() + 60000).toISOString()
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce({
        attempts: 5,
        lockedUntil: lockoutTime,
      })

      await expect(AccountLockoutService.checkLockout(testEmail, testIp)).rejects.toThrow(
        'Account temporarily locked'
      )
    })

    it('should throw error if IP is locked', async () => {
      const lockoutTime = new Date(Date.now() + 300000).toISOString()
      ;(CacheService.get as jest.Mock)
        .mockResolvedValueOnce(null) // Email not locked
        .mockResolvedValueOnce({
          // IP locked
          attempts: 10,
          lockedUntil: lockoutTime,
        })

      await expect(AccountLockoutService.checkLockout(testEmail, testIp)).rejects.toThrow(
        'Too many failed login attempts from your IP'
      )
    })

    it('should not throw if lockout expired', async () => {
      const expiredTime = new Date(Date.now() - 60000).toISOString()
      ;(CacheService.get as jest.Mock).mockResolvedValue({
        attempts: 10,
        lockedUntil: expiredTime,
      })

      await expect(AccountLockoutService.checkLockout(testEmail, testIp)).resolves.not.toThrow()
    })
  })

  describe('recordFailedAttempt', () => {
    it('should increment attempt counters', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValue({ attempts: 2 })
      ;(CacheService.set as jest.Mock).mockResolvedValue(undefined)

      await AccountLockoutService.recordFailedAttempt(testEmail, testIp)

      // Should call set to increment (2 times: email + IP)
      expect(CacheService.set).toHaveBeenCalled()
      expect(securityLogger.authFailure).toHaveBeenCalled()
    })

    it('should log failed attempt', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValue(null)
      ;(CacheService.set as jest.Mock).mockResolvedValue(undefined)

      await AccountLockoutService.recordFailedAttempt(testEmail, testIp)

      expect(securityLogger.authFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          email: testEmail,
          ip: testIp,
        })
      )
    })

    it('should apply lockout after threshold', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValue({ attempts: 3 })
      ;(CacheService.set as jest.Mock).mockResolvedValue(undefined)

      await AccountLockoutService.recordFailedAttempt(testEmail, testIp)

      // Should set lockout data
      expect(CacheService.set).toHaveBeenCalled()
    })
  })

  describe('resetAttempts', () => {
    it('should delete both email and IP lockout keys', async () => {
      ;(CacheService.delete as jest.Mock).mockResolvedValue(undefined)

      await AccountLockoutService.resetAttempts(testEmail, testIp)

      expect(CacheService.delete).toHaveBeenCalledWith(`lockout:email:${testEmail}`)
      expect(CacheService.delete).toHaveBeenCalledWith(`lockout:ip:${testIp}`)
    })

    it('should not throw error if keys do not exist', async () => {
      ;(CacheService.delete as jest.Mock).mockResolvedValue(undefined)

      await expect(AccountLockoutService.resetAttempts(testEmail, testIp)).resolves.not.toThrow()
    })
  })

  describe('Progressive Backoff', () => {
    it('should use 24h TTL for attempt counters', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValue(null)
      ;(CacheService.set as jest.Mock).mockResolvedValue(undefined)

      await AccountLockoutService.recordFailedAttempt(testEmail, testIp)

      // Should call set with 24h TTL (86400 seconds)
      const calls = (CacheService.set as jest.Mock).mock.calls
      expect(calls.some(call => call[2] === 86400)).toBe(true)
    })

    it('should log account lockouts', async () => {
      const lockoutTime = new Date(Date.now() + 60000).toISOString()
      ;(CacheService.get as jest.Mock).mockResolvedValueOnce({
        attempts: 5,
        lockedUntil: lockoutTime,
      })

      try {
        await AccountLockoutService.checkLockout(testEmail, testIp)
      } catch {
        // Expected to throw
      }

      expect(securityLogger.accountLocked).toHaveBeenCalled()
    })
  })

  describe('Security', () => {
    it('should track email and IP independently', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValue(null)
      ;(CacheService.set as jest.Mock).mockResolvedValue(undefined)

      await AccountLockoutService.recordFailedAttempt(testEmail, testIp)

      // Should check/set both email and IP keys
      const getCalls = (CacheService.get as jest.Mock).mock.calls
      const emailKey = getCalls.find(call => call[0]?.includes('email'))
      const ipKey = getCalls.find(call => call[0]?.includes('ip'))

      expect(emailKey).toBeDefined()
      expect(ipKey).toBeDefined()
    })

    it('should prevent enumeration by checking both lockouts', async () => {
      ;(CacheService.get as jest.Mock).mockResolvedValue(null)

      await AccountLockoutService.checkLockout(testEmail, testIp)

      // Should check both email and IP
      expect(CacheService.get).toHaveBeenCalledTimes(2)
    })
  })
})
