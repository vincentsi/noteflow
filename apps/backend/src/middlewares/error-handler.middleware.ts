import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { env } from '@/config/env'
import { captureException } from '@/config/sentry'
import { AppError, isAppError } from '@/utils/custom-errors'

/**
 * Global Error Handler (ARCH-003)
 * Centralizes error handling to avoid duplication
 * Handles:
 * - Custom AppError classes (BadRequestError, NotFoundError, etc.)
 * - Zod validation errors
 * - Prisma database errors
 * - JWT token errors
 * - Rate limit errors
 * Captures 5xx errors in Sentry for monitoring
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Custom AppError classes (ARCH-003)
  if (isAppError(error)) {
    const appError = error as AppError

    // Log operational errors (4xx) at info level
    if (appError.statusCode < 500) {
      request.log.info(
        {
          statusCode: appError.statusCode,
          errorType: appError.name,
          message: appError.message,
          userId: request.user?.userId,
        },
        'Client error'
      )
    } else {
      // Log server errors (5xx) at error level
      request.log.error(appError, 'Server error')

      // Capture non-operational errors in Sentry
      if (!appError.isOperational && env.NODE_ENV === 'production') {
        captureException(appError, {
          user: request.user ? { id: request.user.userId } : undefined,
          extra: {
            url: request.url,
            method: request.method,
            ip: request.ip,
            statusCode: appError.statusCode,
          },
        })
      }
    }

    return reply.status(appError.statusCode).send({
      success: false,
      error: appError.message,
      code: appError.name,
    })
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const zodError = error as ZodError<unknown>
    return reply.status(400).send({
      success: false,
      error: 'Validation error',
      details: env.NODE_ENV === 'development' ? zodError.issues : undefined,
    })
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g. email already exists)
    if (error.code === 'P2002') {
      const field = (error.meta?.target as string[])?.join(', ') || 'field'
      return reply.status(409).send({
        success: false,
        error: `${field} already exists`,
      })
    }

    // Record not found
    if (error.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: 'Resource not found',
      })
    }
  }

  // JWT errors (expired, invalid, etc.)
  if (
    error.message.includes('jwt') ||
    error.message.includes('token') ||
    error.name === 'JsonWebTokenError' ||
    error.name === 'TokenExpiredError'
  ) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
    })
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: 'Too many requests, please try again later',
    })
  }

  // Generic server error
  request.log.error(error)

  // Capture 5xx errors in Sentry (server errors only)
  const statusCode = error.statusCode || 500
  if (statusCode >= 500 && env.NODE_ENV === 'production') {
    captureException(error, {
      user: request.user ? { id: request.user.userId } : undefined,
      extra: {
        url: request.url,
        method: request.method,
        ip: request.ip,
        statusCode,
      },
    })
  }

  return reply.status(statusCode).send({
    success: false,
    error: error.message || 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  })
}
