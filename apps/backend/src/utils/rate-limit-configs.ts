import type { FastifyRequest } from 'fastify'
import { env } from '@/config/env'

export interface RateLimitConfig {
  max: number
  timeWindow: string
  keyGenerator: (request: FastifyRequest) => string
  errorResponseBuilder: () => {
    statusCode: number
    error: string
    message: string
  }
}

export const createRateLimitConfig = (
  prefix: string,
  message: string,
  max?: number
): RateLimitConfig => ({
  max: max || (env.NODE_ENV === 'production' ? 60 : 100),
  timeWindow: '1 hour',
  keyGenerator: (request: FastifyRequest) => `${prefix}:${request.user?.userId || 'anonymous'}`,
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message,
  }),
})

export const rateLimitPresets = {
  noteCreate: createRateLimitConfig(
    'note:create',
    'Too many note creation attempts. Try again in 1 hour.'
  ),
  noteUpdate: createRateLimitConfig(
    'note:update',
    'Too many note update attempts. Try again in 1 hour.'
  ),
  noteDelete: createRateLimitConfig(
    'note:delete',
    'Too many note deletion attempts. Try again in 1 hour.'
  ),
  summaryCreate: createRateLimitConfig(
    'summary:create',
    'Too many summary creation attempts. Try again in 1 hour.'
  ),
  articleSave: createRateLimitConfig(
    'article:save',
    'Too many article save attempts. Try again in 1 hour.'
  ),
  articleUnsave: createRateLimitConfig(
    'article:unsave',
    'Too many article unsave attempts. Try again in 1 hour.'
  ),
}
