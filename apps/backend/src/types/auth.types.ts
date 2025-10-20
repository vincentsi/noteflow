import { Role as PrismaRole } from '@prisma/client'

/**
 * Auth Types
 *
 * Centralized authentication type definitions to prevent duplication.
 * Role enum is directly imported from Prisma schema for consistency.
 *
 * @ai-prompt When modifying auth types:
 * - Role enum comes from Prisma schema (single source of truth)
 * - AuthUser interface used in Fastify request.user augmentation
 * - NEVER duplicate these types in other files (import from here)
 * - If adding new role, update Prisma schema first, then regenerate client
 */

/**
 * User role type (from Prisma schema)
 * Possible values: USER, ADMIN, MODERATOR
 */
export type Role = PrismaRole

/**
 * Authenticated user object injected into Fastify request
 * Used by authMiddleware to populate request.user
 */
export interface AuthUser {
  userId: string
  role: Role
  email: string
}
