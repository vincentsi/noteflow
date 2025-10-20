import { createApp } from '../../app'
import { FastifyInstance } from 'fastify'
import { prisma } from '../../config/prisma'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

describe('User API Integration Tests', () => {
  let app: FastifyInstance
  let authToken: string
  let userId: string

  beforeAll(async () => {
    app = await createApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // Clean up test database
    await prisma.$transaction([
      prisma.subscription.deleteMany(),
      prisma.csrfToken.deleteMany(),
      prisma.passwordResetToken.deleteMany(),
      prisma.verificationToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany(),
    ])

    // Create a test user
    const email = `test-${randomUUID()}@test.com`
    const hashedPassword = await bcrypt.hash('SecurePass123!', 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Test User',
        emailVerified: true,
        language: 'fr',
      },
    })

    userId = user.id

    // Login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email,
        password: 'SecurePass123!',
      },
    })

    const cookies = loginResponse.headers['set-cookie'] as string
    authToken = cookies
  })

  describe('PATCH /api/users/me', () => {
    it('should update user language', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/me',
        headers: {
          cookie: authToken,
        },
        payload: {
          language: 'en',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.user.language).toBe('en')

      // Verify in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
      })
      expect(updatedUser?.language).toBe('en')
    })

    it('should update user name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/me',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'New Name',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.user.name).toBe('New Name')

      // Verify in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
      })
      expect(updatedUser?.name).toBe('New Name')
    })

    it('should update both name and language', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/me',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Updated Name',
          language: 'en',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.user.name).toBe('Updated Name')
      expect(body.data.user.language).toBe('en')
    })

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/me',
        payload: { name: 'Test' },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 400 for invalid language', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/me',
        headers: {
          cookie: authToken,
        },
        payload: {
          language: 'invalid',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should not update email', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/me',
        headers: {
          cookie: authToken,
        },
        payload: {
          email: 'newemail@test.com',
        },
      })

      expect(response.statusCode).toBe(200)

      // Email should not change
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })
      expect(user?.email).not.toBe('newemail@test.com')
    })
  })
})
