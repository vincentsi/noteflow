import { FastifyInstance } from 'fastify'
import { authMiddleware } from '../middlewares/auth.middleware'
import { requireSubscription } from '../middlewares/subscription.middleware'
import { PlanType } from '@prisma/client'
import { proFeatureSchema, businessFeatureSchema } from '@/schemas/openapi.schema'

/**
 * Premium Routes (example)
 * Prefix: /api/premium
 *
 * These routes demonstrate how to protect features by plan
 */
export async function premiumRoutes(fastify: FastifyInstance) {
  // ===== PRO Features (accessible to PRO and STARTER) =====
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', authMiddleware)
    fastify.addHook('preHandler', requireSubscription(PlanType.PRO))

    /**
     * Example PRO feature
     * GET /api/premium/pro-feature
     *
     * Accessible to users with PRO or STARTER plan
     */
    fastify.get('/pro-feature', { schema: proFeatureSchema }, async (_request, reply) => {
      reply.send({
        success: true,
        message: 'Welcome to PRO feature!',
        data: {
          feature: 'Advanced analytics',
          availableFor: ['PRO', 'STARTER'],
        },
      })
    })

    /**
     * Example: Advanced data export
     * POST /api/premium/export-data
     */
    fastify.post('/export-data', async (request, reply) => {
      const userId = request.user?.userId ?? 'unknown'

      // Export logic (example)
      reply.send({
        success: true,
        message: 'Data export started',
        data: {
          exportId: 'exp_123',
          userId,
        },
      })
    })
  })

  // ===== STARTER Features (accessible to STARTER only) =====
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', authMiddleware)
    fastify.addHook('preHandler', requireSubscription(PlanType.STARTER))

    /**
     * Example STARTER feature
     * GET /api/premium/business-feature
     *
     * Accessible only to users with STARTER plan
     */
    fastify.get('/business-feature', { schema: businessFeatureSchema }, async (_request, reply) => {
      reply.send({
        success: true,
        message: 'Welcome to STARTER feature!',
        data: {
          feature: 'Team collaboration',
          availableFor: ['STARTER'],
        },
      })
    })

    /**
     * Example: Team management
     * GET /api/premium/team
     */
    fastify.get('/team', async (_request, reply) => {
      reply.send({
        success: true,
        message: 'Team management',
        data: {
          teamMembers: [],
          maxMembers: 10,
        },
      })
    })
  })
}
