import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify'
import type { z } from 'zod'
import { requireAuth } from './require-auth'
import { handleControllerError } from './error-response'

/**
 * Async handler wrapper for Fastify controllers
 * Automatically catches errors and passes them to error handler middleware
 *
 * Why use this?
 * - Eliminates repetitive try-catch blocks in controllers
 * - Centralized error handling
 * - Cleaner controller code
 *
 * Usage:
 * ```typescript
 * export class AuthController {
 *   register = asyncHandler<{ Body: RegisterDTO }>(async (request, reply) => {
 *     const data = registerSchema.parse(request.body)
 *     const result = await authService.register(data)
 *     return reply.status(201).send({ success: true, data: result })
 *   })
 * }
 * ```
 */
export function asyncHandler<RouteGeneric extends RouteGenericInterface = RouteGenericInterface>(
  fn: (request: FastifyRequest<RouteGeneric>, reply: FastifyReply) => Promise<unknown>
) {
  return async (request: FastifyRequest<RouteGeneric>, reply: FastifyReply) => {
    // Simply await and let errors bubble up to the global error handler
    // app.setErrorHandler() in app.ts will catch them
    return await fn(request, reply)
  }
}

/**
 * Alternative: Controller class method decorator
 * Auto-wraps all methods in a controller class
 *
 * Usage:
 * ```typescript
 * @ControllerWrapper()
 * export class AuthController {
 *   async register(request, reply) {
 *     // No need for try-catch
 *   }
 * }
 * ```
 */
export function ControllerWrapper() {
  return function <T extends { new (...args: unknown[]): object }>(constructor: T) {
    const original = constructor

    const newConstructor = function (this: InstanceType<typeof constructor>, ...args: unknown[]) {
      const instance = new original(...args) as InstanceType<typeof constructor>

      // Wrap all methods
      Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).forEach(name => {
        const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(instance), name)

        if (name !== 'constructor' && descriptor && typeof descriptor.value === 'function') {
          const originalMethod = descriptor.value

          descriptor.value = async function (
            this: InstanceType<typeof constructor>,
            ...methodArgs: unknown[]
          ) {
            // Simply await and let errors bubble up to the global error handler
            return await originalMethod.apply(this, methodArgs)
          }

          Object.defineProperty(instance, name, descriptor)
        }
      })

      return instance
    }

    newConstructor.prototype = original.prototype
    return newConstructor as unknown as T
  }
}

export function createAuthHandler<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (userId: string, data: TInput, request: FastifyRequest) => Promise<TOutput>,
  successStatus: number = 200
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = requireAuth(request)
      const data = schema.parse(request.body)
      const result = await handler(userId, data, request)

      return reply.status(successStatus).send({
        success: true,
        data: result,
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }
}

export function createAuthQueryHandler<TQuery, TOutput>(
  schema: z.ZodSchema<TQuery>,
  handler: (userId: string, query: TQuery, request: FastifyRequest) => Promise<TOutput>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = requireAuth(request)
      const query = schema.parse(request.query)
      const result = await handler(userId, query, request)

      return reply.status(200).send({
        success: true,
        data: result,
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }
}

export function createAuthParamHandler<TOutput>(
  handler: (
    userId: string,
    params: Record<string, string>,
    request: FastifyRequest
  ) => Promise<TOutput>,
  customErrorHandlers?: Record<string, (err: Error, reply: FastifyReply) => FastifyReply>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = requireAuth(request)
      const params = request.params as Record<string, string>
      const result = await handler(userId, params, request)

      return reply.status(200).send({
        success: true,
        data: result,
      })
    } catch (error) {
      return handleControllerError(error, request, reply, customErrorHandlers)
    }
  }
}

export function createAuthParamBodyHandler<TParams, TBody, TOutput>(
  paramsSchema: z.ZodSchema<TParams>,
  bodySchema: z.ZodSchema<TBody>,
  handler: (
    userId: string,
    params: TParams,
    body: TBody,
    request: FastifyRequest
  ) => Promise<TOutput>,
  customErrorHandlers?: Record<string, (err: Error, reply: FastifyReply) => FastifyReply>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = requireAuth(request)
      const params = paramsSchema.parse(request.params)
      const body = bodySchema.parse(request.body)
      const result = await handler(userId, params, body, request)

      return reply.status(200).send({
        success: true,
        data: result,
      })
    } catch (error) {
      return handleControllerError(error, request, reply, customErrorHandlers)
    }
  }
}
