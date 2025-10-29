import { PasswordResetService } from '../../../services/password-reset.service'
import { prisma } from '../../../config/prisma'
import { TokenHasher } from '../../../utils/token-hasher'
import { authService } from '../../../services/auth.service'
import { EmailService } from '../../../services/email.service'
import { checkRateLimit } from '../../../utils/rate-limiter'
import { logger } from '../../../utils/logger'
import { randomBytes } from 'crypto'

// Mock dependencies
jest.mock('../../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
  },
}))

jest.mock('../../../utils/token-hasher')
jest.mock('../../../services/auth.service', () => ({
  authService: {
    hashPassword: jest.fn(),
  },
}))
jest.mock('../../../services/email.service')
jest.mock('../../../utils/rate-limiter')
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}))

describe('PasswordResetService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Don't use fake timers as they interfere with the constant delay
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('requestReset', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-password',
    }

    it('should create reset token and send email for existing user', async () => {
      const mockToken = 'a'.repeat(64) // 32 bytes = 64 hex chars
      const mockHashedToken = 'hashed-token'

      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: true,
        remaining: 2,
        resetAt: Date.now() + 3600000,
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)
      ;(randomBytes as jest.Mock).mockReturnValueOnce({
        toString: jest.fn().mockReturnValue(mockToken),
      })
      ;(TokenHasher.hash as jest.Mock).mockReturnValueOnce(mockHashedToken)
      ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 })
      ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValueOnce({
        token: mockHashedToken,
        userId: mockUser.id,
        expiresAt: new Date(),
      })
      ;(EmailService.sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(undefined)

      const result = await PasswordResetService.requestReset(mockUser.email)

      expect(result).toEqual({ success: true })
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      })
      expect(TokenHasher.hash).toHaveBeenCalledWith(mockToken)
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      })
      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          token: mockHashedToken,
          userId: mockUser.id,
          expiresAt: expect.any(Date),
        },
      })
      expect(EmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockToken
      )
    })

    it('should return success without sending email if user does not exist', async () => {
      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: true,
        remaining: 2,
        resetAt: Date.now() + 3600000,
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)

      const result = await PasswordResetService.requestReset('nonexistent@example.com')

      expect(result).toEqual({ success: true })
      expect(prisma.user.findUnique).toHaveBeenCalled()
      expect(EmailService.sendPasswordResetEmail).not.toHaveBeenCalled()
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled()
    })

    it('should return success and log warning if rate limit exceeded', async () => {
      const resetAt = Date.now() + 3600000

      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt,
      })

      const result = await PasswordResetService.requestReset('test@example.com')

      expect(result).toEqual({ success: true })
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'tes***',
          resetAt,
        }),
        'Password reset rate limit exceeded'
      )
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
      expect(EmailService.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('should check rate limit with correct parameters', async () => {
      const email = 'test@example.com'

      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 3600000,
      })

      await PasswordResetService.requestReset(email)

      expect(checkRateLimit).toHaveBeenCalledWith(
        `password-reset-email:${email.toLowerCase()}`,
        3,
        60 * 60 * 1000
      )
    })

    it('should handle email case-insensitively in rate limit key', async () => {
      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 3600000,
      })

      await PasswordResetService.requestReset('TeSt@ExAmPlE.com')

      expect(checkRateLimit).toHaveBeenCalledWith(
        'password-reset-email:test@example.com',
        3,
        60 * 60 * 1000
      )
    })

    it('should delete old reset tokens before creating new one', async () => {
      const mockToken = 'a'.repeat(64)
      const mockHashedToken = 'hashed-token'

      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: true,
        remaining: 2,
        resetAt: Date.now() + 3600000,
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)
      ;(randomBytes as jest.Mock).mockReturnValueOnce({
        toString: jest.fn().mockReturnValue(mockToken),
      })
      ;(TokenHasher.hash as jest.Mock).mockReturnValueOnce(mockHashedToken)
      ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 })
      ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValueOnce({
        token: mockHashedToken,
        userId: mockUser.id,
        expiresAt: new Date(),
      })
      ;(EmailService.sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(undefined)

      await PasswordResetService.requestReset(mockUser.email)

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      })
      // Verify deleteMany was called before create by checking call order
      const deleteManyOrder = (prisma.passwordResetToken.deleteMany as jest.Mock).mock.invocationCallOrder[0]
      const createOrder = (prisma.passwordResetToken.create as jest.Mock).mock.invocationCallOrder[0]
      expect(deleteManyOrder).toBeLessThan(createOrder)
    })

    it('should set token expiration to 1 hour from now', async () => {
      const mockToken = 'a'.repeat(64)
      const mockHashedToken = 'hashed-token'

      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: true,
        remaining: 2,
        resetAt: Date.now() + 3600000,
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)
      ;(randomBytes as jest.Mock).mockReturnValueOnce({
        toString: jest.fn().mockReturnValue(mockToken),
      })
      ;(TokenHasher.hash as jest.Mock).mockReturnValueOnce(mockHashedToken)
      ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 })
      ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValueOnce({
        token: mockHashedToken,
        userId: mockUser.id,
        expiresAt: new Date(),
      })
      ;(EmailService.sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(undefined)

      const beforeCall = Date.now()
      await PasswordResetService.requestReset(mockUser.email)
      const afterCall = Date.now()

      // Get the actual expiration date that was passed to create
      const createCall = (prisma.passwordResetToken.create as jest.Mock).mock.calls[0][0]
      const actualExpiration = createCall.data.expiresAt.getTime()

      // Verify expiration is approximately 1 hour from now (allow 1 second tolerance)
      const expectedMin = beforeCall + (60 * 60 * 1000) - 1000
      const expectedMax = afterCall + (60 * 60 * 1000) + 1000
      expect(actualExpiration).toBeGreaterThanOrEqual(expectedMin)
      expect(actualExpiration).toBeLessThanOrEqual(expectedMax)
    })

    it('should return success and log error if exception occurs', async () => {
      const error = new Error('Database connection failed')

      ;(checkRateLimit as jest.Mock).mockRejectedValueOnce(error)

      const result = await PasswordResetService.requestReset('test@example.com')

      expect(result).toEqual({ success: true })
      expect(logger.error).toHaveBeenCalledWith(
        { error },
        'Password reset request error:'
      )
    })

    it('should generate 32-byte random token', async () => {
      const mockToken = 'a'.repeat(64)

      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: true,
        remaining: 2,
        resetAt: Date.now() + 3600000,
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser)
      ;(randomBytes as jest.Mock).mockReturnValueOnce({
        toString: jest.fn().mockReturnValue(mockToken),
      })
      ;(TokenHasher.hash as jest.Mock).mockReturnValueOnce('hashed')
      ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 })
      ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValueOnce({})
      ;(EmailService.sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(undefined)

      await PasswordResetService.requestReset(mockUser.email)

      expect(randomBytes).toHaveBeenCalledWith(32)
    })
  })

  describe('verifyResetToken', () => {
    const mockToken = 'plain-token'
    const mockHashedToken = 'hashed-token'
    const mockResetToken = {
      token: mockHashedToken,
      userId: 'user-123',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    }

    it('should return token if valid and not expired', async () => {
      ;(TokenHasher.hash as jest.Mock).mockReturnValueOnce(mockHashedToken)
      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: true,
        remaining: 4,
        resetAt: Date.now() + 900000,
      })
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce(mockResetToken)

      const result = await PasswordResetService.verifyResetToken(mockToken)

      expect(result).toEqual(mockResetToken)
      expect(TokenHasher.hash).toHaveBeenCalledWith(mockToken)
      expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { token: mockHashedToken },
      })
    })

    it('should throw error if token does not exist', async () => {
      ;(TokenHasher.hash as jest.Mock).mockReturnValueOnce(mockHashedToken)
      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: true,
        remaining: 4,
        resetAt: Date.now() + 900000,
      })
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(PasswordResetService.verifyResetToken(mockToken)).rejects.toThrow(
        'Invalid token'
      )
    })

    it('should throw error if token is expired', async () => {
      const expiredToken = {
        ...mockResetToken,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      }

      ;(TokenHasher.hash as jest.Mock).mockReturnValueOnce(mockHashedToken)
      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: true,
        remaining: 4,
        resetAt: Date.now() + 900000,
      })
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce(expiredToken)

      await expect(PasswordResetService.verifyResetToken(mockToken)).rejects.toThrow(
        'Token expired'
      )
    })

    it('should check rate limit for brute force attempts', async () => {
      ;(TokenHasher.hash as jest.Mock).mockReturnValueOnce(mockHashedToken)
      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: true,
        remaining: 4,
        resetAt: Date.now() + 900000,
      })
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce(mockResetToken)

      await PasswordResetService.verifyResetToken(mockToken)

      expect(checkRateLimit).toHaveBeenCalledWith(
        `password-reset-attempts:${mockHashedToken.substring(0, 16)}`,
        5,
        15 * 60 * 1000
      )
    })

    it('should delete token and throw error if brute force limit exceeded', async () => {
      ;(TokenHasher.hash as jest.Mock).mockReturnValueOnce(mockHashedToken)
      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 900000,
      })
      ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 })

      await expect(PasswordResetService.verifyResetToken(mockToken)).rejects.toThrow(
        'Too many failed attempts. Please request a new reset link.'
      )

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { token: mockHashedToken },
      })
      expect(logger.warn).toHaveBeenCalledWith(
        { tokenPrefix: mockHashedToken.substring(0, 8) },
        'Password reset token deleted after brute force attempts'
      )
    })

    it('should not call findUnique if rate limit exceeded', async () => {
      ;(TokenHasher.hash as jest.Mock).mockReturnValueOnce(mockHashedToken)
      ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 900000,
      })
      ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 })

      await expect(PasswordResetService.verifyResetToken(mockToken)).rejects.toThrow()

      expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('resetPassword', () => {
    const mockToken = 'plain-token'
    const mockHashedToken = 'hashed-token'
    const mockNewPassword = 'NewSecurePassword123!'
    const mockHashedPassword = 'hashed-new-password'
    const mockResetToken = {
      token: mockHashedToken,
      userId: 'user-123',
      expiresAt: new Date(Date.now() + 3600000),
    }

    beforeEach(() => {
      ;(TokenHasher.hash as jest.Mock).mockReturnValue(mockHashedToken)
      ;(checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetAt: Date.now() + 900000,
      })
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockResetToken)
      ;(authService.hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: mockResetToken.userId })
      ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
    })

    it('should reset password successfully', async () => {
      const result = await PasswordResetService.resetPassword(mockToken, mockNewPassword)

      expect(result).toEqual({
        success: true,
        userId: mockResetToken.userId,
      })
      expect(authService.hashPassword).toHaveBeenCalledWith(mockNewPassword)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockResetToken.userId },
        data: { password: mockHashedPassword },
      })
    })

    it('should delete reset token after successful password reset', async () => {
      await PasswordResetService.resetPassword(mockToken, mockNewPassword)

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockResetToken.userId },
      })
    })

    it('should revoke all refresh tokens after password reset', async () => {
      await PasswordResetService.resetPassword(mockToken, mockNewPassword)

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockResetToken.userId },
        data: { revoked: true },
      })
    })

    it('should verify token before resetting password', async () => {
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(
        PasswordResetService.resetPassword(mockToken, mockNewPassword)
      ).rejects.toThrow('Invalid token')

      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should throw error if token is expired during reset', async () => {
      const expiredToken = {
        ...mockResetToken,
        expiresAt: new Date(Date.now() - 3600000),
      }
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce(expiredToken)

      await expect(
        PasswordResetService.resetPassword(mockToken, mockNewPassword)
      ).rejects.toThrow('Token expired')

      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should hash password using authService', async () => {
      await PasswordResetService.resetPassword(mockToken, mockNewPassword)

      expect(authService.hashPassword).toHaveBeenCalledWith(mockNewPassword)
    })

    it('should update user password with hashed password', async () => {
      await PasswordResetService.resetPassword(mockToken, mockNewPassword)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockResetToken.userId },
        data: { password: mockHashedPassword },
      })
    })

    it('should complete all operations in correct order', async () => {
      await PasswordResetService.resetPassword(mockToken, mockNewPassword)

      // Verify the order of operations by checking invocation call order
      const findUniqueOrder = (prisma.passwordResetToken.findUnique as jest.Mock).mock.invocationCallOrder[0]
      const hashPasswordOrder = (authService.hashPassword as jest.Mock).mock.invocationCallOrder[0]
      const updateUserOrder = (prisma.user.update as jest.Mock).mock.invocationCallOrder[0]
      const deleteTokenOrder = (prisma.passwordResetToken.deleteMany as jest.Mock).mock.invocationCallOrder[0]
      const revokeTokensOrder = (prisma.refreshToken.updateMany as jest.Mock).mock.invocationCallOrder[0]

      // 1. Verify token
      expect(findUniqueOrder).toBeLessThan(hashPasswordOrder)
      // 2. Hash password
      expect(hashPasswordOrder).toBeLessThan(updateUserOrder)
      // 3. Update password
      expect(updateUserOrder).toBeLessThan(deleteTokenOrder)
      // 4. Delete token and revoke sessions happen after update
      expect(updateUserOrder).toBeLessThan(revokeTokensOrder)
    })

    it('should return userId for CSRF token rotation', async () => {
      const result = await PasswordResetService.resetPassword(mockToken, mockNewPassword)

      expect(result.userId).toBe(mockResetToken.userId)
    })
  })
})
