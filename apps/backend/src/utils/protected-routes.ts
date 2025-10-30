import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'

/**
 * Protected Routes Utility
 *
 * Wraps route registration functions with authentication middleware.
 * Eliminates duplicate `fastify.addHook('preHandler', authMiddleware)` calls
 * across 8+ route files.
 *
 * **Before (in every route file):**
 * ```typescript
 * export async function articleRoutes(fastify: FastifyInstance): Promise<void> {
 *   fastify.addHook('preHandler', authMiddleware) // Repeated!
 *
 *   fastify.get('/', articleController.getArticles)
 *   fastify.post('/', articleController.createArticle)
 * }
 * ```
 *
 * **After:**
 * ```typescript
 * export const articleRoutes = createProtectedRoutes(async (fastify) => {
 *   fastify.get('/', articleController.getArticles)
 *   fastify.post('/', articleController.createArticle)
 * })
 * ```
 *
 * **Benefits:**
 * - Removes duplicate middleware registration from 8 files
 * - Clearer separation of public vs protected routes
 * - Easier to add global hooks (e.g., rate limiting) to all protected routes
 * - Consistent authentication enforcement
 *
 * @param registerFn - Function that registers routes on the Fastify instance
 * @returns Async function that adds auth middleware then calls registerFn
 *
 * @example
 * ```typescript
 * // apps/backend/src/routes/note.route.ts
 * import { createProtectedRoutes } from '@/utils/protected-routes'
 * import { noteController } from '@/controllers/note.controller'
 *
 * export const noteRoutes = createProtectedRoutes(async (fastify) => {
 *   fastify.get('/', noteController.getNotes.bind(noteController))
 *   fastify.post('/', noteController.createNote.bind(noteController))
 *   fastify.get('/:id', noteController.getNoteById.bind(noteController))
 *   fastify.put('/:id', noteController.updateNote.bind(noteController))
 *   fastify.delete('/:id', noteController.deleteNote.bind(noteController))
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Public routes (no auth required)
 * export async function publicRoutes(fastify: FastifyInstance) {
 *   fastify.get('/health', healthController.check)
 *   fastify.post('/auth/login', authController.login)
 * }
 *
 * // Protected routes (auth required)
 * export const protectedRoutes = createProtectedRoutes(async (fastify) => {
 *   fastify.get('/profile', userController.getProfile)
 * })
 * ```
 */
export function createProtectedRoutes(
  registerFn: (fastify: FastifyInstance) => Promise<void>
): (fastify: FastifyInstance) => Promise<void> {
  return async (fastify: FastifyInstance) => {
    // Add authentication middleware to all routes in this scope
    fastify.addHook('preHandler', authMiddleware)

    // Call the provided registration function
    await registerFn(fastify)
  }
}
