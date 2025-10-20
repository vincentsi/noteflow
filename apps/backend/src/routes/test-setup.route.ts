import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '@/config/prisma'
import { env } from '@/config/env'
import bcrypt from 'bcryptjs'
import { PlanType } from '@prisma/client'

/**
 * Test Setup Routes
 *
 * DEVELOPMENT ONLY - Routes for setting up E2E test data
 * Base path: /api/test-setup
 *
 * ⚠️ These routes are ONLY available in development mode
 * ⚠️ Automatically disabled in production
 */

interface SetupTestUsersBody {
  users: Array<{
    email: string
    password: string
    name: string
    planType: PlanType
  }>
}

export async function testSetupRoutes(app: FastifyInstance): Promise<void> {
  // Skip registration if not in development
  if (env.NODE_ENV !== 'development') {
    return
  }

  /**
   * POST /api/test-setup/users
   * Create or update test users with subscriptions
   *
   * This endpoint:
   * 1. Creates users if they don't exist
   * 2. Updates planType if user exists
   * 3. Hashes passwords properly
   * 4. Returns user data without passwords
   */
  app.post('/users', async (request: FastifyRequest<{ Body: SetupTestUsersBody }>, reply: FastifyReply) => {
    try {
      const { users } = request.body

      const createdUsers = []

      for (const userData of users) {
        const { email, password, name, planType } = userData

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Upsert user (create or update)
        const user = await prisma.user.upsert({
          where: { email },
          create: {
            email,
            password: hashedPassword,
            name,
            planType,
            emailVerified: true, // Auto-verify test users
          },
          update: {
            password: hashedPassword,
            name,
            planType,
            emailVerified: true,
          },
          select: {
            id: true,
            email: true,
            name: true,
            planType: true,
            emailVerified: true,
          },
        })

        createdUsers.push(user)
      }

      return reply.code(200).send({
        success: true,
        message: `${createdUsers.length} test users created/updated`,
        users: createdUsers,
      })
    } catch (error) {
      request.log.error({ error }, 'Test setup error')
      return reply.code(500).send({
        success: false,
        message: 'Failed to setup test users',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  /**
   * DELETE /api/test-setup/users
   * Clean up all test users
   */
  app.delete('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const testEmails = [
        'test@example.com',
        'freeuser@example.com',
        'prouser@example.com',
        'starteruser@example.com',
        'existing@example.com',
      ]

      // Delete test users
      const result = await prisma.user.deleteMany({
        where: {
          email: {
            in: testEmails,
          },
        },
      })

      return reply.code(200).send({
        success: true,
        message: `${result.count} test users deleted`,
      })
    } catch (error) {
      request.log.error({ error }, 'Test cleanup error')
      return reply.code(500).send({
        success: false,
        message: 'Failed to cleanup test users',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  app.log.info('⚠️  Test setup routes registered (DEVELOPMENT MODE)')
}
