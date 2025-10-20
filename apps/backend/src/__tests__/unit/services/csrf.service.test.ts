import { CsrfService } from '../../../services/csrf.service'
import { prisma } from '../../../config/prisma'
import { TokenHasher } from '../../../utils/token-hasher'

jest.mock('../../../config/prisma', () => ({
  prisma: {
    csrfToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('../../../config/redis', () => ({
  isRedisAvailable: jest.fn().mockReturnValue(false),
}))

jest.mock('../../../services/cache.service', () => ({
  CacheService: {
    set: jest.fn(),
    get: jest.fn(),
    deletePattern: jest.fn(),
  },
}))

describe('CsrfService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateToken', () => {
    it('should generate a valid CSRF token', async () => {
      ;(prisma.csrfToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.csrfToken.create as jest.Mock).mockResolvedValue({
        id: 'token_123',
        token: 'hashed_token',
        userId: 'user_123',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      })

      const token = await CsrfService.generateToken('user_123')

      expect(token).toBeTruthy()
      expect(token).toHaveLength(64) // 32 bytes in hex = 64 chars
      expect(prisma.csrfToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
      })
      expect(prisma.csrfToken.create).toHaveBeenCalled()
    })

    it('should delete existing tokens before creating new one', async () => {
      ;(prisma.csrfToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prisma.csrfToken.create as jest.Mock).mockResolvedValue({})

      await CsrfService.generateToken('user_123')

      expect(prisma.csrfToken.deleteMany).toHaveBeenCalled()
      expect(prisma.csrfToken.create).toHaveBeenCalled()
    })
  })

  describe('verifyToken', () => {
    it('should return true for valid non-expired token', async () => {
      const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      const hashedToken = TokenHasher.hash(token)

      const mockCsrfToken = {
        id: 'csrf_123',
        token: hashedToken,
        userId: 'user_123',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes in future
        createdAt: new Date(),
      }

      ;(prisma.csrfToken.findFirst as jest.Mock).mockResolvedValue(mockCsrfToken)

      const result = await CsrfService.verifyToken(token, 'user_123')

      expect(result).toBe(true)
      expect(prisma.csrfToken.findFirst).toHaveBeenCalledWith({
        where: {
          token: hashedToken,
          userId: 'user_123',
        },
      })
    })

    it('should return false for expired token and delete it', async () => {
      const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      const hashedToken = TokenHasher.hash(token)

      const mockCsrfToken = {
        id: 'csrf_123',
        token: hashedToken,
        userId: 'user_123',
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes in past (expired)
        createdAt: new Date(),
      }

      ;(prisma.csrfToken.findFirst as jest.Mock).mockResolvedValue(mockCsrfToken)
      ;(prisma.csrfToken.delete as jest.Mock).mockResolvedValue({})

      const result = await CsrfService.verifyToken(token, 'user_123')

      expect(result).toBe(false)
      expect(prisma.csrfToken.delete).toHaveBeenCalledWith({
        where: { id: 'csrf_123' },
      })
    })

    it('should return false for non-existent token', async () => {
      const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      ;(prisma.csrfToken.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await CsrfService.verifyToken(token, 'user_123')

      expect(result).toBe(false)
    })

    it('should return false for mismatched userId', async () => {
      const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

      ;(prisma.csrfToken.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await CsrfService.verifyToken(token, 'user_456')

      expect(result).toBe(false)
    })
  })

  describe('revokeUserTokens', () => {
    it('should delete all CSRF tokens for a user', async () => {
      ;(prisma.csrfToken.deleteMany as jest.Mock).mockResolvedValue({ count: 3 })

      await CsrfService.revokeUserTokens('user_123')

      expect(prisma.csrfToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
      })
    })
  })
})
