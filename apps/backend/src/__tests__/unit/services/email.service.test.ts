import { EmailService } from '../../../services/email.service'
import { logger } from '../../../utils/logger'
import { env } from '../../../config/env'

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock Resend
const mockSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}))

describe('EmailService', () => {
  const originalEnv = { ...env }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset env to original state
    Object.assign(env, originalEnv)
  })

  describe('sendVerificationEmail', () => {
    it('should log to console in development mode', async () => {
      env.NODE_ENV = 'development'
      env.FRONTEND_URL = 'http://localhost:3000'

      await EmailService.sendVerificationEmail('test@example.com', 'token_123')

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('VERIFICATION EMAIL'))
      expect(logger.info).toHaveBeenCalledWith('To: test@example.com')
      expect(logger.info).toHaveBeenCalledWith(
        'URL: http://localhost:3000/verify-email?token=token_123'
      )
      expect(logger.info).toHaveBeenCalledWith('Token: token_123')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should send email via Resend in production', async () => {
      env.NODE_ENV = 'production'
      env.RESEND_API_KEY = 're_test_key'
      env.EMAIL_FROM = 'noreply@noteflow.com'
      env.FRONTEND_URL = 'https://noteflow.com'

      mockSend.mockResolvedValue({ id: 'email_123' })

      await EmailService.sendVerificationEmail('user@example.com', 'token_456')

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@noteflow.com',
        to: 'user@example.com',
        subject: 'Verify your email address',
        html: expect.stringContaining('token_456'),
      })
    })

    it('should throw error if RESEND_API_KEY missing in production', async () => {
      env.NODE_ENV = 'production'
      env.RESEND_API_KEY = ''

      await expect(
        EmailService.sendVerificationEmail('test@example.com', 'token_789')
      ).rejects.toThrow('Email service not configured')

      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle Resend API errors', async () => {
      env.NODE_ENV = 'production'
      env.RESEND_API_KEY = 're_test_key'

      mockSend.mockRejectedValue(new Error('API error'))

      await expect(
        EmailService.sendVerificationEmail('test@example.com', 'token_abc')
      ).rejects.toThrow('Failed to send verification email')

      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('should log to console in development mode', async () => {
      env.NODE_ENV = 'development'
      env.FRONTEND_URL = 'http://localhost:3000'

      await EmailService.sendPasswordResetEmail('user@test.com', 'reset_token')

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('PASSWORD RESET'))
      expect(logger.info).toHaveBeenCalledWith('To: user@test.com')
      expect(logger.info).toHaveBeenCalledWith(
        'URL: http://localhost:3000/reset-password?token=reset_token'
      )
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should send email via Resend in production', async () => {
      env.NODE_ENV = 'production'
      env.RESEND_API_KEY = 're_test_key'
      env.EMAIL_FROM = 'noreply@noteflow.com'
      env.FRONTEND_URL = 'https://noteflow.com'

      mockSend.mockResolvedValue({ id: 'email_456' })

      await EmailService.sendPasswordResetEmail('user@test.com', 'reset_123')

      expect(mockSend).toHaveBeenCalled()
      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.from).toBe('noreply@noteflow.com')
      expect(callArgs.to).toBe('user@test.com')
      expect(callArgs.subject).toBe('Password reset request')
      expect(callArgs.html).toContain('reset_123')
    })

    it('should throw error if RESEND_API_KEY missing', async () => {
      env.NODE_ENV = 'production'
      env.RESEND_API_KEY = ''

      await expect(
        EmailService.sendPasswordResetEmail('test@example.com', 'reset_xyz')
      ).rejects.toThrow('Email service not configured')
    })

    it('should handle send errors', async () => {
      env.NODE_ENV = 'production'
      env.RESEND_API_KEY = 're_test_key'

      mockSend.mockRejectedValue(new Error('Send failed'))

      await expect(
        EmailService.sendPasswordResetEmail('test@example.com', 'token_test')
      ).rejects.toThrow('Failed to send password reset email')

      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('Email Content Validation', () => {
    beforeEach(() => {
      env.NODE_ENV = 'production'
      env.RESEND_API_KEY = 're_test_key'
      env.EMAIL_FROM = 'noreply@noteflow.com'
      env.FRONTEND_URL = 'https://noteflow.com'
      mockSend.mockResolvedValue({ id: 'email_test' })
    })

    it('should include verification URL in email content', async () => {
      await EmailService.sendVerificationEmail('test@example.com', 'token_abc')

      const emailCall = mockSend.mock.calls[0][0]
      expect(emailCall.html).toContain('https://noteflow.com/verify-email?token=token_abc')
    })

    it('should include reset URL in password email', async () => {
      await EmailService.sendPasswordResetEmail('test@example.com', 'reset_def')

      const emailCall = mockSend.mock.calls[0][0]
      expect(emailCall.html).toContain('https://noteflow.com/reset-password?token=reset_def')
    })
  })

  describe('Error Handling', () => {
    it('should log errors with context', async () => {
      env.NODE_ENV = 'production'
      env.RESEND_API_KEY = 're_test_key'

      const mockError = new Error('Resend API timeout')
      mockSend.mockRejectedValue(mockError)

      await expect(
        EmailService.sendVerificationEmail('test@example.com', 'token_error')
      ).rejects.toThrow()

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: mockError }),
        expect.any(String)
      )
    })

    it('should not expose sensitive data in error messages', async () => {
      env.NODE_ENV = 'production'
      env.RESEND_API_KEY = ''

      try {
        await EmailService.sendVerificationEmail('secret@example.com', 'secret_token')
      } catch (error: unknown) {
        const err = error as Error
        expect(err.message).not.toContain('secret@example.com')
        expect(err.message).not.toContain('secret_token')
      }
    })
  })
})
