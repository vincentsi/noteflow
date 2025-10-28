import type { MultipartFile } from '@fastify/multipart'
import { pipeline } from 'node:stream/promises'
import { createWriteStream, createReadStream } from 'node:fs'
import { unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

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
  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true })

  const tempFilename = `${randomUUID()}.pdf`
  const tempPath = join(UPLOAD_DIR, tempFilename)

  let bytesWritten = 0

  // Create write stream
  const writeStream = createWriteStream(tempPath)

  // Track file size and enforce limit
  file.file.on('data', (chunk: Buffer) => {
    bytesWritten += chunk.length

    if (bytesWritten > maxSize) {
      // Destroy streams and throw error
      file.file.destroy()
      writeStream.destroy()
      throw new Error(
        `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`
      )
    }
  })

  try {
    // Stream file to disk
    await pipeline(file.file, writeStream)
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
  } catch (error) {
    // Ignore errors (file may not exist)
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Failed to cleanup temp file:', error)
    }
  }
}

/**
 * Cleanup all temporary files older than specified age
 * Should be run periodically (e.g., via cron job)
 *
 * @param maxAgeMs - Maximum age in milliseconds (default 1 hour)
 */
export async function cleanupOldTempFiles(
  maxAgeMs: number = 60 * 60 * 1000
): Promise<void> {
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
      console.error('Failed to cleanup old temp files:', error)
    }
  }
}

/**
 * Get file size limit based on user plan
 *
 * @param planType - User's plan type
 * @returns Maximum file size in bytes
 */
export function getFileSizeLimitForPlan(
  planType: 'FREE' | 'STARTER' | 'PRO'
): number {
  const limits = {
    FREE: 5 * 1024 * 1024, // 5MB
    STARTER: 10 * 1024 * 1024, // 10MB
    PRO: 25 * 1024 * 1024, // 25MB
  }

  return limits[planType]
}
