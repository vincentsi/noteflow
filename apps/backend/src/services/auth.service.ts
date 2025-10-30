import { env } from '@/config/env'
import { prisma } from '@/config/prisma'
import type { LoginDTO, RegisterDTO } from '@/schemas/auth.schema'
import { TokenHasher } from '@/utils/token-hasher'
import { logger } from '@/utils/logger'
import type { User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { VerificationService } from './verification.service'
import { AUTH_CONFIG } from '@/constants/performance'
import { addAuthDelay } from '@/utils/timing-safe'

/**
 * Authentication Service
 *
 * Core authentication logic with enterprise-grade security:
 * - JWT tokens (access: 15min, refresh: 7 days)
 * - Token rotation on refresh (old token revoked)
 * - Tokens hashed in DB (SHA-256 via TokenHasher)
 * - Timing attack protection (constant-time login)
 * - bcrypt password hashing (salt rounds: 10)
 * - Role & email embedded in JWT (zero DB queries for auth)
 * - Soft delete support (deletedAt check prevents deleted users from authenticating)
 * - Audit trail tracking (lastLoginAt, lastLoginIp, loginCount updated on each login)
 *
 * @ai-prompt When modifying this service:
 * - NEVER store tokens in plaintext (use TokenHasher)
 * - ALWAYS maintain timing attack protection in login (bcrypt must run even if user doesn't exist)
 * - Token rotation is critical for security (revoke old token on refresh)
 * - JWT payload includes userId, role, email (enables RBAC without DB query)
 * - Password hashes NEVER exposed in responses (use Omit<User, 'password'>)
 * - Consider email enumeration when adding endpoints (keep errors generic)
 * - ALWAYS check deletedAt before allowing authentication (login, refresh, getCurrentUser)
 * - Audit trail (lastLoginAt, lastLoginIp, loginCount) MUST be updated on successful login
 *
 * @example
 * ```typescript
 * // Register new user
 * const result = await authService.register({
 *   email: 'user@example.com',
 *   password: 'SecurePass123'
 * })
 *
 * // Login existing user (with IP tracking)
 * const { user, accessToken, refreshToken } = await authService.login({
 *   email: 'user@example.com',
 *   password: 'SecurePass123'
 * }, '127.0.0.1')
 *
 * // Verify token in middleware
 * const payload = authService.verifyAccessToken(token)
 * // payload = { userId: '...', role: 'USER', email: '...' }
 *
 * // Refresh expired token
 * const newTokens = await authService.refresh(refreshToken)
 * ```
 */
export class AuthService {
  /**
   * Dummy password hash for timing attack protection (SEC-012)
   * Used when user doesn't exist to ensure constant-time response
   * Valid bcrypt hash of "dummy-password-for-timing-attack-protection"
   *
   * ⚠️ SECURITY NOTE: This hash is intentionally public and poses NO security risk.
   *
   * **Why this is safe:**
   * - This is NOT a real user's password hash
   * - It's a placeholder hash used only for timing attack protection
   * - The dummy password "dummy-password-for-timing-attack-protection" is public and known
   * - Even if an attacker knows this hash, it provides no advantage
   *
   * **Purpose:**
   * When a user tries to login with a non-existent email, we still run bcrypt.compare()
   * against this dummy hash. This ensures constant-time execution regardless of whether
   * the email exists or not, preventing timing attacks that could enumerate valid emails.
   *
   * **Attack Scenario Prevented:**
   * 1. Attacker tries login with email@example.com (doesn't exist)
   * 2. Without dummy hash: Response time = 10ms (no bcrypt comparison)
   * 3. Attacker tries login with real@example.com (exists)
   * 4. Without dummy hash: Response time = 100ms (bcrypt comparison runs)
   * 5. Attacker can enumerate valid emails by measuring response times
   *
   * **With dummy hash:**
   * - Both scenarios run bcrypt.compare() → constant ~100ms response time
   * - Attacker cannot distinguish between existing and non-existing users
   *
   * @see https://cwe.mitre.org/data/definitions/208.html (CWE-208: Observable Timing Discrepancy)
   * @see https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account
   */
  private static readonly DUMMY_HASH =
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

  /**
   * Hash a password with bcrypt
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, AUTH_CONFIG.BCRYPT_SALT_ROUNDS)
  }

  /**
   * Compare a password with its hash
   * @param password - Plain text password
   * @param hashedPassword - Hashed password
   * @returns true if match, false otherwise
   */
  private async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  /**
   * Generate an access token JWT
   * @param userId - User ID
   * @param role - User role (for RBAC without DB query)
   * @param email - User email (for Stripe without DB query)
   * @returns Access token (expires in 15 minutes)
   */
  private generateAccessToken(userId: string, role: string, email: string): string {
    return jwt.sign({ userId, role, email }, env.JWT_SECRET, {
      expiresIn: '15m',
    })
  }

  /**
   * Generate a refresh token JWT
   * @param userId - User ID
   * @returns Refresh token (expires in 7 days)
   */
  private generateRefreshToken(userId: string): string {
    // Add jti (JWT ID) to ensure uniqueness even if called multiple times in same second
    // This prevents hash collisions when storing in DB with unique constraint
    const jti = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    return jwt.sign({ userId, jti }, env.JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    })
  }

  /**
   * Store a refresh token in DB (hashed for security)
   * @param token - Refresh token to store (plain text)
   * @param userId - User ID
   */
  private async storeRefreshToken(token: string, userId: string): Promise<void> {
    const hashedToken = TokenHasher.hash(token)

    await prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })
  }

  /**
   * Verify an access token
   * @param token - JWT access token
   * @returns Token payload if valid (userId, role, email)
   * @throws Error if token invalid or expired
   *
   * @example
   * ```typescript
   * try {
   *   const payload = authService.verifyAccessToken('eyJhbGc...')
   *   logger.info(payload.userId)  // "clxxx..."
   *   logger.info(payload.role)    // "USER"
   *   logger.info(payload.email)   // "user@example.com"
   * } catch (error) {
   *   logger.error('Invalid token')
   * }
   * ```
   */
  verifyAccessToken(token: string): {
    userId: string
    role: string
    email: string
  } {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as {
        userId: string
        role: string
        email: string
      }
      return payload
    } catch {
      throw new Error('Invalid or expired access token')
    }
  }

  /**
   * Verify a refresh token
   * @param token - JWT refresh token
   * @returns Token payload if valid
   * @throws Error if token invalid or expired
   */
  verifyRefreshToken(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
        userId: string
      }
      return payload
    } catch {
      throw new Error('Invalid or expired refresh token')
    }
  }

  /**
   * Register a new user
   * @param data - Registration data (email, password, optional name)
   * @returns Created user with access and refresh tokens
   * @throws Error if email already in use
   *
   * @example
   * ```typescript
   * const result = await authService.register({
   *   email: 'user@example.com',
   *   password: 'SecurePass123',
   *   name: 'John Doe'
   * })
   *
   * logger.info(result.user.id)           // "clxxx..."
   * logger.info(result.accessToken)       // "eyJhbGc..."
   * logger.info(result.refreshToken)      // "eyJhbGc..."
   * ```
   */
  async register(data: RegisterDTO): Promise<{
    user: Omit<User, 'password'>
    accessToken: string
    refreshToken: string
  }> {
    // Add random delay (200-300ms) to prevent timing attacks
    // This prevents attackers from determining if an email exists by measuring response time
    await addAuthDelay()

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      // Generic error to prevent email enumeration
      // Log for monitoring but don't reveal email exists to client
      logger.warn({ email: data.email }, 'Registration attempt with existing email')
      throw new Error('Registration failed. Please check your information.')
    }

    const hashedPassword = await this.hashPassword(data.password)

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        emailVerified: false,
      },
    })

    await VerificationService.createVerificationToken(user.id, user.email)

    const accessToken = this.generateAccessToken(user.id, user.role, user.email)
    const refreshToken = this.generateRefreshToken(user.id)

    await this.storeRefreshToken(refreshToken, user.id)

    const { password: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }
  }

  /**
   * Login a user
   * @param data - Login credentials (email, password)
   * @param ipAddress - Optional IP address for audit trail
   * @returns User with access and refresh tokens
   * @throws Error if credentials invalid or account deleted
   *
   * Updates audit trail on successful login:
   * - lastLoginAt: Current timestamp
   * - lastLoginIp: Client IP address (if provided)
   * - loginCount: Incremented by 1
   *
   * @example
   * ```typescript
   * const result = await authService.login({
   *   email: 'user@example.com',
   *   password: 'SecurePass123'
   * }, '127.0.0.1')
   *
   * logger.info(result.user.email)        // "user@example.com"
   * logger.info(result.accessToken)       // "eyJhbGc..." (expires in 15min)
   * logger.info(result.refreshToken)      // "eyJhbGc..." (expires in 7 days)
   * ```
   */
  async login(
    data: LoginDTO,
    ipAddress?: string
  ): Promise<{
    user: Omit<User, 'password'>
    accessToken: string
    refreshToken: string
  }> {
    // 🔒 SECURITY: Add random delay (200-300ms) to prevent timing attacks
    // This prevents attackers from determining if an email exists by measuring response time
    await addAuthDelay()

    // Check for account lockout (SEC-015, SEC-020)
    const { AccountLockoutService } = await import('./account-lockout.service')
    await AccountLockoutService.checkLockout(data.email, ipAddress || 'unknown')

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    // Timing attack protection: always run bcrypt.compare even if user doesn't exist
    // Ensures constant-time response regardless of email validity
    const passwordToCompare = user?.password || AuthService.DUMMY_HASH
    const isPasswordValid = await this.comparePassword(data.password, passwordToCompare)

    if (!user || !isPasswordValid) {
      // Record failed attempt (SEC-015, SEC-020)
      await AccountLockoutService.recordFailedAttempt(data.email, ipAddress || 'unknown')
      throw new Error('Invalid credentials')
    }

    // Check if user is soft-deleted
    if (user.deletedAt) {
      throw new Error('Account has been deleted')
    }

    // Reset lockout attempts after successful login (SEC-015, SEC-020)
    await AccountLockoutService.resetAttempts(data.email, ipAddress || 'unknown')

    // Update audit trail
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        loginCount: { increment: 1 },
      },
    })

    const accessToken = this.generateAccessToken(user.id, user.role, user.email)
    const refreshToken = this.generateRefreshToken(user.id)

    await this.storeRefreshToken(refreshToken, user.id)

    const { password: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    }
  }

  /**
   * Refresh the access token with a refresh token
   * @param refreshToken - Valid refresh token (7 days)
   * @returns New access token and refresh token
   * @throws Error if refresh token invalid or user deleted
   *
   * @example
   * ```typescript
   * const tokens = await authService.refresh('eyJhbGc...')
   *
   * logger.info(tokens.accessToken)       // New token (15min)
   * logger.info(tokens.refreshToken)      // New refresh token (7d)
   * ```
   */
  async refresh(refreshToken: string): Promise<{
    accessToken: string
    refreshToken: string
  }> {
    this.verifyRefreshToken(refreshToken)

    const hashedToken = TokenHasher.hash(refreshToken)

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    })

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token')
    }

    if (!storedToken.user) {
      throw new Error('User not found')
    }

    // Check if user is soft-deleted
    if (storedToken.user.deletedAt) {
      throw new Error('Account has been deleted')
    }

    // Delete old token to prevent database bloat
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    })

    const newAccessToken = this.generateAccessToken(
      storedToken.userId,
      storedToken.user.role,
      storedToken.user.email
    )
    const newRefreshToken = this.generateRefreshToken(storedToken.userId)

    await this.storeRefreshToken(newRefreshToken, storedToken.userId)

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  }

  /**
   * Logout a user by revoking refresh tokens
   * @param userId - User ID
   * @param refreshToken - Specific token to revoke (optional)
   *
   * @example
   * ```typescript
   * // Revoke a specific token
   * await authService.logout(userId, 'eyJhbGc...')
   *
   * // Revoke all user tokens
   * await authService.logout(userId)
   * ```
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const hashedToken = TokenHasher.hash(refreshToken)

      await prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: hashedToken,
        },
      })
    } else {
      await prisma.refreshToken.deleteMany({
        where: { userId },
      })
    }
  }

  /**
   * Get current user by ID
   * @param userId - User ID
   * @returns User without password
   * @throws Error if user not found or deleted
   */
  async getCurrentUser(userId: string): Promise<Omit<User, 'password'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user is soft-deleted
    if (user.deletedAt) {
      throw new Error('Account has been deleted')
    }

    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  /**
   * Update user profile (name and/or email)
   * @param userId - User ID
   * @param data - Profile data to update (name, email)
   * @returns Updated user without password
   * @throws Error if user not found, deleted, or email already in use
   */
  async updateProfile(
    userId: string,
    data: { name?: string; email?: string }
  ): Promise<Omit<User, 'password'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user is soft-deleted
    if (user.deletedAt) {
      throw new Error('Account has been deleted')
    }

    // If email is being updated, check if new email is already in use
    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (existingUser) {
        // Generic error to prevent email enumeration
        logger.warn(
          { userId, requestedEmail: data.email },
          'Profile update attempt with existing email'
        )
        throw new Error('Profile update failed. Please check your information.')
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name !== undefined ? data.name : user.name,
        email: data.email || user.email,
      },
    })

    const { password: _, ...userWithoutPassword } = updatedUser
    return userWithoutPassword
  }
}

export const authService = new AuthService()
