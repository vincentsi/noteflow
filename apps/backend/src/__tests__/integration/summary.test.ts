import { createApp } from '../../app'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../config/prisma'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { PlanType, SummaryStyle } from '@prisma/client'
import type { Queue } from 'bullmq'
import type { SummaryJob } from '../../queues/summary.queue'
import { getSummaryQueue, queueSummary } from '../../queues/summary.queue'

jest.mock('../../queues/summary.queue', () => ({
  queueSummary: jest.fn().mockResolvedValue({ id: 'job-123' }),
  getSummaryQueue: jest.fn().mockReturnValue(null),
  startSummaryWorker: jest.fn().mockReturnValue(null),
}))

describe('Summary API Integration Tests', () => {
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
    // Reset mocks
    jest.clearAllMocks()
    jest.mocked(getSummaryQueue).mockReturnValue(null)
    jest.mocked(queueSummary).mockResolvedValue({ id: 'job-123' })

    // Clean up test database
    await prisma.$transaction([
      prisma.summary.deleteMany(),
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
        planType: PlanType.FREE,
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

  describe('POST /api/summaries', () => {
    it('should create summary job', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/summaries',
        headers: {
          cookie: authToken,
        },
        payload: {
          text: 'This is a long article about AI and machine learning...',
          style: SummaryStyle.SHORT,
        },
      })

      expect(response.statusCode).toBe(202) // Accepted
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveProperty('jobId')
      expect(body.data.jobId).toBe('job-123')
    })

    it('should default to user language if not provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/summaries',
        headers: {
          cookie: authToken,
        },
        payload: {
          text: 'Article text...',
          style: SummaryStyle.TWEET,
        },
      })

      expect(response.statusCode).toBe(202)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
    })

    it('should return 403 if limit reached (FREE plan)', async () => {
      // Create 5 summaries (FREE limit)
      for (let i = 0; i < 5; i++) {
        await prisma.summary.create({
          data: {
            userId,
            originalText: `Text ${i}`,
            summaryText: `Summary ${i}`,
            style: SummaryStyle.SHORT,
            language: 'fr',
          },
        })
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/summaries',
        headers: {
          cookie: authToken,
        },
        payload: {
          text: 'Another article...',
          style: SummaryStyle.SHORT,
        },
      })

      expect(response.statusCode).toBe(403)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error).toContain('limit')
    })

    it('should validate style enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/summaries',
        headers: {
          cookie: authToken,
        },
        payload: {
          text: 'Article...',
          style: 'INVALID_STYLE',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should require text field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/summaries',
        headers: {
          cookie: authToken,
        },
        payload: {
          style: SummaryStyle.SHORT,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/summaries',
        payload: {
          text: 'Article...',
          style: SummaryStyle.SHORT,
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should allow PRO users to exceed FREE limits', async () => {
      // Update user to PRO
      await prisma.user.update({
        where: { id: userId },
        data: { planType: PlanType.PRO },
      })

      // Create 10 summaries (over FREE limit)
      for (let i = 0; i < 10; i++) {
        await prisma.summary.create({
          data: {
            userId,
            originalText: `Text ${i}`,
            summaryText: `Summary ${i}`,
            style: SummaryStyle.SHORT,
            language: 'fr',
          },
        })
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/summaries',
        headers: {
          cookie: authToken,
        },
        payload: {
          text: 'Another article...',
          style: SummaryStyle.SHORT,
        },
      })

      expect(response.statusCode).toBe(202)
    })
  })

  describe('GET /api/summaries/:jobId/status', () => {
    it('should return job status from queue', async () => {
      // Mock queue to return pending job
      const mockQueue = {
        getJob: jest.fn().mockResolvedValue({
          id: 'job-123',
          getState: jest.fn().mockResolvedValue('waiting'),
          data: {
            userId,
            text: 'Test text',
            style: SummaryStyle.SHORT,
            language: 'fr',
          },
        }),
      } as unknown as Queue<SummaryJob>
      jest.mocked(getSummaryQueue).mockReturnValue(mockQueue)

      const response = await app.inject({
        method: 'GET',
        url: '/api/summaries/job-123/status',
        headers: {
          cookie: authToken,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveProperty('status')
      expect(['waiting', 'active', 'completed', 'failed']).toContain(
        body.data.status
      )
    })

    it('should return completed status with summary from database', async () => {
      // Create a completed summary
      const summary = await prisma.summary.create({
        data: {
          userId,
          originalText: 'This is the original text',
          summaryText: 'This is the summary',
          style: SummaryStyle.SHORT,
          language: 'fr',
        },
      })

      // Mock queue to return null (job not found, already completed)
      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(null),
      } as unknown as Queue<SummaryJob>
      jest.mocked(getSummaryQueue).mockReturnValue(mockQueue)

      const response = await app.inject({
        method: 'GET',
        url: `/api/summaries/completed-${summary.id}/status`,
        headers: {
          cookie: authToken,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('completed')
      expect(body.data.summary).toBeDefined()
      expect(body.data.summary.summaryText).toBe('This is the summary')
    })

    it('should return 404 if job not found and no summary', async () => {
      // Mock queue to return null
      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(null),
      } as unknown as Queue<SummaryJob>
      jest.mocked(getSummaryQueue).mockReturnValue(mockQueue)

      const response = await app.inject({
        method: 'GET',
        url: '/api/summaries/non-existent-job/status',
        headers: {
          cookie: authToken,
        },
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
    })

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/summaries/job-123/status',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/summaries', () => {
    it('should return user summaries ordered by createdAt DESC', async () => {
      // Create summaries with different timestamps to ensure ordering
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 60000)

      await prisma.summary.create({
        data: {
          userId,
          originalText: 'Text 1',
          summaryText: 'Summary 1',
          style: SummaryStyle.SHORT,
          language: 'fr',
          createdAt: oneMinuteAgo,
        },
      })

      await prisma.summary.create({
        data: {
          userId,
          originalText: 'Text 2',
          summaryText: 'Summary 2',
          style: SummaryStyle.TWEET,
          language: 'fr',
          createdAt: now,
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/summaries',
        headers: {
          cookie: authToken,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.summaries).toHaveLength(2)
      expect(body.data.summaries[0].summaryText).toBe('Summary 2') // Most recent first
    })

    it('should paginate results', async () => {
      // Create 15 summaries
      const summaries = Array.from({ length: 15 }, (_, i) => ({
        userId,
        originalText: `Text ${i}`,
        summaryText: `Summary ${i}`,
        style: SummaryStyle.SHORT,
        language: 'fr',
      }))
      await prisma.summary.createMany({ data: summaries })

      const response = await app.inject({
        method: 'GET',
        url: '/api/summaries?page=1&limit=10',
        headers: {
          cookie: authToken,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.summaries).toHaveLength(10)
      expect(body.data.pagination).toBeDefined()
      expect(body.data.pagination.page).toBe(1)
      expect(body.data.pagination.limit).toBe(10)
      expect(body.data.pagination.total).toBe(15)
    })

    it('should only return summaries for authenticated user', async () => {
      // Create summary for current user
      await prisma.summary.create({
        data: {
          userId,
          originalText: 'My text',
          summaryText: 'My summary',
          style: SummaryStyle.SHORT,
          language: 'fr',
        },
      })

      // Create another user and their summary
      const otherUser = await prisma.user.create({
        data: {
          email: `other-${randomUUID()}@test.com`,
          password: await bcrypt.hash('password', 10),
          name: 'Other User',
          emailVerified: true,
        },
      })
      await prisma.summary.create({
        data: {
          userId: otherUser.id,
          originalText: 'Other text',
          summaryText: 'Other summary',
          style: SummaryStyle.SHORT,
          language: 'fr',
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/summaries',
        headers: {
          cookie: authToken,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.summaries).toHaveLength(1)
      expect(body.data.summaries[0].summaryText).toBe('My summary')
    })

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/summaries',
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
