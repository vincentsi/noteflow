import { createApp } from '../../app'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../config/prisma'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { PlanType } from '@prisma/client'

describe('Notes API Integration Tests', () => {
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
      prisma.note.deleteMany(),
      prisma.post.deleteMany(),
      prisma.summary.deleteMany(),
      prisma.savedArticle.deleteMany(),
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

  describe('POST /api/notes', () => {
    it('should create note', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: {
          cookie: authToken,
        },
        payload: {
          title: 'My Note',
          content: '# Test\n\nThis is markdown content',
          tags: ['personal', 'test'],
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.title).toBe('My Note')
      expect(body.data.content).toBe('# Test\n\nThis is markdown content')
      expect(body.data.tags).toEqual(['personal', 'test'])
    })

    it('should return 403 if limit reached', async () => {
      // Create 20 notes (FREE limit)
      const notes = Array.from({ length: 20 }, (_, i) => ({
        userId,
        title: `Note ${i}`,
        content: 'Content',
        tags: [],
      }))
      await prisma.note.createMany({ data: notes })

      const response = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: {
          cookie: authToken,
        },
        payload: {
          title: 'New Note',
          content: 'Content',
          tags: [],
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/notes',
        payload: {
          title: 'Test',
          content: 'Content',
          tags: [],
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/notes', () => {
    it('should return user notes', async () => {
      await prisma.note.createMany({
        data: [
          { userId, title: 'Note 1', content: 'Content 1', tags: ['tag1'] },
          { userId, title: 'Note 2', content: 'Content 2', tags: ['tag2'] },
        ],
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/notes',
        headers: {
          cookie: authToken,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.notes).toHaveLength(2)
    })

    it('should filter notes by tags', async () => {
      await prisma.note.createMany({
        data: [
          { userId, title: 'Work Note', content: 'Content', tags: ['work'] },
          { userId, title: 'Personal Note', content: 'Content', tags: ['personal'] },
        ],
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/notes?tags=work',
        headers: {
          cookie: authToken,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.notes).toHaveLength(1)
      expect(body.data.notes[0].title).toBe('Work Note')
    })
  })

  describe('PATCH /api/notes/:id', () => {
    it('should update note', async () => {
      const note = await prisma.note.create({
        data: {
          userId,
          title: 'Original',
          content: 'Content',
          tags: [],
        },
      })

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/notes/${note.id}`,
        headers: {
          cookie: authToken,
        },
        payload: {
          title: 'Updated',
          content: 'Updated content',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.title).toBe('Updated')
      expect(body.data.content).toBe('Updated content')
    })

    it('should return 404 for non-existent note', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/notes/non-existent-id',
        headers: {
          cookie: authToken,
        },
        payload: {
          title: 'Updated',
        },
      })

      // Debug: log the response to understand the error
      if (response.statusCode !== 404) {
        console.log('Response status:', response.statusCode)
        console.log('Response body:', response.json())
      }

      expect(response.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/notes/:id', () => {
    it('should delete note', async () => {
      const note = await prisma.note.create({
        data: {
          userId,
          title: 'To Delete',
          content: 'Content',
          tags: [],
        },
      })

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/notes/${note.id}`,
        headers: {
          cookie: authToken,
        },
      })

      expect(response.statusCode).toBe(204)

      const deleted = await prisma.note.findUnique({
        where: { id: note.id },
      })
      expect(deleted).toBeNull()
    })
  })

  describe('GET /api/notes/search', () => {
    it('should search notes by content', async () => {
      await prisma.note.createMany({
        data: [
          {
            userId,
            title: 'JavaScript Tutorial',
            content: 'Learn JavaScript basics',
            tags: [],
          },
          {
            userId,
            title: 'Python Guide',
            content: 'Learn Python programming',
            tags: [],
          },
        ],
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/notes/search?q=JavaScript',
        headers: {
          cookie: authToken,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.notes).toHaveLength(1)
      expect(body.data.notes[0].title).toBe('JavaScript Tutorial')
    })
  })
})
