import type { MultipartFile } from '@fastify/multipart'
import { pipeline } from 'node:stream/promises'
import { createWriteStream, createReadStream, unlinkSync } from 'node:fs'
import { unlink, mkdir } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { logger } from './logger'

/**
 * Streaming Upload Utility
 *
 * Handles large file uploads (PDFs, images) using Node.js streams
 * instead of loading entire file into memory.
 *
 * Benefits:
 * - Constant memory usage regardless of file size
 * - Can handle multi-GB files
 * - Better server resource management
 * - Prevents out-of-memory errors
 *
 * Trade-offs:
 * - Slightly more complex than toBuffer()
 * - Requires cleanup of temp files
 *
 * @example
 * ```typescript
 * // Before (loads entire file to memory):
 * const buffer = await file.toBuffer()
 * const text = await extractTextFromPDF(buffer)
 *
 * // After (streams to disk, processes in chunks):
 * const tempPath = await streamFileToDisk(file, 10 * 1024 * 1024) // 10MB limit
 * try {
 *   const text = await extractTextFromPDFFile(tempPath)
 *   return text
 * } finally {
 *   await cleanupTempFile(tempPath)
 * }
 * ```
 */

const UPLOAD_DIR = join(tmpdir(), 'noteflow-uploads')
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Track active temp files for cleanup on process exit
const activeTempFiles = new Set<string>()

// Register process exit handlers to cleanup temp files
// This prevents file leaks if Node.js crashes or is killed
let exitHandlersRegistered = false

function registerExitHandlers(): void {
  if (exitHandlersRegistered) return
  exitHandlersRegistered = true

  const cleanup = () => {
    // Synchronous cleanup on exit (async not possible here)
    for (const tempPath of activeTempFiles) {
      try {
        unlinkSync(tempPath)
      } catch {
        // File already deleted or doesn't exist - ignore
      }
    }
  }

  // Handle various exit scenarios
  process.on('exit', cleanup)
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
  process.on('uncaughtException', error => {
    logger.error({ error }, 'Uncaught exception - cleaning up temp files')
    cleanup()
    process.exit(1)
  })
}

// Register exit handlers on module load
registerExitHandlers()

/**
 * Validate PDF file security
 *
 * Validates:
 * 1. MIME type
 * 2. File extension
 * 3. PDF magic bytes (file signature)
 * 4. Filename sanitization
 *
 * @param file - Multipart file to validate
 * @param buffer - First few bytes of the file for magic byte validation
 * @throws Error if validation fails
 */
export function validatePDFFile(file: MultipartFile, buffer?: Buffer): void {
  // 1. Validate MIME type
  const allowedMimeTypes = ['application/pdf']
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only PDF files are allowed.')
  }

  // 2. Validate file extension
  const allowedExtensions = ['.pdf']
  const ext = extname(file.filename).toLowerCase()
  if (!allowedExtensions.includes(ext)) {
    throw new Error('Invalid file extension. Only .pdf files are allowed.')
  }

  // 3. Validate PDF magic bytes (file signature)
  // PDF files start with %PDF (hex: 25 50 44 46)
  if (buffer && buffer.length >= 4) {
    const magicBytes = buffer.toString('hex', 0, 4)
    if (!magicBytes.startsWith('25504446')) {
      throw new Error('Invalid PDF file signature. File may be corrupted or not a real PDF.')
    }
  }

  // 4. Sanitize filename (prevent path traversal)
  const sanitizedFilename = basename(file.filename)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255)

  if (!sanitizedFilename || sanitizedFilename === '') {
    throw new Error('Invalid filename')
  }
}

/**
 * Stream uploaded file to disk with size limit
 *
 * @param file - Multipart file from Fastify
 * @param maxSize - Maximum file size in bytes (default 10MB)
 * @returns Temporary file path
 * @throws Error if file exceeds max size
 */
export async function streamFileToDisk(
  file: MultipartFile,
  maxSize: number = DEFAULT_MAX_FILE_SIZE
): Promise<string> {
  // Validate file type and extension before processing
  validatePDFFile(file)

  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true })

  const tempFilename = `${randomUUID()}.pdf`
  const tempPath = join(UPLOAD_DIR, tempFilename)

  let bytesWritten = 0
  let firstChunk: Buffer | null = null

  // Create write stream
  const writeStream = createWriteStream(tempPath)

  // Track file size, enforce limit, and capture first chunk for magic byte validation
  file.file.on('data', (chunk: Buffer) => {
    bytesWritten += chunk.length

    // Capture first chunk for magic byte validation
    if (!firstChunk && chunk.length >= 4) {
      firstChunk = chunk
      // Validate PDF magic bytes from first chunk
      validatePDFFile(file, firstChunk)
    }

    if (bytesWritten > maxSize) {
      // Destroy streams and throw error
      file.file.destroy()
      writeStream.destroy()
      throw new Error(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`)
    }
  })

  try {
    // Stream file to disk
    await pipeline(file.file, writeStream)

    // Track file for cleanup on process exit
    activeTempFiles.add(tempPath)

    return tempPath
  } catch (error) {
    // Cleanup on error
    await cleanupTempFile(tempPath)
    throw error
  }
}

/**
 * Stream file from disk and return as buffer
 * Useful for processing files after they've been streamed to disk
 *
 * @param filePath - Path to temporary file
 * @returns File contents as Buffer
 */
export async function streamFileToBuffer(filePath: string): Promise<Buffer> {
  const chunks: Buffer[] = []
  const readStream = createReadStream(filePath)

  for await (const chunk of readStream) {
    chunks.push(chunk as Buffer)
  }

  return Buffer.concat(chunks)
}

/**
 * Delete temporary file
 *
 * @param filePath - Path to temporary file
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath)
    // Remove from active files tracking
    activeTempFiles.delete(filePath)
  } catch (error) {
    // Ignore errors (file may not exist)
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.error({ error, filePath }, 'Failed to cleanup temp file')
    }
  }
}

/**
 * Cleanup all temporary files older than specified age
 * Should be run periodically (e.g., via cron job)
 *
 * @param maxAgeMs - Maximum age in milliseconds (default 1 hour)
 */
export async function cleanupOldTempFiles(maxAgeMs: number = 60 * 60 * 1000): Promise<void> {
  try {
    const fs = await import('node:fs/promises')
    const files = await fs.readdir(UPLOAD_DIR)
    const now = Date.now()

    for (const file of files) {
      const filePath = join(UPLOAD_DIR, file)
      const stats = await fs.stat(filePath)

      if (now - stats.mtimeMs > maxAgeMs) {
        await cleanupTempFile(filePath)
      }
    }
  } catch (error) {
    // Directory may not exist yet
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.error({ error }, 'Failed to cleanup old temp files')
    }
  }
}

/**
 * Get file size limit based on user plan
 *
 * @param planType - User's plan type
 * @returns Maximum file size in bytes
 */
export function getFileSizeLimitForPlan(planType: 'FREE' | 'STARTER' | 'PRO'): number {
  const limits = {
    FREE: 5 * 1024 * 1024, // 5MB
    STARTER: 10 * 1024 * 1024, // 10MB
    PRO: 25 * 1024 * 1024, // 25MB
  }

  return limits[planType]
}
