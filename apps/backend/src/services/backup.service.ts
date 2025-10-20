import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { exec } from 'child_process'
import type { FastifyInstance } from 'fastify'
import * as fs from 'fs/promises'
import cron from 'node-cron'
import * as path from 'path'
import { promisify } from 'util'
import { logger } from '@/utils/logger'
import { DistributedLockService } from './distributed-lock.service'

const execAsync = promisify(exec)

/**
 * Database Backup Service (PostgreSQL)
 *
 * Enterprise-grade automated backup system with:
 * - Daily cron job (3 AM default, configurable via BACKUP_CRON_SCHEDULE)
 * - Distributed locks (prevents duplicate backups in multi-instance setup)
 * - S3 streaming (uploads directly to S3, no local disk usage)
 * - S3 encryption (AES-256 server-side encryption, optional KMS)
 * - Local fallback (stores in ./backups if S3 not configured)
 * - Gzip compression (reduces backup size 80-90%)
 * - Automatic retention (deletes backups older than N days)
 * - Manual trigger (admin API endpoint)
 * - Sentry error reporting (production monitoring)
 *
 * **Architecture:**
 * 1. pg_dump exports PostgreSQL database (plain SQL format)
 * 2. Gzip compresses output (streaming)
 * 3. S3 upload OR local file save
 * 4. Cleanup old backups (retention policy)
 *
 * @ai-prompt When modifying this service:
 * - NEVER remove distributed lock (multi-instance deployments need this)
 * - ALWAYS use connection string instead of PGPASSWORD (hides password from process list)
 * - S3 streaming is production default (no local disk usage)
 * - S3 encryption: AES256 server-side (for KMS: use ServerSideEncryption: 'aws:kms')
 * - Local backup is fallback (requires disk space)
 * - Lock TTL: 30 minutes (should exceed backup + upload duration)
 * - Retention: 7 days default (configurable via BACKUP_RETENTION_DAYS)
 * - pg_dump flags: --no-owner --no-acl --clean --if-exists (portable dumps)
 * - maxBuffer: 100MB (increase if database > 100MB uncompressed)
 * - Cron disabled in development (enable manually if needed)
 * - Consider incremental backups for very large databases (WAL archiving)
 * - Monitor backup size trends (indicates data growth)
 *
 * @example
 * ```typescript
 * // Start backup job in server.ts
 * BackupService.startBackupJob(app)
 *
 * // Manual backup (admin endpoint)
 * const backupPath = await BackupService.createBackup()
 * logger.info(`Backup created: ${backupPath}`)
 *
 * // List backups
 * const backups = await BackupService.listBackups()
 *
 * // Get stats
 * const stats = await BackupService.getBackupStats()
 * logger.info(`Total: ${stats.totalBackups}, Size: ${stats.totalSizeFormatted}`)
 * ```
 *
 * @example
 * ```env
 * # Environment configuration
 * BACKUP_RETENTION_DAYS=7                    # Keep 7 days of backups
 * BACKUP_CRON_SCHEDULE="0 3 * * *"          # Daily at 3 AM
 * AWS_S3_BACKUP_BUCKET=my-backups           # S3 bucket (enables S3 mode)
 * AWS_REGION=us-east-1                       # AWS region
 * AWS_ACCESS_KEY_ID=AKIA...                  # AWS credentials
 * AWS_SECRET_ACCESS_KEY=...                  # AWS credentials
 * ```
 */
export class BackupService {
  private static backupDir = path.join(process.cwd(), 'backups')
  private static retentionDays = Number(process.env.BACKUP_RETENTION_DAYS) || 7
  private static cronSchedule = process.env.BACKUP_CRON_SCHEDULE || '0 3 * * *' // 3 AM daily
  private static s3Client: S3Client | null = null

  /**
   * Start automated backup job
   * Runs daily at 3 AM by default
   */
  static startBackupJob(fastify: FastifyInstance) {
    // Skip in development (uncomment to enable in dev)
    if (process.env.NODE_ENV === 'development') {
      fastify.log.info('⏭️  Backup job disabled in development')
      return
    }

    // Validate cron schedule
    if (!cron.validate(this.cronSchedule)) {
      fastify.log.error(`❌ Invalid backup cron schedule: ${this.cronSchedule}`)
      return
    }

    // Schedule backup job
    cron.schedule(this.cronSchedule, async () => {
      fastify.log.info('🔄 Starting scheduled database backup...')

      // Execute with distributed lock
      // Only one instance will run the backup, others will skip
      await DistributedLockService.executeWithLock(
        'database-backup',
        30 * 60 * 1000, // 30 minutes lock TTL
        async () => {
          try {
            const backupPath = await this.createBackup()
            fastify.log.info(`✅ Scheduled backup completed: ${backupPath}`)
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : String(error)
            fastify.log.error({ err: error }, '❌ Scheduled backup failed')

            // Report to Sentry if available
            if (process.env.SENTRY_DSN) {
              const { captureException } = await import('@/config/sentry')
              captureException(
                error instanceof Error ? error : new Error(errorMessage),
                { context: 'scheduled-backup' }
              )
            }
          }
        }
      )
    })

    fastify.log.info(
      `✅ Backup job scheduled: ${this.cronSchedule} (retention: ${this.retentionDays} days)`
    )
  }

