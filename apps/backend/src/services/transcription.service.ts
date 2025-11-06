import OpenAI from 'openai'
import { prisma } from '@/config/prisma'
import { env } from '@/config/env'
import { TranscriptionStatus, PlanType } from '@prisma/client'
import { logger } from '@/utils/logger'
import type { Transcription } from '@prisma/client'

export interface CreateTranscriptionData {
  buffer: Buffer
  fileName: string
  mimeType: string
}

// Plan limits for transcriptions
const TRANSCRIPTION_LIMITS = {
  FREE: 0, // Feature not available for FREE plan
  STARTER: 5, // 5 transcriptions per month
  PRO: Infinity, // Unlimited for PRO
} as const

export class TranscriptionService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: 60000, // 60 second timeout for audio transcription
      maxRetries: 2,
    })
  }

  /**
   * Create a new transcription request
   * Checks plan limits before creating
   */
  async createTranscription(userId: string, data: CreateTranscriptionData): Promise<Transcription> {
    // Get user plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if feature is available for user's plan
    if (user.planType === PlanType.FREE) {
      throw new Error('Transcription feature is only available for STARTER and PRO plans')
    }

    // Check transcription limit
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const transcriptionCount = await prisma.transcription.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    const limit = TRANSCRIPTION_LIMITS[user.planType]
    if (transcriptionCount >= limit) {
      throw new Error(
        `Transcription limit reached. Your plan allows ${limit} transcriptions per month.`
      )
    }

    // Validate file size (max 25MB as per OpenAI Whisper API limit)
    const maxSize = 25 * 1024 * 1024 // 25 MB
    if (data.buffer.length > maxSize) {
      throw new Error(`File too large. Maximum size is 25MB.`)
    }

    // Create transcription record
    const transcription = await prisma.transcription.create({
      data: {
        userId,
        fileName: data.fileName,
        mimeType: data.mimeType,
        fileSize: data.buffer.length,
        status: TranscriptionStatus.PENDING,
      },
    })

    logger.info(`Transcription created: ${transcription.id} for user ${userId}`)

    return transcription
  }

  /**
   * Process a transcription using OpenAI Whisper API
   * Creates a note from the transcribed text
   */
  async processTranscription(transcriptionId: string, audioBuffer: Buffer): Promise<Transcription> {
    // Get transcription
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptionId },
    })

    if (!transcription) {
      throw new Error('Transcription not found')
    }

    try {
      // Update status to PROCESSING
      await prisma.transcription.update({
        where: { id: transcriptionId },
        data: { status: TranscriptionStatus.PROCESSING },
      })

      logger.info(`Processing transcription ${transcriptionId}`)

      // Convert Buffer to Uint8Array which is compatible with Blob
      const uint8Array = new Uint8Array(audioBuffer)

      // Create a Blob from Uint8Array
      const blob = new Blob([uint8Array], { type: transcription.mimeType })

      // Create a File-like object that OpenAI accepts
      const file = Object.assign(blob, {
        name: transcription.fileName,
        lastModified: Date.now(),
      }) as File

      // Call OpenAI Whisper API
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'fr', // Can be made dynamic based on user preference
        response_format: 'text',
      })

      const transcribedText =
        typeof response === 'string' ? response : (response as { text?: string }).text || ''

      logger.info(`Transcription ${transcriptionId} completed successfully`)

      // Create note from transcription
      const note = await prisma.note.create({
        data: {
          userId: transcription.userId,
          title: `Audio Transcription - ${transcription.fileName}`,
          content: transcribedText,
          tags: ['transcription'],
        },
      })

      // Update transcription with result
      const updatedTranscription = await prisma.transcription.update({
        where: { id: transcriptionId },
        data: {
          status: TranscriptionStatus.COMPLETED,
          text: transcribedText,
          noteId: note.id,
        },
      })

      return updatedTranscription
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Transcription ${transcriptionId} failed: ${errorMessage}`)

      // Update transcription with error
      const failedTranscription = await prisma.transcription.update({
        where: { id: transcriptionId },
        data: {
          status: TranscriptionStatus.FAILED,
          errorMsg: errorMessage,
        },
      })

      return failedTranscription
    }
  }

  /**
   * Get all transcriptions for a user
   */
  async getUserTranscriptions(userId: string): Promise<Transcription[]> {
    return prisma.transcription.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * Get a single transcription by ID
   * Verifies ownership
   */
  async getTranscription(transcriptionId: string, userId: string): Promise<Transcription> {
    const transcription = await prisma.transcription.findFirst({
      where: {
        id: transcriptionId,
        userId,
      },
    })

    if (!transcription) {
      throw new Error('Transcription not found')
    }

    return transcription
  }

  /**
   * Delete a transcription
   */
  async deleteTranscription(transcriptionId: string, userId: string): Promise<void> {
    const transcription = await prisma.transcription.findFirst({
      where: {
        id: transcriptionId,
        userId,
      },
    })

    if (!transcription) {
      throw new Error('Transcription not found')
    }

    await prisma.transcription.delete({
      where: { id: transcriptionId },
    })

    logger.info(`Transcription ${transcriptionId} deleted by user ${userId}`)
  }

  /**
   * Get transcription usage for current month
   */
  async getMonthlyUsage(userId: string): Promise<{
    count: number
    limit: number
    remaining: number
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const count = await prisma.transcription.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    const rawLimit = TRANSCRIPTION_LIMITS[user.planType]
    // Convert Infinity to -1 for JSON serialization (PRO plan = unlimited)
    const limit = rawLimit === Infinity ? -1 : rawLimit
    const remaining = rawLimit === Infinity ? -1 : Math.max(0, rawLimit - count)

    return {
      count,
      limit,
      remaining,
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService()
