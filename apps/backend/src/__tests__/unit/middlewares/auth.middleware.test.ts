import type { FastifyRequest, FastifyReply } from 'fastify'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { authService } from '../../../services/auth.service'

// Mock dependencies
jest.mock('../../../services/auth.service', () => ({
  authService: {
    verifyAccessToken: jest.fn(),
  },
}))

describe('authMiddleware', () => {
  let mockRequest: Partial<FastifyRequest> & { cookies?: Record<string, unknown>; headers?: Record<string, unknown> }
  let mockReply: Partial<FastifyReply>

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock request
    mockRequest = {
      cookies: {},
      headers: {},
      user: undefined,
    }

    // Setup mock reply with chainable send method
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    }
  })

  describe('Cookie Authentication (Priority)', () => {
    it('should authenticate user with valid access token from cookies', async () => {
      const mockPayload = {
        userId: 'user-123',
        role: 'USER',
        email: 'test@example.com',
      }

      mockRequest.cookies = { accessToken: 'valid-cookie-token' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(authService.verifyAccessToken).toHaveBeenCalledWith('valid-cookie-token')
      expect(mockRequest.user).toEqual({
        userId: 'user-123',
        role: 'USER',
        email: 'test@example.com',
      })
      expect(mockReply.status).not.toHaveBeenCalled()
    })

    it('should inject all required fields into request.user', async () => {
      const mockPayload = {
        userId: 'user-456',
        role: 'ADMIN',
        email: 'admin@example.com',
      }

      mockRequest.cookies = { accessToken: 'valid-token' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockRequest.user).toHaveProperty('userId', 'user-456')
      expect(mockRequest.user).toHaveProperty('role', 'ADMIN')
      expect(mockRequest.user).toHaveProperty('email', 'admin@example.com')
    })

    it('should prioritize cookie token over Authorization header', async () => {
      const mockPayload = {
        userId: 'user-123',
        role: 'USER',
        email: 'test@example.com',
      }

      mockRequest.cookies = { accessToken: 'cookie-token' }
      mockRequest.headers = { authorization: 'Bearer header-token' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      // Should use cookie token, not header token
      expect(authService.verifyAccessToken).toHaveBeenCalledWith('cookie-token')
      expect(authService.verifyAccessToken).not.toHaveBeenCalledWith('header-token')
    })
  })

  describe('Header Authentication (Fallback)', () => {
    it('should authenticate user with valid Bearer token from Authorization header', async () => {
      const mockPayload = {
        userId: 'user-789',
        role: 'USER',
        email: 'header@example.com',
      }

      mockRequest.headers = { authorization: 'Bearer valid-header-token' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(authService.verifyAccessToken).toHaveBeenCalledWith('valid-header-token')
      expect(mockRequest.user).toEqual({
        userId: 'user-789',
        role: 'USER',
        email: 'header@example.com',
      })
    })

    it('should handle Bearer token with correct format', async () => {
      const mockPayload = {
        userId: 'user-123',
        role: 'USER',
        email: 'test@example.com',
      }

      mockRequest.headers = { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(authService.verifyAccessToken).toHaveBeenCalledWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
    })

    it('should return 401 if Authorization header has invalid format', async () => {
      mockRequest.headers = { authorization: 'InvalidFormat token' }

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'No access token provided',
      })
      expect(authService.verifyAccessToken).not.toHaveBeenCalled()
    })

    it('should return 401 if Authorization header is missing Bearer prefix', async () => {
      mockRequest.headers = { authorization: 'token-without-bearer' }

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'No access token provided',
      })
    })

    it('should return 401 if Authorization header has extra parts', async () => {
      mockRequest.headers = { authorization: 'Bearer token extra-part' }

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'No access token provided',
      })
    })
  })

  describe('Missing Token', () => {
    it('should return 401 if no token in cookies or headers', async () => {
      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'No access token provided',
      })
      expect(authService.verifyAccessToken).not.toHaveBeenCalled()
    })

    it('should return 401 if cookies exist but no accessToken', async () => {
      mockRequest.cookies = { otherCookie: 'value' }

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'No access token provided',
      })
    })

    it('should return 401 if Authorization header exists but is empty', async () => {
      mockRequest.headers = { authorization: '' }

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'No access token provided',
      })
    })
  })

  describe('Invalid Token', () => {
    it('should return 401 if token verification fails', async () => {
      mockRequest.cookies = { accessToken: 'invalid-token' }
      ;(authService.verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token')
      })

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
      })
      expect(mockRequest.user).toBeUndefined()
    })

    it('should return 401 if token is expired', async () => {
      mockRequest.cookies = { accessToken: 'expired-token' }
      ;(authService.verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Token expired')
      })

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
      })
    })

    it('should return 401 if token is malformed', async () => {
      mockRequest.cookies = { accessToken: 'malformed.token' }
      ;(authService.verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('jwt malformed')
      })

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'jwt malformed',
      })
    })

    it('should handle non-Error exceptions gracefully', async () => {
      mockRequest.cookies = { accessToken: 'token' }
      ;(authService.verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
        throw 'String error'
      })

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      })
    })
  })

  describe('Role Support', () => {
    it('should support USER role', async () => {
      const mockPayload = {
        userId: 'user-123',
        role: 'USER',
        email: 'user@example.com',
      }

      mockRequest.cookies = { accessToken: 'token' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockRequest.user?.role).toBe('USER')
    })

    it('should support ADMIN role', async () => {
      const mockPayload = {
        userId: 'admin-123',
        role: 'ADMIN',
        email: 'admin@example.com',
      }

      mockRequest.cookies = { accessToken: 'token' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockRequest.user?.role).toBe('ADMIN')
    })

    it('should support MODERATOR role', async () => {
      const mockPayload = {
        userId: 'mod-123',
        role: 'MODERATOR',
        email: 'mod@example.com',
      }

      mockRequest.cookies = { accessToken: 'token' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockRequest.user?.role).toBe('MODERATOR')
    })
  })

  describe('JWT Payload Structure', () => {
    it('should extract userId from JWT payload', async () => {
      const mockPayload = {
        userId: 'user-abc-123',
        role: 'USER',
        email: 'test@example.com',
      }

      mockRequest.cookies = { accessToken: 'token' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockRequest.user?.userId).toBe('user-abc-123')
    })

    it('should extract email from JWT payload', async () => {
      const mockPayload = {
        userId: 'user-123',
        role: 'USER',
        email: 'unique@example.com',
      }

      mockRequest.cookies = { accessToken: 'token' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockRequest.user?.email).toBe('unique@example.com')
    })

    it('should not make database queries', async () => {
      const mockPayload = {
        userId: 'user-123',
        role: 'USER',
        email: 'test@example.com',
      }

      mockRequest.cookies = { accessToken: 'token' }
      ;(authService.verifyAccessToken as jest.Mock).mockReturnValueOnce(mockPayload)

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      // Middleware should only call verifyAccessToken, no DB queries
      expect(authService.verifyAccessToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('Security', () => {
    it('should not accept empty string token', async () => {
      mockRequest.cookies = { accessToken: '' }

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'No access token provided',
      })
    })

    it('should not accept whitespace-only token', async () => {
      mockRequest.cookies = { accessToken: '   ' }
      ;(authService.verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token')
      })

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
    })

    it('should properly handle case-sensitive Bearer prefix', async () => {
      mockRequest.headers = { authorization: 'bearer token' }

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'No access token provided',
      })
    })
  })

  describe('Error Handling', () => {
    it('should return error message from authService', async () => {
      mockRequest.cookies = { accessToken: 'token' }
      ;(authService.verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Specific error message')
      })

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Specific error message',
      })
    })

    it('should always return 401 for authentication failures, not 403', async () => {
      mockRequest.cookies = { accessToken: 'invalid' }
      ;(authService.verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Forbidden')
      })

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      // Should be 401 (authentication), not 403 (authorization)
      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.status).not.toHaveBeenCalledWith(403)
    })

    it('should not leak sensitive information in error messages', async () => {
      mockRequest.cookies = { accessToken: 'token' }
      ;(authService.verifyAccessToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('JWT signature verification failed')
      })

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      const sendCall = (mockReply.send as jest.Mock).mock.calls[0][0]
      expect(sendCall.error).not.toContain('user')
      expect(sendCall.error).not.toContain('password')
      expect(sendCall.error).not.toContain('secret')
    })
  })
})
