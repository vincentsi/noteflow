import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify'

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

    const newConstructor = function (
      this: InstanceType<typeof constructor>,
      ...args: unknown[]
    ) {
      const instance = new original(...args) as InstanceType<typeof constructor>

      // Wrap all methods
      Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).forEach((name) => {
        const descriptor = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(instance),
          name
        )

        if (
          name !== 'constructor' &&
          descriptor &&
          typeof descriptor.value === 'function'
        ) {
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
