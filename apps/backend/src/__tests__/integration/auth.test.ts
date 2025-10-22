import { createApp } from '../../app'
import { FastifyInstance } from 'fastify'
import { prisma } from '../../config/prisma'
import { randomUUID } from 'crypto'

// Helper to generate unique emails for tests
// Use a valid domain (not disposable) for tests
const uniqueEmail = () => `test-${randomUUID()}@gmail.com`

describe('Auth Routes Integration Tests', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // Clean up test database before each test
    // Use transaction to ensure all deletes complete before test starts
    await prisma.$transaction([
      prisma.subscription.deleteMany(),
      prisma.csrfToken.deleteMany(),
      prisma.passwordResetToken.deleteMany(),
      prisma.verificationToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany(),
    ])
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const email = uniqueEmail()
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email,
          password: 'SecurePass123!', // 12+ chars with uppercase, lowercase, number
          name: 'Test User',
        },
      })

      expect(response.statusCode).toBe(201) // 201 Created is correct for new resource
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.user.email).toBe(email)

      // Tokens now stored in httpOnly cookies instead of response body
      expect(response.cookies).toBeDefined()
      expect(response.cookies.some(c => c.name === 'accessToken')).toBe(true)
      expect(response.cookies.some(c => c.name === 'refreshToken')).toBe(true)
      expect(response.cookies.some(c => c.name === 'csrfToken')).toBe(true)
    })

    it('should fail with invalid password (too short)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@test.com',
          password: 'short',
          name: 'Test',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should fail with invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'SecurePass123!',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should fail with disposable email address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@mailinator.com', // Known disposable domain
          password: 'SecurePass123!',
          name: 'Test User',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toContain('Validation error')
    })

    it('should fail if email already exists', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'duplicate@test.com',
          password: 'SecurePass123!',
        },
      })

      // Second registration with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'duplicate@test.com',
          password: 'AnotherPass123!',
        },
      })

      expect(response.statusCode).toBe(409) // 409 Conflict for duplicate resource
      const body = JSON.parse(response.body)
      expect(body.error).toContain('already')
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'logintest@test.com',
          password: 'SecurePass123!',
          name: 'Login Test',
        },
      })
    })

    it('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'logintest@test.com',
          password: 'SecurePass123!',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.user.email).toBe('logintest@test.com')

      // Tokens now stored in httpOnly cookies
      expect(response.cookies.some(c => c.name === 'accessToken')).toBe(true)
      expect(response.cookies.some(c => c.name === 'refreshToken')).toBe(true)
      expect(response.cookies.some(c => c.name === 'csrfToken')).toBe(true)
    })

    it('should fail with wrong password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'logintest@test.com',
          password: 'WrongPassword123!',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('Invalid credentials')
    })

    it('should fail with non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@test.com',
          password: 'SecurePass123!',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    // Rate limiting is disabled in test environment
    it.skip('should rate limit after too many attempts', async () => {
      // This test is skipped because rate limiting is disabled in NODE_ENV=test
      // to avoid flaky tests. Rate limiting is tested manually in development.
    })
  })

  describe('GET /api/auth/me', () => {
    let cookies: string

    beforeEach(async () => {
      // Register and get cookies
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'metest@test.com',
          password: 'SecurePass123!',
          name: 'Me Test',
        },
      })

      // Extract cookies from response
      cookies = registerResponse.headers['set-cookie'] as string
    })

    it('should return current user with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          cookie: cookies,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.user.email).toBe('metest@test.com')
    })

    it('should fail without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should fail with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          cookie: 'accessToken=invalid_token',
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string

    beforeEach(async () => {
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'refreshtest@test.com',
          password: 'SecurePass123!',
        },
      })

      // Extract refreshToken from cookies
      const refreshCookie = registerResponse.cookies.find(c => c.name === 'refreshToken')
      refreshToken = refreshCookie?.value || ''
    })

    it('should refresh tokens with valid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken,  // Send in body
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)

      // New tokens should be in cookies
      expect(response.cookies.some(c => c.name === 'accessToken')).toBe(true)
      expect(response.cookies.some(c => c.name === 'refreshToken')).toBe(true)
      expect(response.cookies.some(c => c.name === 'csrfToken')).toBe(true)
    })

    it('should fail with invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken: 'invalid_token',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should not allow reusing old refresh token (rotation)', async () => {
      // First refresh
      const firstRefresh = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken,  // Old token
        },
      })

      expect(firstRefresh.statusCode).toBe(200)

      // Try to reuse old refresh token (should be revoked)
      const secondRefresh = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken,  // Old token (revoked after first refresh)
        },
      })

      expect(secondRefresh.statusCode).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
    })
  })
})
