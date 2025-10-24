import { AIService } from '../../../services/ai.service'
import { SummaryStyle } from '@prisma/client'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn(),
          },
        },
      }
    }),
  }
})

// Mock unpdf
jest.mock('unpdf', () => {
  return {
    extractText: jest.fn(),
  }
})

const { extractText: mockExtractText } = jest.requireMock('unpdf') as { extractText: jest.Mock }

describe('AIService', () => {
  let aiService: AIService
  let mockOpenAI: {
    chat: {
      completions: {
        create: jest.Mock
      }
    }
  }

  beforeEach(() => {
    aiService = new AIService()
    // Get the mocked OpenAI instance
    mockOpenAI = (aiService as unknown as { openai: typeof mockOpenAI }).openai
    jest.clearAllMocks()
  })

  describe('generateSummary', () => {
    it('should generate SHORT summary in French', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Ceci est un résumé court du texte.',
            },
          },
        ],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await aiService.generateSummary(
        'Long text to summarize...',
        SummaryStyle.SHORT,
        'fr'
      )

      expect(result).toBe('Ceci est un résumé court du texte.')
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Résume'),
            }),
            expect.objectContaining({
              role: 'user',
              content: 'Long text to summarize...',
            }),
          ]),
        })
      )
    })

    it('should generate TWEET summary in English', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a tweet-length summary of the text.',
            },
          },
        ],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await aiService.generateSummary(
        'Long text to summarize...',
        SummaryStyle.TWEET,
        'en'
      )

      expect(result).toBe('This is a tweet-length summary of the text.')
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('280'),
            }),
          ]),
        })
      )
    })

    it('should generate THREAD summary', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content:
                '1/5 Premier tweet\n2/5 Deuxième tweet\n3/5 Troisième tweet',
            },
          },
        ],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await aiService.generateSummary(
        'Long text...',
        SummaryStyle.THREAD,
        'fr'
      )

      expect(result).toContain('1/')
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled()
    })

    it('should generate BULLET_POINT summary', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '• Point 1\n• Point 2\n• Point 3',
            },
          },
        ],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await aiService.generateSummary(
        'Long text...',
        SummaryStyle.BULLET_POINT,
        'fr'
      )

      expect(result).toContain('•')
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled()
    })

    it('should generate TOP3 summary', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '1. First point\n2. Second point\n3. Third point',
            },
          },
        ],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await aiService.generateSummary(
        'Long text...',
        SummaryStyle.TOP3,
        'en'
      )

      expect(result).toContain('1.')
      expect(result).toContain('2.')
      expect(result).toContain('3.')
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled()
    })

    it('should generate MAIN_POINTS summary', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Point principal 1: ...\nPoint principal 2: ...',
            },
          },
        ],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await aiService.generateSummary(
        'Long text...',
        SummaryStyle.MAIN_POINTS,
        'fr'
      )

      expect(result).toBeTruthy()
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled()
    })

    it('should throw error if OpenAI fails', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error')
      )

      await expect(
        aiService.generateSummary('Text', SummaryStyle.SHORT, 'fr')
      ).rejects.toThrow('OpenAI API error')
    })

    it('should handle empty response from OpenAI', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await aiService.generateSummary(
        'Text',
        SummaryStyle.SHORT,
        'fr'
      )

      expect(result).toBe('')
    })
  })

  describe('extractTextFromPDF', () => {
    it('should extract text from PDF buffer', async () => {
      const mockPDFData = {
        text: ['This is extracted text from PDF.', 'Second line of text.'],
      }

      mockExtractText.mockResolvedValue(mockPDFData)

      const pdfBuffer = Buffer.from('mock-pdf-content')
      const text = await aiService.extractTextFromPDF(pdfBuffer)

      expect(text).toBeDefined()
      expect(typeof text).toBe('string')
      expect(text).toBe('This is extracted text from PDF.\nSecond line of text.')
      expect(mockExtractText).toHaveBeenCalledWith(expect.any(Uint8Array))
    })

    it('should throw error for invalid PDF', async () => {
      mockExtractText.mockRejectedValue(new Error('Invalid PDF format'))

      const invalidBuffer = Buffer.from('not-a-pdf')

      await expect(aiService.extractTextFromPDF(invalidBuffer)).rejects.toThrow(
        'Failed to extract text from PDF'
      )
    })

    it('should handle empty PDF', async () => {
      const mockPDFData = {
        text: [],
      }

      mockExtractText.mockResolvedValue(mockPDFData)

      const pdfBuffer = Buffer.from('empty-pdf')
      const text = await aiService.extractTextFromPDF(pdfBuffer)

      expect(text).toBe('')
    })
  })
})
