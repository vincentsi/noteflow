import { PrismaClient } from '@prisma/client'
import { env } from '@/config/env'

/**
 * PrismaClient Singleton
 * Prevents multiple instances and connection pool exhaustion
 *
 * In development, prevents hot-reload from creating new instances
 * In production, ensures single client instance across the app
 */

declare global {
  var prisma: PrismaClient | undefined
}

/**
 * Create PrismaClient with connection pooling configuration
 * Pool size: 20 connections for optimal performance
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: `${env.DATABASE_URL}?connection_limit=20&pool_timeout=20`,
      },
    },
  })

// In development, preserve instance across hot reloads
if (env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

/**
 * Graceful shutdown handler
 * Ensures connections are properly closed when app terminates
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect()
}
