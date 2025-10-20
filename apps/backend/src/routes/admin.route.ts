import { FastifyInstance } from 'fastify'
import { authMiddleware } from '../middlewares/auth.middleware'
import { requireRole } from '../middlewares/rbac.middleware'
import { prisma } from '../config/prisma'
import { CleanupService } from '../services/cleanup.service'
import { BackupService } from '../services/backup.service'
import type { Role } from '@/types/auth.types'
import {
  listUsersSchema,
  updateUserRoleSchema,
  deleteUserSchema,
  cleanupTokensSchema,
  adminStatsSchema,
} from '@/schemas/openapi.schema'
import {
  parsePaginationParams,
  executePaginatedQuery,
  type PaginationQuery,
} from '@/utils/pagination.util'
import { logSecurityEvent } from '@/utils/logger'

/**
 * Administration routes
 * Prefix: /api/admin
 * All routes require authentication + appropriate role
 */
export async function adminRoutes(fastify: FastifyInstance) {
  // Routes reserved for ADMIN only
  fastify.register(async function (fastify) {
    // Authentication middleware
    fastify.addHook('preHandler', authMiddleware)
    // Role verification middleware
    fastify.addHook('preHandler', requireRole('ADMIN'))

    /**
     * List all users with pagination
     * GET /api/admin/users?page=1&limit=20&sortBy=createdAt&sortOrder=desc
     */
    fastify.get<{
      Querystring: PaginationQuery
    }>('/users', { schema: listUsersSchema }, async (request, reply) => {
      try {
        const paginationParams = parsePaginationParams(request.query)

        const response = await executePaginatedQuery(
          () =>
            prisma.user.findMany({
              ...paginationParams.prismaParams,
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
              },
            }),
          () => prisma.user.count(),
          paginationParams
        )

        // Rename 'items' to 'users' for backward compatibility
        reply.send({
          ...response,
          data: {
            users: response.data.items,
            pagination: response.data.pagination,
          },
        })
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: error instanceof Error ? error.message : 'Invalid pagination parameters',
        })
      }
    })

    /**
     * List all subscriptions with pagination
     * GET /api/admin/subscriptions?page=1&limit=20&sortBy=createdAt&sortOrder=desc
     */
    fastify.get<{
      Querystring: PaginationQuery
    }>('/subscriptions', async (request, reply) => {
      try {
        const paginationParams = parsePaginationParams(request.query)

        const response = await executePaginatedQuery(
          () =>
            prisma.subscription.findMany({
              ...paginationParams.prismaParams,
              select: {
                id: true,
                stripeSubscriptionId: true,
                stripePriceId: true,
                status: true,
                planType: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
                cancelAtPeriodEnd: true,
                canceledAt: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            }),
          () => prisma.subscription.count(),
          paginationParams
        )

        // Rename 'items' to 'subscriptions' for consistency
        reply.send({
          ...response,
          data: {
            subscriptions: response.data.items,
            pagination: response.data.pagination,
          },
        })
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: error instanceof Error ? error.message : 'Invalid pagination parameters',
        })
      }
    })

    /**
     * Change user role
     * PATCH /api/admin/users/:id/role
     * Body: { role: 'USER' | 'ADMIN' | 'MODERATOR' }
     */
    fastify.patch<{
      Params: { id: string }
      Body: { role: Role }
    }>('/users/:id/role', { schema: updateUserRoleSchema }, async (request, reply) => {
      const { id } = request.params
      const { role } = request.body

      if (!['USER', 'ADMIN', 'MODERATOR'].includes(role)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid role',
        })
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      })

      reply.send({
        success: true,
        message: 'Role updated',
        data: { user },
      })
    })

    /**
     * Delete a user (soft delete)
     * DELETE /api/admin/users/:id
     */
    fastify.delete<{
      Params: { id: string }
    }>('/users/:id', { schema: deleteUserSchema }, async (request, reply) => {
      const { id } = request.params

      // Prevent admin from deleting themselves
      if (id === request.user?.userId) {
        return reply.status(400).send({
          success: false,
          error: 'You cannot delete your own account',
        })
      }

      // Fetch target user to check role
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true, email: true },
      })

      if (!targetUser) {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
        })
      }

      // Prevent admin from deleting other admins
      if (targetUser.role === 'ADMIN' && request.user?.role === 'ADMIN') {
        logSecurityEvent(request, 'admin_deletion_attempt_blocked', 'high', {
          targetUserId: id,
          targetUserRole: targetUser.role,
        })

        return reply.status(403).send({
          success: false,
          error: 'Cannot delete other administrator accounts',
        })
      }

      // Soft delete user
      await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      // Log security event
      logSecurityEvent(request, 'admin_user_deletion', 'medium', {
        targetUserId: id,
        targetUserRole: targetUser.role,
        targetUserEmail: targetUser.email,
      })

      reply.send({
        success: true,
        message: 'User deleted successfully',
      })
    })

    /**
     * Trigger manual cleanup of expired tokens
     * POST /api/admin/cleanup-tokens
     */
    fastify.post('/cleanup-tokens', { schema: cleanupTokensSchema }, async (_request, reply) => {
      await CleanupService.runManualCleanup(fastify)

      reply.send({
        success: true,
        message: 'Token cleanup executed successfully',
      })
    })

    /**
     * Create manual database backup
     * POST /api/admin/backup
     */
    fastify.post('/backup', async (_request, reply) => {
      try {
        const backupPath = await BackupService.createBackup()

        reply.send({
          success: true,
          message: 'Backup created successfully',
          data: { backupPath },
        })
      } catch {
        reply.status(500).send({
          success: false,
          error: 'Backup creation failed',
        })
      }
    })

    /**
     * List all available backups
     * GET /api/admin/backups
     */
    fastify.get('/backups', async (_request, reply) => {
      const backups = await BackupService.listBackups()
      const stats = await BackupService.getBackupStats()

      reply.send({
        success: true,
        data: {
          backups,
          stats,
        },
      })
    })

    /**
     * User statistics by role
     * GET /api/admin/stats
     */
    fastify.get('/stats', { schema: adminStatsSchema }, async (_request, reply) => {
      const stats = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          _all: true,
        },
      })

      const totalUsers = await prisma.user.count()
      const verifiedUsers = await prisma.user.count({
        where: { emailVerified: true },
      })

      reply.send({
        success: true,
        data: {
          totalUsers,
          verifiedUsers,
          unverifiedUsers: totalUsers - verifiedUsers,
          byRole: stats.map((stat) => ({
            role: stat.role,
            _count: stat._count._all,
          })),
        },
      })
    })
  })
}
