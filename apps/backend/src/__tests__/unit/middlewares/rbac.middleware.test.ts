import type { FastifyRequest, FastifyReply } from 'fastify'
import { requireRole } from '../../../middlewares/rbac.middleware'
import type { Role } from '../../../types/auth.types'

describe('requireRole middleware', () => {
  let mockRequest: Partial<FastifyRequest>
  let mockReply: Partial<FastifyReply>

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock request
    mockRequest = {
      user: undefined,
    }

    // Setup mock reply with chainable methods
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    }
  })

  describe('Authentication Check', () => {
    it('should return 401 if user is not authenticated', async () => {
      const middleware = requireRole('USER')

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated',
      })
    })

    it('should return 401 if user object exists but userId is missing', async () => {
      mockRequest.user = {
        userId: '',
        role: 'USER',
        email: 'test@example.com',
      }

      const middleware = requireRole('USER')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated',
      })
    })

    it('should return 401 if user object exists but role is missing', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: undefined as unknown as Role,
        email: 'test@example.com',
      }

      const middleware = requireRole('USER')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated',
      })
    })
  })

  describe('Single Role Authorization', () => {
    it('should allow USER role when USER is required', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'USER',
        email: 'user@example.com',
      }

      const middleware = requireRole('USER')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })

    it('should allow ADMIN role when ADMIN is required', async () => {
      mockRequest.user = {
        userId: 'admin-123',
        role: 'ADMIN',
        email: 'admin@example.com',
      }

      const middleware = requireRole('ADMIN')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })

    it('should allow MODERATOR role when MODERATOR is required', async () => {
      mockRequest.user = {
        userId: 'mod-123',
        role: 'MODERATOR',
        email: 'mod@example.com',
      }

      const middleware = requireRole('MODERATOR')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })

    it('should deny USER role when ADMIN is required', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'USER',
        email: 'user@example.com',
      }

      const middleware = requireRole('ADMIN')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        required: ['ADMIN'],
        current: 'USER',
      })
    })

    it('should deny MODERATOR role when ADMIN is required', async () => {
      mockRequest.user = {
        userId: 'mod-123',
        role: 'MODERATOR',
        email: 'mod@example.com',
      }

      const middleware = requireRole('ADMIN')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        required: ['ADMIN'],
        current: 'MODERATOR',
      })
    })

    it('should deny ADMIN role when USER is required', async () => {
      mockRequest.user = {
        userId: 'admin-123',
        role: 'ADMIN',
        email: 'admin@example.com',
      }

      const middleware = requireRole('USER')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        required: ['USER'],
        current: 'ADMIN',
      })
    })
  })

  describe('Multiple Roles (OR Logic)', () => {
    it('should allow ADMIN when ADMIN or MODERATOR is required', async () => {
      mockRequest.user = {
        userId: 'admin-123',
        role: 'ADMIN',
        email: 'admin@example.com',
      }

      const middleware = requireRole('ADMIN', 'MODERATOR')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })

    it('should allow MODERATOR when ADMIN or MODERATOR is required', async () => {
      mockRequest.user = {
        userId: 'mod-123',
        role: 'MODERATOR',
        email: 'mod@example.com',
      }

      const middleware = requireRole('ADMIN', 'MODERATOR')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })

    it('should deny USER when ADMIN or MODERATOR is required', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'USER',
        email: 'user@example.com',
      }

      const middleware = requireRole('ADMIN', 'MODERATOR')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        required: ['ADMIN', 'MODERATOR'],
        current: 'USER',
      })
    })

    it('should allow USER when USER, ADMIN, or MODERATOR is required', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'USER',
        email: 'user@example.com',
      }

      const middleware = requireRole('USER', 'ADMIN', 'MODERATOR')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })

    it('should allow any role when all roles are specified', async () => {
      const roles: Role[] = ['USER', 'ADMIN', 'MODERATOR']

      for (const role of roles) {
        jest.clearAllMocks()

        mockRequest.user = {
          userId: 'test-123',
          role,
          email: 'test@example.com',
        }

        const middleware = requireRole('USER', 'ADMIN', 'MODERATOR')
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

        expect(mockReply.status).not.toHaveBeenCalled()
        expect(mockReply.send).not.toHaveBeenCalled()
      }
    })
  })

  describe('Error Response Format', () => {
    it('should return 403 with required and current role in response', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'USER',
        email: 'user@example.com',
      }

      const middleware = requireRole('ADMIN')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        required: ['ADMIN'],
        current: 'USER',
      })
    })

    it('should list all required roles in error response', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'USER',
        email: 'user@example.com',
      }

      const middleware = requireRole('ADMIN', 'MODERATOR')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      const sendCall = (mockReply.send as jest.Mock).mock.calls[0][0]
      expect(sendCall.required).toEqual(['ADMIN', 'MODERATOR'])
      expect(sendCall.current).toBe('USER')
    })

    it('should use 401 for authentication errors not 403', async () => {
      const middleware = requireRole('USER')

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.status).not.toHaveBeenCalledWith(403)
    })

    it('should use 403 for authorization errors not 401', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'USER',
        email: 'user@example.com',
      }

      const middleware = requireRole('ADMIN')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
      expect(mockReply.status).not.toHaveBeenCalledWith(401)
    })
  })

  describe('Performance', () => {
    it('should not make any database queries', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'ADMIN',
        email: 'admin@example.com',
      }

      const middleware = requireRole('ADMIN')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      // Only checks request.user, no external calls
      expect(mockReply.status).not.toHaveBeenCalled()
    })

    it('should be synchronous and fast', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'USER',
        email: 'user@example.com',
      }

      const start = Date.now()
      const middleware = requireRole('USER')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      const duration = Date.now() - start

      // Should complete in under 10ms (usually < 1ms)
      expect(duration).toBeLessThan(10)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty allowed roles gracefully', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'USER',
        email: 'user@example.com',
      }

      const middleware = requireRole()
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      // No roles allowed = deny everyone
      expect(mockReply.status).toHaveBeenCalledWith(403)
    })

    it('should handle case-sensitive role matching', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: 'user' as Role, // lowercase
        email: 'user@example.com',
      }

      const middleware = requireRole('USER') // uppercase
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      // Should deny due to case mismatch
      expect(mockReply.status).toHaveBeenCalledWith(403)
    })

    it('should handle role with leading/trailing whitespace', async () => {
      mockRequest.user = {
        userId: 'user-123',
        role: ' USER ' as Role,
        email: 'user@example.com',
      }

      const middleware = requireRole('USER')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      // Should deny due to whitespace
      expect(mockReply.status).toHaveBeenCalledWith(403)
    })

    it('should handle unexpected errors gracefully', async () => {
      // Simulate an error by making request.user throw
      Object.defineProperty(mockRequest, 'user', {
        get() {
          throw new Error('Unexpected error')
        },
      })

      const middleware = requireRole('USER')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(500)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Server error',
      })
    })
  })

  describe('Middleware Factory Pattern', () => {
    it('should create independent middleware instances', () => {
      const middleware1 = requireRole('USER')
      const middleware2 = requireRole('ADMIN')

      expect(middleware1).not.toBe(middleware2)
      expect(typeof middleware1).toBe('function')
      expect(typeof middleware2).toBe('function')
    })

    it('should maintain closure over allowed roles', async () => {
      mockRequest.user = {
        userId: 'admin-123',
        role: 'ADMIN',
        email: 'admin@example.com',
      }

      const adminMiddleware = requireRole('ADMIN')
      const userMiddleware = requireRole('USER')

      // Admin middleware should pass for ADMIN
      await adminMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      expect(mockReply.status).not.toHaveBeenCalled()

      jest.clearAllMocks()

      // User middleware should fail for ADMIN
      await userMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      expect(mockReply.status).toHaveBeenCalledWith(403)
    })
  })

  describe('Integration with authMiddleware', () => {
    it('should work with data injected by authMiddleware', async () => {
      // Simulate authMiddleware having injected user data
      mockRequest.user = {
        userId: 'user-from-jwt-123',
        role: 'USER',
        email: 'jwt@example.com',
      }

      const middleware = requireRole('USER')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })

    it('should fail gracefully if authMiddleware did not run', async () => {
      // No user data (authMiddleware not run)
      mockRequest.user = undefined

      const middleware = requireRole('USER')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated',
      })
    })
  })
})
