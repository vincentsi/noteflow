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
export async function registerSecurityMiddlewares(app: FastifyInstance): Promise<void> {
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

  // Helmet - Security headers with enhanced configuration
  // CSP configured for API with minimal directives for webhook endpoints
  await app.register(helmet, {
    // Basic CSP for API endpoints (restrictive, only allows same-origin)
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'none'"], // Prevent iframe embedding
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
    // HSTS - Force HTTPS for 1 year
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Prevent MIME type sniffing
    noSniff: true,
    // Disable X-Powered-By header (hide tech stack)
    hidePoweredBy: true,
    // Cross-origin policies (stricter in production)
    crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
    crossOriginOpenerPolicy: env.NODE_ENV === 'production' ? { policy: 'same-origin' } : false,
    crossOriginResourcePolicy: env.NODE_ENV === 'production' ? { policy: 'same-origin' } : false,
    // Referrer policy - only send origin on cross-origin requests
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
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
      max: env.NODE_ENV === 'production' ? 100 : 200, // 100 requests per 15 minutes in production
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
