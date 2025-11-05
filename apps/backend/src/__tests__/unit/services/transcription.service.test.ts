import { prismaMock } from '../../helpers/test-db'
import { TranscriptionService } from '../../../services/transcription.service'
import { Transcription, TranscriptionStatus, PlanType } from '@prisma/client'
import OpenAI from 'openai'

// Mock OpenAI with proper Jest mock structure
jest.mock('openai', () => {
  const mockCreate = jest.fn()
  return jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: mockCreate,
      },
    },
  }))
})

// Get reference to the mocked create function
let mockCreate: jest.Mock

describe('TranscriptionService', () => {
  let transcriptionService: TranscriptionService

  beforeEach(() => {
    transcriptionService = new TranscriptionService()
    // Get the mock create function from the OpenAI instance
    const openAIInstance = (OpenAI as unknown as jest.Mock).mock.results[0].value
    mockCreate = openAIInstance.audio.transcriptions.create
    jest.clearAllMocks()
  })

  describe('createTranscription', () => {
    it('should reject FREE plan (feature not available)', async () => {
      const audioBuffer = Buffer.from('fake-audio-data')

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.FREE,
        language: 'fr',
        stripeCustomerId: null,
        subscriptionStatus: 'NONE',
        subscriptionId: null,
        currentPeriodEnd: null,
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(
        transcriptionService.createTranscription('user-123', {
          buffer: audioBuffer,
          fileName: 'test.mp3',
          mimeType: 'audio/mp3',
        })
      ).rejects.toThrow('Transcription feature is only available for STARTER and PRO plans')
    })

    it('should allow STARTER plan user under limit', async () => {
      const audioBuffer = Buffer.from('fake-audio-data')

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.STARTER,
        language: 'fr',
        stripeCustomerId: 'cus_123',
        subscriptionStatus: 'ACTIVE',
        subscriptionId: 'sub_123',
        currentPeriodEnd: new Date(),
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.transcription.count.mockResolvedValue(3) // Under STARTER limit (5)

      const mockTranscription: Transcription = {
        id: 'trans-1',
        userId: 'user-123',
        noteId: null,
        fileName: 'test.mp3',
        mimeType: 'audio/mp3',
        fileSize: audioBuffer.length,
        duration: null,
        status: TranscriptionStatus.PENDING,
        text: null,
        errorMsg: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transcription.create.mockResolvedValue(mockTranscription)

      const result = await transcriptionService.createTranscription('user-123', {
        buffer: audioBuffer,
        fileName: 'test.mp3',
        mimeType: 'audio/mp3',
      })

      expect(result.status).toBe(TranscriptionStatus.PENDING)
    })
  })

  describe('processTranscription', () => {
    it('should transcribe audio and create note', async () => {
      const mockTranscription: Transcription = {
        id: 'trans-1',
        userId: 'user-123',
        noteId: null,
        fileName: 'test.mp3',
        mimeType: 'audio/mp3',
        fileSize: 1024,
        duration: 60,
        status: TranscriptionStatus.PENDING,
        text: null,
        errorMsg: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const transcribedText = 'This is the transcribed text from audio.'

      prismaMock.transcription.findUnique.mockResolvedValue(mockTranscription)

      // Mock OpenAI Whisper API response
      mockCreate.mockResolvedValue(transcribedText)

      prismaMock.transcription.update.mockResolvedValue({
        ...mockTranscription,
        status: TranscriptionStatus.COMPLETED,
        text: transcribedText,
      })

      prismaMock.note.create.mockResolvedValue({
        id: 'note-1',
        userId: 'user-123',
        title: 'Audio Transcription - test.mp3',
        content: transcribedText,
        tags: ['transcription'],
        pinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })

      const result = await transcriptionService.processTranscription(
        'trans-1',
        Buffer.from('audio')
      )

      expect(result.status).toBe(TranscriptionStatus.COMPLETED)
      expect(result.text).toBe(transcribedText)
      expect(prismaMock.note.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          title: expect.stringContaining('test.mp3'),
          content: transcribedText,
          tags: ['transcription'],
        }),
      })
    })

    it('should handle transcription failure', async () => {
      const mockTranscription: Transcription = {
        id: 'trans-1',
        userId: 'user-123',
        noteId: null,
        fileName: 'test.mp3',
        mimeType: 'audio/mp3',
        fileSize: 1024,
        duration: 60,
        status: TranscriptionStatus.PENDING,
        text: null,
        errorMsg: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.transcription.findUnique.mockResolvedValue(mockTranscription)

      // Mock OpenAI API error
      mockCreate.mockRejectedValue(new Error('OpenAI API error'))

      prismaMock.transcription.update.mockResolvedValue({
        ...mockTranscription,
        status: TranscriptionStatus.FAILED,
        errorMsg: 'OpenAI API error',
      })

      const result = await transcriptionService.processTranscription(
        'trans-1',
        Buffer.from('audio')
      )

      expect(result.status).toBe(TranscriptionStatus.FAILED)
      expect(result.errorMsg).toBe('OpenAI API error')
    })
  })

  describe('getUserTranscriptions', () => {
    it('should return user transcriptions', async () => {
      const mockTranscriptions: Transcription[] = [
        {
          id: 'trans-1',
          userId: 'user-123',
          noteId: 'note-1',
          fileName: 'audio1.mp3',
          mimeType: 'audio/mp3',
          fileSize: 1024,
          duration: 60,
          status: TranscriptionStatus.COMPLETED,
          text: 'Transcription 1',
          errorMsg: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'trans-2',
          userId: 'user-123',
          noteId: null,
          fileName: 'audio2.mp3',
          mimeType: 'audio/mp3',
          fileSize: 2048,
          duration: 120,
          status: TranscriptionStatus.PENDING,
          text: null,
          errorMsg: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      prismaMock.transcription.findMany.mockResolvedValue(mockTranscriptions)

      const result = await transcriptionService.getUserTranscriptions('user-123')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('trans-1')
      expect(prismaMock.transcription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })
  })
})
