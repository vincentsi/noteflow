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
      prisma.savedArticle.deleteMany(),
      prisma.article.deleteMany(),
      prisma.summary.deleteMany(),
      prisma.note.deleteMany(),
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

  describe('GET /api/users/stats', () => {
    it('should return user usage stats', async () => {
      // Create test data - summaries (this month)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      await prisma.summary.create({
        data: {
          userId,
          originalText: 'Text 1',
          summaryText: 'Summary 1',
          style: 'SHORT',
          language: 'fr',
          createdAt: startOfMonth,
        },
      })

      // Create test data - notes
      await prisma.note.createMany({
        data: [
          { userId, title: 'Note 1', content: 'Content 1' },
          { userId, title: 'Note 2', content: 'Content 2' },
          { userId, title: 'Note 3', content: 'Content 3' },
        ],
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/users/stats',
        headers: { cookie: authToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      const stats = body.data.stats

      expect(stats.articles.current).toBe(0) // No articles created
      expect(stats.articles.limit).toBe(10) // FREE plan
      expect(stats.summaries.current).toBe(1) // This month
      expect(stats.summaries.limit).toBe(5)
      expect(stats.notes.current).toBe(3)
      expect(stats.notes.limit).toBe(20)
    })

    it('should show unlimited for PRO plan', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { planType: 'PRO' },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/users/stats',
        headers: { cookie: authToken },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      const stats = body.data.stats

      expect(stats.articles.limit).toBe(null) // Infinity becomes null in JSON
      expect(stats.summaries.limit).toBe(null)
      expect(stats.notes.limit).toBe(null)
    })

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/stats',
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
