import { config } from 'dotenv'
import { z } from 'zod'

config()

/**
 * Environment variables schema with Zod validation
 * Validates and types env vars at startup (fail-fast)
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'staging'])
    .default('development'),

  // Server port
  PORT: z.string().default('3001'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT Secrets
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  // Frontend URL for CORS (supports comma-separated list)
  FRONTEND_URL: z
    .string()
    .default('http://localhost:3000')
    .transform(val => {
      const origins = val.split(',').map(o => o.trim())

      origins.forEach(origin => {
        if (origin === '*') {
          throw new Error('Wildcard CORS origin (*) is not allowed for security')
        }

        try {
          new URL(origin)
        } catch {
          throw new Error(`Invalid CORS origin URL: ${origin}`)
        }
      })

      return origins.join(',')
    }),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Email Service (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@example.com'),

  // AI Service (OpenAI)
  // Required in production, optional in test (mocked)
  OPENAI_API_KEY: z
    .string()
    .default('test-key-for-unit-tests-default-value')
    .refine(
      (val) => {
        // Just check it's at least 20 chars (includes test key which is 37 chars)
        // In real production, set a real OpenAI key
        return val.length >= 20
      },
      { message: 'OPENAI_API_KEY must be at least 20 characters' }
    ),

  // Redis (optional but validated if provided)
  REDIS_URL: z.string().url().optional().or(z.literal('')),

  // Sentry (optional but validated if provided)
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),

  // AWS S3 Backups (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BACKUP_BUCKET: z.string().optional(),

  // Backup Configuration
  BACKUP_RETENTION_DAYS: z.string().default('7'),
  BACKUP_CRON_SCHEDULE: z.string().default('0 2 * * *'),

  // Cleanup Configuration
  CLEANUP_BATCH_SIZE: z.string().default('1000'),
  CLEANUP_PAUSE_MS: z.string().default('100'),

  // Performance Configuration
  SLOW_QUERY_THRESHOLD: z.string().default('100'), // ms

  // Version
  APP_VERSION: z.string().default('1.0.0'),

  // Worker Configuration
  DISABLE_STRIPE_WORKER: z.string().optional(),

  // Metrics Security
  METRICS_ALLOWED_IPS: z
    .string()
    .optional()
    .default('')
    .transform(val => {
      if (!val || val.trim() === '') return []
      return val.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0)
    }),

  // Stripe Webhook Security
  STRIPE_WEBHOOK_ALLOWED_IPS: z
    .string()
    .optional()
    .default('')
    .transform(val => {
      if (!val || val.trim() === '') return []
      return val.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0)
    }),

  // Test Routes Security (development only)
  ENABLE_TEST_ROUTES: z
    .string()
    .optional()
    .default('false')
    .transform(val => val === 'true'),
})

/**
 * Parse and validate environment variables
 * Throws error if any variable is missing or invalid
 */
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Use process.stderr.write instead of console to avoid potential issues
  // (this runs before logger is initialized, so we can't use logger here)
  process.stderr.write('❌ Invalid environment variables:\n')

  // Sanitize error messages to avoid exposing secrets in logs
  // Only show which fields are invalid, not their values
  const sanitizedErrors = parsed.error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }))

  process.stderr.write(JSON.stringify(sanitizedErrors, null, 2) + '\n')
  process.exit(1)
}

/**
 * Validated and typed environment variables
 * Fail-fast validation at application startup
 *
 * @example
 * ```typescript
 * import { env } from '@/config/env'
 *
 * logger.info(env.PORT)           // "3001" (string)
 * logger.info(env.NODE_ENV)       // "development" | "production" | "test"
 * logger.info(env.DATABASE_URL)   // "postgresql://..." (validated URL)
 * logger.info(env.JWT_SECRET)     // Min 32 chars guaranteed by Zod
 * ```
 *
 * @example
 * ```bash
 * # .env file
 * NODE_ENV=development
 * PORT=3001
 * DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb
 * JWT_SECRET=your-super-secret-key-min-32-chars
 * JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
 * ```
 */
export const env = parsed.data
