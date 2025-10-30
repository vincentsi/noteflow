import { prismaMock } from '../../helpers/test-db'
import { VerificationService } from '../../../services/verification.service'
import { TokenHasher } from '../../../utils/token-hasher'
import { EmailService } from '../../../services/email.service'
import { User } from '@prisma/client'

// Mock dependencies
jest.mock('../../../utils/token-hasher')
jest.mock('../../../services/email.service')

describe('VerificationService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    emailVerified: false,
    password: 'hashed_password',
    name: 'Test User',
    role: 'USER',
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
  } as User

  beforeEach(() => {
    jest.clearAllMocks()
    ;(TokenHasher.hash as jest.Mock).mockReturnValue('hashed_token_123')
  })

  describe('createVerificationToken', () => {
    it('should create token and send email', async () => {
      const mockToken = {
        id: 'token-1',
        token: 'hashed_token_123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }

      prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.verificationToken.create.mockResolvedValue(mockToken)
      ;(EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined)

      const token = await VerificationService.createVerificationToken(
        'user-123',
        'test@example.com'
      )

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      })
      expect(prismaMock.verificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: 'hashed_token_123',
          userId: 'user-123',
        }),
      })
      expect(EmailService.sendVerificationEmail).toHaveBeenCalledWith('test@example.com', token)
    })

    it('should delete old tokens before creating new one', async () => {
      prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 2 })
      prismaMock.verificationToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'hashed_new_token',
        userId: 'user-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      })
      ;(EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined)

      await VerificationService.createVerificationToken('user-123', 'test@example.com')

      // Verify deleteMany was called
      expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      })
      expect(prismaMock.verificationToken.create).toHaveBeenCalled()
    })

    it('should set token expiration to 24 hours', async () => {
      prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.verificationToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'hashed_token',
        userId: 'user-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      })
      ;(EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined)

      await VerificationService.createVerificationToken('user-123', 'test@example.com')

      const createCall = prismaMock.verificationToken.create.mock.calls[0][0]
      const expiresAt = createCall.data.expiresAt as Date
      const now = new Date()
      const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

      expect(hoursDiff).toBeGreaterThan(23.9)
      expect(hoursDiff).toBeLessThan(24.1)
    })

    it('should hash token before storing', async () => {
      prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.verificationToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'hashed_token_123',
        userId: 'user-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      })
      ;(EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined)

      await VerificationService.createVerificationToken('user-123', 'test@example.com')

      expect(TokenHasher.hash).toHaveBeenCalled()
      expect(prismaMock.verificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token: 'hashed_token_123',
          }),
        })
      )
    })
  })

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const mockVerificationToken = {
        id: 'token-1',
        token: 'hashed_token_123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        createdAt: new Date(),
        user: mockUser,
      }

      prismaMock.verificationToken.findUnique.mockResolvedValue(mockVerificationToken)
      prismaMock.user.update.mockResolvedValue({ ...mockUser, emailVerified: true })
      prismaMock.verificationToken.delete.mockResolvedValue(mockVerificationToken)

      const result = await VerificationService.verifyEmail('plain_token_123')

      expect(result.email).toBe('test@example.com')
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { emailVerified: true },
      })
      expect(prismaMock.verificationToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      })
    })

    it('should throw error if token not found', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue(null)

      await expect(VerificationService.verifyEmail('invalid_token')).rejects.toThrow(
        'Invalid token'
      )

      expect(prismaMock.user.update).not.toHaveBeenCalled()
    })

    it('should throw error if token expired', async () => {
      const expiredToken = {
        id: 'token-1',
        token: 'hashed_token_123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        user: mockUser,
      }

      prismaMock.verificationToken.findUnique.mockResolvedValue(expiredToken)

      await expect(VerificationService.verifyEmail('expired_token')).rejects.toThrow(
        'Token expired'
      )

      expect(prismaMock.user.update).not.toHaveBeenCalled()
    })

    it('should delete token after successful verification', async () => {
      const mockVerificationToken = {
        id: 'token-1',
        token: 'hashed_token_123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        createdAt: new Date(),
        user: mockUser,
      }

      prismaMock.verificationToken.findUnique.mockResolvedValue(mockVerificationToken)
      prismaMock.user.update.mockResolvedValue({ ...mockUser, emailVerified: true })
      prismaMock.verificationToken.delete.mockResolvedValue(mockVerificationToken)

      await VerificationService.verifyEmail('token_123')

      expect(prismaMock.verificationToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      })
    })

    it('should hash token before lookup', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue(null)

      try {
        await VerificationService.verifyEmail('plain_token')
      } catch {
        // Expected to throw
      }

      expect(TokenHasher.hash).toHaveBeenCalledWith('plain_token')
      expect(prismaMock.verificationToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'hashed_token_123' },
        include: { user: true },
      })
    })
  })

  describe('resendVerification', () => {
    it('should resend verification for unverified user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser)
      prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 1 })
      prismaMock.verificationToken.create.mockResolvedValue({
        id: 'token-2',
        token: 'hashed_new_token',
        userId: 'user-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      })
      ;(EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined)

      const token = await VerificationService.resendVerification('test@example.com')

      expect(token).toBeTruthy()
      expect(EmailService.sendVerificationEmail).toHaveBeenCalledWith('test@example.com', token)
    })

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      await expect(
        VerificationService.resendVerification('nonexistent@example.com')
      ).rejects.toThrow('User not found')
    })

    it('should throw error if email already verified', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true }
      prismaMock.user.findUnique.mockResolvedValue(verifiedUser)

      await expect(VerificationService.resendVerification('test@example.com')).rejects.toThrow(
        'Email already verified'
      )

      expect(EmailService.sendVerificationEmail).not.toHaveBeenCalled()
    })

    it('should delete old token and create new one', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser)
      prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 1 })
      prismaMock.verificationToken.create.mockResolvedValue({
        id: 'token-3',
        token: 'hashed_resend_token',
        userId: 'user-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      })
      ;(EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined)

      await VerificationService.resendVerification('test@example.com')

      expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      })
      expect(prismaMock.verificationToken.create).toHaveBeenCalled()
    })
  })

  describe('Security', () => {
    it('should never store plaintext tokens', async () => {
      prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.verificationToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'hashed_token',
        userId: 'user-123',
        expiresAt: new Date(),
        createdAt: new Date(),
      })
      ;(EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined)

      const plainToken = await VerificationService.createVerificationToken(
        'user-123',
        'test@example.com'
      )

      const createCall = prismaMock.verificationToken.create.mock.calls[0][0]
      expect(createCall.data.token).not.toBe(plainToken)
      expect(createCall.data.token).toBe('hashed_token_123')
    })

    it('should use one-time tokens (deleted after verification)', async () => {
      const mockVerificationToken = {
        id: 'token-1',
        token: 'hashed_token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        createdAt: new Date(),
        user: mockUser,
      }

      prismaMock.verificationToken.findUnique.mockResolvedValue(mockVerificationToken)
      prismaMock.user.update.mockResolvedValue({ ...mockUser, emailVerified: true })
      prismaMock.verificationToken.delete.mockResolvedValue(mockVerificationToken)

      await VerificationService.verifyEmail('token')

      // Token must be deleted to prevent replay attacks
      expect(prismaMock.verificationToken.delete).toHaveBeenCalled()
    })
  })
})
