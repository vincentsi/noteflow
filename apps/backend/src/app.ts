import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from '@/config/env'
import { registerSecurityMiddlewares } from '@/middlewares/security.middleware'
import { errorHandler } from '@/middlewares/error-handler.middleware'
import { csrfMiddleware } from '@/middlewares/csrf.middleware'
import { metricsMiddleware, metricsResponseHook } from '@/middlewares/metrics.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { correlationIdMiddleware } from '@/middlewares/correlation-id.middleware'
import { apiVersionMiddleware } from '@/middlewares/api-version.middleware'
import { healthRoutes } from '@/routes/health.route'
import { authRoutes } from '@/routes/auth.route'
import { verificationRoutes } from '@/routes/verification.route'
import { passwordResetRoutes } from '@/routes/password-reset.route'
import { adminRoutes } from '@/routes/admin.route'
import { stripeRoutes } from '@/routes/stripe.route'
import { premiumRoutes } from '@/routes/premium.route'
import { gdprRoutes } from '@/routes/gdpr.route'
import { metricsRoutes } from '@/routes/metrics.route'
import { testSetupRoutes } from '@/routes/test-setup.route'
import { userRoutes } from '@/routes/user.routes'
import { articleRoutes } from '@/routes/article.route'
import { summaryRoutes } from '@/routes/summary.route'
import { publicSummaryRoutes } from '@/routes/public-summary.route'
import { noteRoutes } from '@/routes/note.route'
import { transcriptionRoutes } from '@/routes/transcription.route'

/**
 * Create and configure Fastify application
 * Architecture :
 * 1. Initialize Fastify with logger
 * 2. Register security middlewares (Helmet, CORS, Rate Limit)
 * 3. Register error handler
 * 4. Register routes
 * 5. Return configured app
 */
export async function createApp(): Promise<FastifyInstance> {
  // Initialize Fastify with Pino logger
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    // Security: Limit request body size to prevent DoS attacks
    // 10MB limit to support PDF uploads (increased from 100KB)
    bodyLimit: 1024 * 1024 * 10, // 10MB
    // Security: Request timeout to prevent Slowloris attacks
    // Requests taking longer than 30s will be aborted
    requestTimeout: 30 * 1000, // 30 seconds
    // Security: Connection timeout for initial connection establishment
    connectionTimeout: 10 * 1000, // 10 seconds
    // Trust proxy headers in production (X-Forwarded-For, X-Real-IP)
    // Required for correct IP tracking in audit trail and rate limiting
    trustProxy: env.NODE_ENV === 'production',
  })

  // Register cookie plugin
  await app.register(cookie)

  // Register multipart plugin for file uploads (PDFs)
  await app.register(multipart, {
    limits: {
      fileSize: 1024 * 1024 * 10, // 10MB max file size
      files: 1, // Only 1 file at a time
    },
  })

  // Register Swagger/OpenAPI documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Fullstack Boilerplate API',
        description: 'Complete REST API with authentication, RBAC, Stripe subscriptions, and more',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
        {
          url: 'https://api.yourdomain.com',
          description: 'Production server',
        },
      ],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'verification', description: 'Email verification endpoints' },
        { name: 'password-reset', description: 'Password reset endpoints' },
        {
          name: 'gdpr',
          description: 'GDPR compliance endpoints (data export, deletion, anonymization)',
        },
        { name: 'admin', description: 'Admin-only endpoints (requires ADMIN role)' },
        { name: 'stripe', description: 'Stripe subscription endpoints' },
        { name: 'premium', description: 'Premium feature endpoints (requires subscription)' },
        { name: 'Articles', description: 'Article management endpoints (RSS feed articles)' },
        { name: 'Summaries', description: 'AI summary generation endpoints' },
        { name: 'Notes', description: 'Note management endpoints (markdown notes with tags)' },
        {
          name: 'Transcriptions',
          description: 'Audio transcription endpoints (STARTER and PRO plans only)',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT access token obtained from /api/auth/login',
          },
        },
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  })

  // SECURITY: Protect /docs with authentication in all environments
  // Prevents unauthorized access to API documentation
  // API documentation can reveal sensitive information about endpoints, schemas, and business logic
  app.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/docs')) {
      // Require authentication
      try {
        await authMiddleware(request, reply)
      } catch {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required to access API documentation',
        })
      }
    }
  })

  // Register security middlewares
  await registerSecurityMiddlewares(app)

  // Register security headers middleware
  const { securityHeadersMiddleware, contentSecurityPolicyMiddleware } =
    await import('@/middlewares/security-headers.middleware')
  app.addHook('onRequest', securityHeadersMiddleware)
  app.addHook('onRequest', contentSecurityPolicyMiddleware)

  // Register correlation ID middleware (for distributed tracing)
  app.addHook('onRequest', correlationIdMiddleware)

  // Register API versioning middleware (adds version headers)
  app.addHook('onRequest', apiVersionMiddleware)

  // Register metrics middleware (tracks HTTP requests)
  app.addHook('onRequest', metricsMiddleware)
  app.addHook('onResponse', metricsResponseHook)

  // Register CSRF protection middleware globally
  app.addHook('preHandler', csrfMiddleware)

  // Register global error handler
  app.setErrorHandler(errorHandler)

  // Note: Content type parser for Stripe webhook is registered in stripe.route.ts

  // Register routes
  await app.register(metricsRoutes) // Prometheus metrics endpoint
  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(passwordResetRoutes, { prefix: '/api/auth' })
  await app.register(verificationRoutes, { prefix: '/api/verification' })
  await app.register(gdprRoutes, { prefix: '/api/gdpr' })
  await app.register(adminRoutes, { prefix: '/api/admin' })
  await app.register(stripeRoutes, { prefix: '/api/stripe' })
  await app.register(premiumRoutes, { prefix: '/api/premium' })
  await app.register(userRoutes, { prefix: '/api/users' })
  await app.register(articleRoutes, { prefix: '/api/articles' })
  await app.register(summaryRoutes, { prefix: '/api/summaries' })
  await app.register(publicSummaryRoutes, { prefix: '/api/public/summaries' }) // Public routes (no auth)
  await app.register(noteRoutes, { prefix: '/api/notes' })
  await app.register(transcriptionRoutes, { prefix: '/api/transcriptions' })

  // SECURITY: Only register test routes in test mode OR development with explicit flag
  // Test routes provide dangerous operations (data seeding, cleanup) that must NEVER be exposed in production
  // In CI, we use development mode with ENABLE_TEST_ROUTES=true for E2E tests
  if (env.NODE_ENV === 'test' || (env.NODE_ENV === 'development' && env.ENABLE_TEST_ROUTES)) {
    await app.register(testSetupRoutes, { prefix: '/api/test-setup' })
    app.log.info(`Test routes enabled for ${env.NODE_ENV} environment`)
  }

  return app
}
