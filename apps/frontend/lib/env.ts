import { z } from 'zod'

/**
 * Frontend Environment Variables Schema
 *
 * Validates environment variables at build time (Next.js)
 * All frontend env vars must start with NEXT_PUBLIC_ to be exposed to browser
 *
 * IMPORTANT: This validation runs during build, not at runtime
 * If env vars are invalid, build will fail (fail-fast)
 */
const envSchema = z.object({
  // API URL (REQUIRED)
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be a valid URL')
    .refine(
      url => url.startsWith('http://') || url.startsWith('https://'),
      'NEXT_PUBLIC_API_URL must start with http:// or https://'
    ),

  // Stripe Publishable Key (OPTIONAL)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .optional()
    .refine(
      key => !key || key.startsWith('pk_'),
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_'
    ),
})

/**
 * Validate and parse environment variables
 * Throws error if validation fails
 */
const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
})

if (!parsed.success) {
  console.error('❌ Invalid frontend environment variables:')

  // Sanitize error messages (avoid exposing values in build logs)
  const sanitizedErrors = parsed.error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }))

  console.error(sanitizedErrors)
  throw new Error('Invalid environment variables')
}

/**
 * Validated and typed environment variables
 *
 * @example
 * ```typescript
 * import { env } from '@/lib/env'
 *
 * const apiUrl = env.NEXT_PUBLIC_API_URL // Type-safe, validated
 * const stripeKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY // string | undefined
 * ```
 *
 * @example
 * ```bash
 * # .env.local
 * NEXT_PUBLIC_API_URL="http://localhost:3001"
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
 * ```
 */
export const env = parsed.data
