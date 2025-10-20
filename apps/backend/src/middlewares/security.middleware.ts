import { env } from '@/config/env'
import compress from '@fastify/compress'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import { getRedis, isRedisAvailable } from '@/config/redis'

/**
 * Security Middlewares Configuration
 *
 * Configures essential security layers for the API:
 * - Helmet: Security headers (XSS, clickjacking protection)
 * - CORS: Cross-origin resource sharing
 * - Rate Limiting: DDoS and brute-force prevention
 * - Compression: Response compression for bandwidth optimization
 *
 * @example
 * // In app.ts
 * await registerSecurityMiddlewares(app)
 */
export async function registerSecurityMiddlewares(
  app: FastifyInstance
): Promise<void> {
  // HTTPS redirect in production
  if (env.NODE_ENV === 'production') {
    app.addHook('onRequest', async (request, reply) => {
      const proto = request.headers['x-forwarded-proto'] as string
      if (proto && !proto.includes('https')) {
        return reply.redirect(`https://${request.hostname}${request.url}`, 301)
      }
    })
  }

  // Compression - Gzip/Deflate optimized for API responses
  await app.register(compress, {
    global: true,
    threshold: 2048, // Only compress responses > 2KB
    encodings: ['gzip', 'deflate'], // Avoid Brotli (too slow for real-time APIs)
  })

  // Helmet - Security headers with strict CSP
  await app.register(helmet, {
    contentSecurityPolicy:
      env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
    crossOriginOpenerPolicy: env.NODE_ENV === 'production' ? { policy: 'same-origin' } : false,
    crossOriginResourcePolicy: env.NODE_ENV === 'production' ? { policy: 'same-origin' } : false,
  })

  // CORS - Cross-origin configuration
  // NOTE: Wildcard (*) origins are blocked by env.ts validation (lines 36-37)
  // Only explicit URLs from FRONTEND_URL env var are allowed for security
  await app.register(cors, {
    origin: env.FRONTEND_URL.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Cache preflight requests for 24h to reduce OPTIONS requests
    // Performance improvement: ~100ms saved per preflight request
    maxAge: 86400, // 24 hours
  })

  // Rate Limiting - Prevent abuse (disabled in test environment)
  // Uses Redis for distributed rate limiting across multiple instances
  if (env.NODE_ENV !== 'test') {
    // Try to use Redis for distributed rate limiting
    const redis = isRedisAvailable() ? getRedis() : undefined

    if (redis) {
      app.log.info('✅ Rate limiting configured with Redis (distributed across instances)')
    } else {
      app.log.warn('⚠️  Rate limiting using in-memory storage (not shared between instances)')
    }

    await app.register(rateLimit, {
      max: env.NODE_ENV === 'production' ? 30 : 200, // Stricter in production (30 req/15min vs 50)
      timeWindow: '15 minutes',
      redis: redis, // Distributed rate limiting via Redis (shared across instances)
      skipOnError: true, // If Redis fails, allow requests (graceful degradation)
      errorResponseBuilder: () => ({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded, please try again later.',
      }),
    })
  }
}
