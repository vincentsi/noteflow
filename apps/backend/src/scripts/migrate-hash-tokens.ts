#!/usr/bin/env tsx
/**
 * Token Hashing Migration Script
 *
 * This script migrates existing plain-text tokens to hashed versions.
 * Run ONCE after deploying the token hashing code changes.
 *
 * IMPORTANT:
 * - This will invalidate ALL existing tokens (users must re-login)
 * - Run during off-peak hours
 * - Backup database before running
 *
 * Usage:
 * ```bash
 * npx tsx src/scripts/migrate-hash-tokens.ts
 * ```
 */

import { logger } from '@/utils/logger'
import { prisma } from '../config/prisma'

async function migrateHashTokens() {
  logger.info('🔄 Starting token hashing migration...\n')

  try {
    // Strategy: DELETE all existing tokens instead of migrating them
    // Reason: We cannot hash existing tokens without knowing their plain-text values
    // Users will need to re-login (minor inconvenience for major security improvement)

    logger.info('⚠️  This will invalidate all existing tokens')
    logger.info('⚠️  Users will need to re-login, verify emails, and reset passwords again')
    logger.info('')

    // Count tokens before deletion
    const refreshTokenCount = await prisma.refreshToken.count()
    const verificationTokenCount = await prisma.verificationToken.count()
    const resetTokenCount = await prisma.passwordResetToken.count()
    const csrfTokenCount = await prisma.csrfToken.count()

    logger.info(`📊 Tokens to delete:`)
    logger.info(`   - Refresh tokens: ${refreshTokenCount}`)
    logger.info(`   - Verification tokens: ${verificationTokenCount}`)
    logger.info(`   - Password reset tokens: ${resetTokenCount}`)
    logger.info(`   - CSRF tokens: ${csrfTokenCount}`)
    logger.info('')

    // Delete all tokens
    logger.info('🗑️  Deleting all existing tokens...')

    await prisma.$transaction([
      prisma.refreshToken.deleteMany({}),
      prisma.verificationToken.deleteMany({}),
      prisma.passwordResetToken.deleteMany({}),
      prisma.csrfToken.deleteMany({}),
    ])

    logger.info('')
    logger.info('✅ Migration completed successfully!')
    logger.info('')
    logger.info('📝 Next steps:')
    logger.info('   1. All users must re-login')
    logger.info('   2. Users with unverified emails must verify again')
    logger.info('   3. Any pending password resets must be requested again')
    logger.info('')
    logger.info('🔒 Security improvement: All new tokens will be hashed with SHA-256')
  } catch (error) {
    logger.error({ error }, '❌ Migration failed')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateHashTokens()
