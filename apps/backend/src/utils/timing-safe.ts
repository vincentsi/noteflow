/**
 * Timing-Safe Utilities
 *
 * Provides constant-time delays to prevent timing attacks on authentication operations.
 * Attackers can measure response times to infer information (e.g., user existence).
 *
 * Security Best Practices:
 * - Add random delays (200-300ms) to ALL auth operations (success AND failure)
 * - Prevents attackers from distinguishing between valid/invalid credentials
 * - Prevents user enumeration through timing analysis
 *
 * @ai-prompt When using these utilities:
 * - ALWAYS call addAuthDelay() at the START of auth operations (not end)
 * - Use for: login, register, password reset, email verification
 * - Delay range: 200-300ms (balance security vs UX)
 * - Apply to both success and failure paths
 *
 * @example
 * ```typescript
 * async login(data: LoginDTO, ip: string) {
 *   // Add delay at START to ensure constant total time
 *   await addAuthDelay()
 *
 *   // Perform authentication logic...
 *   const user = await prisma.user.findUnique(...)
 *   if (!user || !validPassword) {
 *     throw new Error('Invalid credentials')
 *   }
 *
 *   return { user, tokens }
 * }
 * ```
 */

/**
 * Add a random delay between min and max milliseconds
 * Used for timing attack protection
 *
 * @param min - Minimum delay in milliseconds (default: 200ms)
 * @param max - Maximum delay in milliseconds (default: 300ms)
 * @returns Promise that resolves after the random delay
 */
export async function addRandomDelay(min = 200, max = 300): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Add authentication operation delay (200-300ms random)
 *
 * This is a specialized version of addRandomDelay for auth operations.
 * The 200-300ms range provides good security without significantly impacting UX.
 *
 * @returns Promise that resolves after 200-300ms
 */
export async function addAuthDelay(): Promise<void> {
  return addRandomDelay(200, 300)
}

/**
 * Execute a function with a guaranteed minimum execution time
 *
 * Ensures the function always takes at least `minTime` milliseconds to complete,
 * adding padding delay if the function finishes early. This prevents timing attacks
 * where different code paths take different amounts of time.
 *
 * @param fn - Async function to execute
 * @param minTime - Minimum execution time in milliseconds (default: 200ms)
 * @returns Promise resolving to the function's return value
 *
 * @example
 * ```typescript
 * // Ensure password check always takes at least 200ms
 * const isValid = await withMinimumTime(
 *   async () => await bcrypt.compare(password, hash),
 *   200
 * )
 * ```
 */
export async function withMinimumTime<T>(fn: () => Promise<T>, minTime = 200): Promise<T> {
  const startTime = Date.now()
  const result = await fn()
  const elapsedTime = Date.now() - startTime

  if (elapsedTime < minTime) {
    await new Promise(resolve => setTimeout(resolve, minTime - elapsedTime))
  }

  return result
}
