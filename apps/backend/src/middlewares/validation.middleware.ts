import type { FastifyRequest, FastifyReply } from 'fastify'
import { z, ZodSchema } from 'zod'
import { ValidationError } from '@/utils/custom-errors'

/**
 * Validation Middleware Wrapper
 *
 * Provides type-safe validation for request body, query params, and path params
 * using Zod schemas. Throws ValidationError on invalid input.
 *
 * Benefits:
 * - Type safety: TypeScript knows the validated shape
 * - Consistent error messages
 * - Reusable across routes
 * - Better than Fastify's built-in JSON schema validation
 *
 * @example
 * ```typescript
 * const createUserSchema = z.object({
 *   name: z.string().min(2),
 *   email: z.string().email(),
 *   age: z.number().int().min(18),
 * })
 *
 * fastify.post('/users', {
 *   preHandler: validateBody(createUserSchema),
 *   handler: async (request, reply) => {
 *     // request.body is now typed as { name: string; email: string; age: number }
 *     const user = await createUser(request.body)
 *     return reply.send(user)
 *   }
 * })
 * ```
 */

/**
 * Validate request body
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    try {
      const validated = schema.parse(request.body)
      // Replace request.body with validated data (ensures type safety)
      request.body = validated
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        if (firstError) {
          const field = firstError.path.join('.')
          const message = `${field}: ${firstError.message}`
          throw new ValidationError(message, error.issues)
        }
        throw new ValidationError('Validation failed', error.issues)
      }
      throw error
    }
  }
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    try {
      const validated = schema.parse(request.query)
      request.query = validated
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        if (firstError) {
          const field = firstError.path.join('.')
          const message = `Query param ${field}: ${firstError.message}`
          throw new ValidationError(message, error.issues)
        }
        throw new ValidationError('Query validation failed', error.issues)
      }
      throw error
    }
  }
}

/**
 * Validate path parameters
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    try {
      const validated = schema.parse(request.params)
      request.params = validated
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        if (firstError) {
          const field = firstError.path.join('.')
          const message = `Path param ${field}: ${firstError.message}`
          throw new ValidationError(message, error.issues)
        }
        throw new ValidationError('Path param validation failed', error.issues)
      }
      throw error
    }
  }
}

/**
 * Validate headers
 */
export function validateHeaders<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    try {
      const validated = schema.parse(request.headers)
      request.headers = validated as typeof request.headers
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        if (firstError) {
          const field = firstError.path.join('.')
          const message = `Header ${field}: ${firstError.message}`
          throw new ValidationError(message, error.issues)
        }
        throw new ValidationError('Header validation failed', error.issues)
      }
      throw error
    }
  }
}

/**
 * Combine multiple validations
 *
 * @example
 * ```typescript
 * fastify.put('/users/:id', {
 *   preHandler: validate({
 *     params: z.object({ id: z.string().uuid() }),
 *     body: updateUserSchema,
 *     query: z.object({ notify: z.boolean().optional() }),
 *   }),
 *   handler: updateUserHandler
 * })
 * ```
 */
export function validate<
  TBody extends ZodSchema = ZodSchema,
  TQuery extends ZodSchema = ZodSchema,
  TParams extends ZodSchema = ZodSchema,
  THeaders extends ZodSchema = ZodSchema
>(schemas: {
  body?: TBody
  query?: TQuery
  params?: TParams
  headers?: THeaders
}) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (schemas.params) {
      await validateParams(schemas.params)(request, reply)
    }
    if (schemas.query) {
      await validateQuery(schemas.query)(request, reply)
    }
    if (schemas.headers) {
      await validateHeaders(schemas.headers)(request, reply)
    }
    if (schemas.body) {
      await validateBody(schemas.body)(request, reply)
    }
  }
}

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  /**
   * UUID parameter validation
   */
  uuidParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  /**
   * Pagination query validation
   */
  paginationQuery: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /**
   * Cursor pagination query validation
   */
  cursorPaginationQuery: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /**
   * Search query validation
   */
  searchQuery: z.object({
    q: z.string().min(1).max(200),
  }),

  /**
   * Date range query validation
   */
  dateRangeQuery: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),

  /**
   * Sort query validation
   */
  sortQuery: z.object({
    sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
}

/**
 * Type helpers to extract validated types
 */
export type ValidatedBody<T extends ZodSchema> = z.infer<T>
export type ValidatedQuery<T extends ZodSchema> = z.infer<T>
export type ValidatedParams<T extends ZodSchema> = z.infer<T>

/**
 * Example usage patterns:
 *
 * 1. Simple body validation:
 * ```typescript
 * const schema = z.object({ name: z.string() })
 * fastify.post('/items', {
 *   preHandler: validateBody(schema),
 *   handler: (req) => {
 *     // req.body is typed!
 *   }
 * })
 * ```
 *
 * 2. Multiple validations:
 * ```typescript
 * fastify.put('/items/:id', {
 *   preHandler: validate({
 *     params: commonSchemas.uuidParam,
 *     body: updateSchema,
 *     query: commonSchemas.paginationQuery,
 *   }),
 *   handler: updateHandler
 * })
 * ```
 *
 * 3. Custom error messages:
 * ```typescript
 * const schema = z.object({
 *   email: z.string().email('Please provide a valid email address'),
 *   age: z.number().min(18, 'Must be at least 18 years old'),
 * })
 * ```
 */
