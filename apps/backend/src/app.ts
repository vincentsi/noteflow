import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from '@/config/env'
import { registerSecurityMiddlewares } from '@/middlewares/security.middleware'
import { errorHandler } from '@/middlewares/error-handler.middleware'
import { csrfMiddleware } from '@/middlewares/csrf.middleware'
import { metricsMiddleware, metricsResponseHook } from '@/middlewares/metrics.middleware'
import { authMiddleware } from '@/middlewares/auth.middleware'
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
    // 100KB limit for JSON bodies (sufficient for most API requests)
    bodyLimit: 1024 * 100, // 100KB
  })

  // Register cookie plugin
  await app.register(cookie)

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
        { name: 'gdpr', description: 'GDPR compliance endpoints (data export, deletion, anonymization)' },
        { name: 'admin', description: 'Admin-only endpoints (requires ADMIN role)' },
        { name: 'stripe', description: 'Stripe subscription endpoints' },
        { name: 'premium', description: 'Premium feature endpoints (requires subscription)' },
        { name: 'Articles', description: 'Article management endpoints (RSS feed articles)' },
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

  // SECURITY: Protect /docs with authentication in production
  // Prevents unauthorized access to API documentation
  if (env.NODE_ENV === 'production') {
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
  }

  // Register security middlewares
  await registerSecurityMiddlewares(app)

  // Register metrics middleware (tracks HTTP requests)
  app.addHook('onRequest', metricsMiddleware)
  app.addHook('onResponse', metricsResponseHook)

  // Register CSRF protection middleware globally
  app.addHook('preHandler', csrfMiddleware)

  // Register global error handler
  app.setErrorHandler(errorHandler)

  // Note: Custom content type parser removed because it breaks regular JSON parsing
  // Stripe webhook now handles raw body differently (see stripe.controller.ts)

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
  await app.register(testSetupRoutes, { prefix: '/api/test-setup' }) // Dev only

  return app
}
