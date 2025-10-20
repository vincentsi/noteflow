import 'fastify'

/**
 * Extends Fastify types to add custom properties
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string
    }
  }
}
