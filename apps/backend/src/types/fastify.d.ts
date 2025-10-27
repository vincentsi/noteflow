import 'fastify'
import type { Subscription } from '@prisma/client'

/**
 * Extends Fastify types to add custom properties
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string
    }
    subscription?: Subscription | null
  }
}
