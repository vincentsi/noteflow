import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@/config/prisma'

type ResourceType = 'summary' | 'note' | 'article'

export const verifyResourceOwnership =
  (resourceType: ResourceType, idParam: string = 'id') =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const resourceId = (request.params as Record<string, string>)[idParam]
    const userId = request.user?.userId

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      })
    }

    let resource

    switch (resourceType) {
      case 'summary':
        resource = await prisma.summary.findFirst({
          where: { id: resourceId, userId },
        })
        break

      case 'note':
        resource = await prisma.note.findFirst({
          where: { id: resourceId, userId },
        })
        break

      case 'article':
        resource = await prisma.savedArticle.findFirst({
          where: { articleId: resourceId, userId },
        })
        break
    }

    if (!resource) {
      return reply.status(404).send({
        success: false,
        error: 'Resource not found',
      })
    }
  }
