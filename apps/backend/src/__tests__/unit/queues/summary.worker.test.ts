import { processSummary } from '../../../queues/summary.worker'
import { AIService } from '../../../services/ai.service'
import { prismaMock } from '../../helpers/test-db'
import { SummaryStyle } from '@prisma/client'

jest.mock('../../../services/ai.service')

describe('Summary Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('processSummary', () => {
    it('should generate summary and save to DB', async () => {
      const jobData = {
        userId: 'user-123',
        text: 'Long article text to summarize...',
        style: SummaryStyle.SHORT,
        language: 'en' as const,
      }

      const mockAIService = {
        generateSummary: jest.fn().mockResolvedValue('This is a short summary.'),
        generateTitle: jest.fn().mockResolvedValue('Generated Title'),
      }

      ;(AIService as jest.MockedClass<typeof AIService>).mockImplementation(
        () => mockAIService as unknown as AIService
      )

      prismaMock.summary.create.mockResolvedValue({
        id: 'summary-1',
        userId: 'user-123',
        title: null,
        originalText: 'Long article text to summarize...',
        summaryText: 'This is a short summary.',
        style: SummaryStyle.SHORT,
        source: null,
        language: 'en',
        createdAt: new Date(),
      })

      await processSummary(jobData, prismaMock)

      expect(mockAIService.generateSummary).toHaveBeenCalledWith(
        'Long article text to summarize...',
        SummaryStyle.SHORT,
        'en'
      )

      expect(prismaMock.summary.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          title: 'Generated Title',
          originalText: 'Long article text to summarize...',
          summaryText: 'This is a short summary.',
          style: SummaryStyle.SHORT,
          language: 'en',
          source: null,
        },
      })
    })

    it('should handle TWEET style', async () => {
      const jobData = {
        userId: 'user-456',
        text: 'Article about AI...',
        style: SummaryStyle.TWEET,
        language: 'fr' as const,
      }

      const mockAIService = {
        generateSummary: jest.fn().mockResolvedValue('Résumé en tweet.'),
        generateTitle: jest.fn().mockResolvedValue('Generated Title'),
      }

      ;(AIService as jest.MockedClass<typeof AIService>).mockImplementation(
        () => mockAIService as unknown as AIService
      )

      prismaMock.summary.create.mockResolvedValue({
        id: 'summary-2',
        userId: 'user-456',
        title: null,
        originalText: 'Article about AI...',
        summaryText: 'Résumé en tweet.',
        style: SummaryStyle.TWEET,
        source: null,
        language: 'fr',
        createdAt: new Date(),
      })

      await processSummary(jobData, prismaMock)

      expect(mockAIService.generateSummary).toHaveBeenCalledWith(
        'Article about AI...',
        SummaryStyle.TWEET,
        'fr'
      )

      expect(prismaMock.summary.create).toHaveBeenCalled()
    })

    it('should throw error if AI generation fails', async () => {
      const jobData = {
        userId: 'user-789',
        text: 'Text',
        style: SummaryStyle.SHORT,
        language: 'en' as const,
      }

      const mockAIService = {
        generateSummary: jest.fn().mockRejectedValue(new Error('OpenAI API error')),
        generateTitle: jest.fn().mockResolvedValue('Generated Title'),
      }

      ;(AIService as jest.MockedClass<typeof AIService>).mockImplementation(
        () => mockAIService as unknown as AIService
      )

      await expect(processSummary(jobData, prismaMock)).rejects.toThrow('OpenAI API error')

      expect(prismaMock.summary.create).not.toHaveBeenCalled()
    })

    it('should throw error if DB save fails', async () => {
      const jobData = {
        userId: 'user-999',
        text: 'Text',
        style: SummaryStyle.SHORT,
        language: 'en' as const,
      }

      const mockAIService = {
        generateSummary: jest.fn().mockResolvedValue('Summary text.'),
        generateTitle: jest.fn().mockResolvedValue('Generated Title'),
      }

      ;(AIService as jest.MockedClass<typeof AIService>).mockImplementation(
        () => mockAIService as unknown as AIService
      )

      prismaMock.summary.create.mockRejectedValue(new Error('Database error'))

      await expect(processSummary(jobData, prismaMock)).rejects.toThrow('Database error')

      expect(mockAIService.generateSummary).toHaveBeenCalled()
    })

    it('should process all summary styles', async () => {
      const styles = [
        SummaryStyle.SHORT,
        SummaryStyle.TWEET,
        SummaryStyle.THREAD,
        SummaryStyle.BULLET_POINT,
        SummaryStyle.TOP3,
        SummaryStyle.MAIN_POINTS,
        SummaryStyle.EDUCATIONAL,
      ]

      for (const style of styles) {
        const jobData = {
          userId: 'user-multi',
          text: 'Test text',
          style,
          language: 'en' as const,
        }

        const mockAIService = {
          generateSummary: jest.fn().mockResolvedValue(`${style} summary`),
          generateTitle: jest.fn().mockResolvedValue('Generated Title'),
        }

        ;(AIService as jest.MockedClass<typeof AIService>).mockImplementation(
          () => mockAIService as unknown as AIService
        )

        prismaMock.summary.create.mockResolvedValue({
          id: `summary-${style}`,
          userId: 'user-multi',
          title: null,
          originalText: 'Test text',
          summaryText: `${style} summary`,
          style,
          source: null,
          language: 'en',
          createdAt: new Date(),
        })

        await processSummary(jobData, prismaMock)

        expect(mockAIService.generateSummary).toHaveBeenCalledWith('Test text', style, 'en')
      }
    })
  })
})