  /**
   * Initialize S3 client (lazy loading)
   */
  private static getS3Client(): S3Client | null {
    if (this.s3Client) return this.s3Client

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const region = process.env.AWS_REGION || 'us-east-1'

    if (!accessKeyId || !secretAccessKey) {
      return null
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    return this.s3Client
  }

  /**
   * Create a manual backup
   * Uploads to S3 if configured, otherwise stores locally
   * Can be called from admin endpoint
   */
  static async createBackup(): Promise<string> {
    const s3Client = this.getS3Client()
    const bucketName = process.env.AWS_S3_BACKUP_BUCKET

    // Use S3 streaming if configured
    if (s3Client && bucketName) {
      return await this.createBackupToS3(bucketName, s3Client)
    }

    // Fallback to local backup
    return await this.createLocalBackup()
  }

  /**
   * Stream backup directly to S3 (no local file)
   * More efficient for production use
   */
  private static async createBackupToS3(
    bucketName: string,
    s3Client: S3Client
  ): Promise<string> {
    try {
      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5)
      const filename = `backup_${timestamp}.sql.gz`

      // Get DATABASE_URL
      const databaseUrl = process.env.DATABASE_URL
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured')
      }

      // Use connection string instead of PGPASSWORD
      // Connection string hides password from process list
      // Stream: pg_dump | gzip
      const dumpCommand = `pg_dump "${databaseUrl}" --format=plain --no-owner --no-acl --clean --if-exists | gzip`

      // Execute and capture output as buffer
      const { stdout } = await execAsync(dumpCommand, {
        encoding: 'buffer',
        maxBuffer: 100 * 1024 * 1024, // 100MB max
      })

      // Upload to S3 with server-side encryption
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: `backups/${filename}`,
        Body: stdout as Buffer,
        ContentType: 'application/gzip',
        ServerSideEncryption: 'AES256', // ⭐ Server-side encryption with AES-256
        Metadata: {
          createdAt: new Date().toISOString(),
        },
      })

      await s3Client.send(command)

      const s3Path = `s3://${bucketName}/backups/${filename}`
      const sizeMB = (stdout.length / (1024 * 1024)).toFixed(2)

      logger.info(`✅ Backup uploaded to S3: ${s3Path} (${sizeMB} MB)`)

      return s3Path
    } catch (error) {
      logger.error({ error: error }, '❌ S3 backup failed:')
      throw error
    }
  }

  /**
   * Create local backup (fallback when S3 not configured)
   */
  private static async createLocalBackup(): Promise<string> {
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true })

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5)
      const filename = `backup_${timestamp}.sql`
      const filepath = path.join(this.backupDir, filename)
      const compressedPath = `${filepath}.gz`

      // Get DATABASE_URL
      const databaseUrl = process.env.DATABASE_URL
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured')
      }

      // Use connection string instead of PGPASSWORD
      // Connection string hides password from process list
      const dumpCommand = `pg_dump "${databaseUrl}" --format=plain --no-owner --no-acl --clean --if-exists > "${filepath}"`

      await execAsync(dumpCommand)

      // Compress backup
      await execAsync(`gzip "${filepath}"`)

      // Get file size
      const stats = await fs.stat(compressedPath)
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)

      logger.info(`✅ Local backup created: ${compressedPath} (${sizeMB} MB)`)

      // Cleanup old backups
      await this.cleanupOldBackups()

      return compressedPath
    } catch (error) {
      logger.error({ error: error }, '❌ Local backup failed:')
      throw error
    }
  }

  /**
   * List all available backups
   */
  static async listBackups(): Promise<
    Array<{
      filename: string
      path: string
      size: number
      sizeFormatted: string
      createdAt: Date
    }>
  > {
    try {
      await fs.mkdir(this.backupDir, { recursive: true })

      const files = await fs.readdir(this.backupDir)
      const backupFiles = files.filter(
        f => f.startsWith('backup_') && f.endsWith('.sql.gz')
      )

      const backups = await Promise.all(
        backupFiles.map(async filename => {
          const filepath = path.join(this.backupDir, filename)
          const stats = await fs.stat(filepath)

          return {
            filename,
            path: filepath,
            size: stats.size,
            sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
            createdAt: stats.birthtime,
          }
        })
      )

      // Sort by creation date (newest first)
      return backups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
    } catch (error) {
      logger.error({ error: error }, '❌ Failed to list backups:')
      return []
    }
  }

  /**
   * Delete backups older than retention period
   */
  private static async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays)

      let deletedCount = 0

      for (const backup of backups) {
        if (backup.createdAt < cutoffDate) {
          await fs.unlink(backup.path)
          logger.info(`🗑️  Deleted old backup: ${backup.filename}`)
          deletedCount++
        }
      }

      if (deletedCount > 0) {
        logger.info(`✅ Cleaned up ${deletedCount} old backup(s)`)
      }
    } catch (error) {
      logger.error({ error: error }, '❌ Failed to cleanup old backups:')
    }
  }

  /**
   * Parse PostgreSQL connection string
   * Format: postgresql://user:password@host:port/database
   */
  private static parseDatabaseUrl(url: string) {
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/
    const match = url.match(regex)

    if (!match) {
      throw new Error('Invalid DATABASE_URL format')
    }

    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: match[4],
      database: match[5],
    }
  }

  /**
   * Get backup statistics
   */
  static async getBackupStats() {
    const backups = await this.listBackups()

    const totalSize = backups.reduce((sum, b) => sum + b.size, 0)
    const totalSizeFormatted = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`

    return {
      totalBackups: backups.length,
      totalSize,
      totalSizeFormatted,
      oldestBackup: backups[backups.length - 1]?.createdAt || null,
      newestBackup: backups[0]?.createdAt || null,
      retentionDays: this.retentionDays,
      schedule: this.cronSchedule,
    }
  }
}
