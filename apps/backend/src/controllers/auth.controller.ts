import type { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '@/services/auth.service'
import {
  registerSchema,
  loginSchema,
  type RegisterDTO,
  type LoginDTO,
} from '@/schemas/auth.schema'
import { CsrfService } from '@/services/csrf.service'
import {
  setAuthCookies,
  clearAuthCookies,
  refreshSessionCookies,
  setRefreshTokenCookie,
} from '@/utils/cookie-helpers'
import { handleControllerError } from '@/utils/error-response'

/**
 * Authentication controller
 * Handles routes: /register, /login, /refresh, /logout, /me
 */
export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(
    request: FastifyRequest<{ Body: RegisterDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate request data
      const data = registerSchema.parse(request.body)

      // Create user
      const result = await authService.register(data)

      // Log successful registration (use userId instead of email for GDPR compliance)
      request.log.info({ userId: result.user.id }, 'New user registered')

      // Generate CSRF token
      const csrfToken = await CsrfService.generateToken(result.user.id)

      // Set all authentication cookies
      setAuthCookies(reply, result.accessToken, result.refreshToken, csrfToken)

      return reply.status(201).send({
        success: true,
        data: {
          user: result.user,
          // Tokens stored in httpOnly cookies - no need to expose in response
        },
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Email already in use': (err, reply, req) => {
          // Log without email for GDPR compliance (only IP address)
          req.log.warn(
            { ip: req.ip },
            'Registration failed - email already exists'
          )
          return reply.status(409).send({
            success: false,
            error: err.message,
          })
        },
      })
    }
  }

  /**
   * POST /api/auth/login
   * Authenticate a user
   */
  async login(
    request: FastifyRequest<{ Body: LoginDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate request data
      const data = loginSchema.parse(request.body)

      // Authenticate user (with IP address for audit trail)
      const result = await authService.login(data, request.ip)

      // Log successful login (use userId instead of email for GDPR compliance)
      request.log.info({ userId: result.user.id }, 'User logged in successfully')

      // Generate CSRF token
      const csrfToken = await CsrfService.generateToken(result.user.id)

      // Set all authentication cookies
      setAuthCookies(reply, result.accessToken, result.refreshToken, csrfToken)

      return reply.status(200).send({
        success: true,
        data: {
          user: result.user,
          // Tokens stored in httpOnly cookies - no need to expose in response
        },
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Invalid credentials': (err, reply, req) => {
          // Log without email for GDPR compliance (only IP address)
          req.log.warn({ ip: req.ip }, 'Failed login attempt')
          return reply.status(401).send({
            success: false,
            error: err.message,
          })
        },
        'Account has been deleted': (err, reply, req) => {
          // Log without email for GDPR compliance (only IP address)
          req.log.warn(
            { ip: req.ip },
            'Login attempt for deleted account'
          )
          return reply.status(403).send({
            success: false,
            error: err.message,
          })
        },
      })
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token AND CSRF token
   *
   * Important: Regenerates CSRF token to synchronize with new access token
   * This solves the expiration desynchronization issue
   */
  async refresh(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get refresh token from cookies OR body (for flexibility)
      const body = request.body as { refreshToken?: string } | undefined
      const refreshToken = body?.refreshToken || request.cookies.refreshToken

      if (!refreshToken) {
        return reply.status(401).send({
          success: false,
          error: 'No refresh token provided',
        })
      }

      // Refresh tokens
      const result = await authService.refresh(refreshToken)

      // Extract userId from new access token to generate new CSRF
      const decoded = authService.verifyAccessToken(result.accessToken)

      // Generate new CSRF token synchronized with new access token
      const newCsrfToken = await CsrfService.generateToken(decoded.userId)

      // Renew session tokens (access + CSRF synchronized)
      refreshSessionCookies(reply, result.accessToken, newCsrfToken)

      // Also renew refresh token
      setRefreshTokenCookie(reply, result.refreshToken)

      return reply.status(200).send({
        success: true,
        message: 'Tokens refreshed successfully',
        // Tokens stored in httpOnly cookies - no need to expose in response
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Invalid or expired refresh token': (err, reply) =>
          reply.status(401).send({ success: false, error: err.message }),
        'User not found': (err, reply) =>
          reply.status(401).send({ success: false, error: 'Invalid or expired refresh token' }),
        'Account has been deleted': (err, reply) =>
          reply.status(403).send({ success: false, error: err.message }),
      })
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user and revoke refresh tokens
   */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get userId and refreshToken
      const userId = request.user?.userId
      const refreshToken = request.cookies.refreshToken

      if (userId) {
        // Revoke specific token or all user tokens
        await authService.logout(userId, refreshToken)
      }

      // Clear all authentication cookies
      clearAuthCookies(reply)

      return reply.status(200).send({
        success: true,
        message: 'Logged out successfully',
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      })
    }
  }

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      // userId will be injected by auth middleware
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        })
      }

      // Get user
      const user = await authService.getCurrentUser(userId)

      return reply.status(200).send({
        success: true,
        data: { user },
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'User not found': (err, reply) =>
          reply.status(404).send({ success: false, error: err.message }),
        'Account has been deleted': (err, reply) =>
          reply.status(403).send({ success: false, error: err.message }),
      })
    }
  }

  /**
   * PATCH /api/auth/profile
   * Update user profile (name, email)
   */
  async updateProfile(
    request: FastifyRequest<{
      Body: { name?: string; email?: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        })
      }

      // Update profile
      const user = await authService.updateProfile(userId, request.body)

      // Log successful update
      request.log.info({ userId }, 'User profile updated')

      return reply.status(200).send({
        success: true,
        data: { user },
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'User not found': (err, reply) =>
          reply.status(404).send({ success: false, error: err.message }),
        'Account has been deleted': (err, reply) =>
          reply.status(403).send({ success: false, error: err.message }),
        'Email already in use': (err, reply) =>
          reply.status(409).send({ success: false, error: err.message }),
      })
    }
  }
}

// Export instance singleton
export const authController = new AuthController()
