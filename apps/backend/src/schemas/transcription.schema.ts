import { z } from 'zod'
import { idParamSchema } from './common.schema'

/**
 * Schema for transcription ID param
 */
export const transcriptionIdSchema = idParamSchema

/**
 * Schema for getting transcription usage
 */
export const getTranscriptionUsageSchema = z.object({})

/**
 * Allowed audio MIME types for transcription
 */
export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg', // .mp3
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4', // .m4a
  'audio/x-m4a',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
] as const

/**
 * Max file size: 25 MB (OpenAI Whisper API limit)
 */
export const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024

/**
 * Validate audio file upload
 * This is used in the controller after multipart parsing
 */
export function validateAudioFile(file: { mimetype: string; size: number; filename: string }): {
  valid: boolean
  error?: string
} {
  // Check MIME type
  if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype as any)) {
    return {
      valid: false,
      error: `Invalid audio format. Allowed types: ${ALLOWED_AUDIO_TYPES.join(', ')}`,
    }
  }

  // Check file size
  if (file.size > MAX_AUDIO_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is 25 MB.`,
    }
  }

  // Check filename
  if (!file.filename || file.filename.length > 255) {
    return {
      valid: false,
      error: 'Invalid filename',
    }
  }

  return { valid: true }
}

// TypeScript types
export type TranscriptionIdDTO = z.infer<typeof transcriptionIdSchema>
export type GetTranscriptionUsageDTO = z.infer<typeof getTranscriptionUsageSchema>
