import { prismaMock } from '../../helpers/test-db'
import { ArticleService } from '../../../services/article.service'
import { PlanType } from '@prisma/client'

describe('ArticleService', () => {
  let articleService: ArticleService

  beforeEach(() => {
    articleService = new ArticleService()
    jest.clearAllMocks()
  })

  describe('getUserSavedArticles', () => {
    it('should return user saved articles', async () => {
      const userId = 'user-123'
      const mockArticles = [
        {
          id: 'saved-1',
          userId,
          articleId: 'article-1',
          article: {
            id: 'article-1',
            title: 'Test Article',
            url: 'https://example.com',
            excerpt: 'Test excerpt',
            source: 'TechCrunch',
            tags: ['ai'],
            publishedAt: new Date(),
            createdAt: new Date(),
          },
          createdAt: new Date(),
        },
      ]

      prismaMock.savedArticle.findMany.mockResolvedValue(mockArticles)

      const result = await articleService.getUserSavedArticles(userId)

      expect(result).toHaveLength(1)
      expect(result[0].article.title).toBe('Test Article')
    })

    it('should apply source filter', async () => {
      const userId = 'user-123'
      prismaMock.savedArticle.findMany.mockResolvedValue([])

      await articleService.getUserSavedArticles(userId, {
        source: 'TechCrunch',
      })

      expect(prismaMock.savedArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            article: { source: 'TechCrunch' },
          }),
        })
      )
    })

    it('should apply pagination', async () => {
      const userId = 'user-123'
      prismaMock.savedArticle.findMany.mockResolvedValue([])

      await articleService.getUserSavedArticles(userId, {
        skip: 10,
        take: 5,
      })

      expect(prismaMock.savedArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        })
      )
    })
  })

  describe('saveArticle', () => {
    it('should save article for FREE user within limit', async () => {
      const userId = 'user-123'
      const articleId = 'article-1'

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
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

      prismaMock.savedArticle.count.mockResolvedValue(5) // Under limit (10)
      prismaMock.savedArticle.create.mockResolvedValue({
        id: 'saved-1',
        userId,
        articleId,
        createdAt: new Date(),
      })

      await articleService.saveArticle(userId, articleId)

      expect(prismaMock.savedArticle.create).toHaveBeenCalledWith({
        data: { userId, articleId },
      })
    })

    it('should throw error when FREE user reaches limit', async () => {
      const userId = 'user-123'
      const articleId = 'article-1'

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
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

      prismaMock.savedArticle.count.mockResolvedValue(10) // At limit

      await expect(
        articleService.saveArticle(userId, articleId)
      ).rejects.toThrow(
        'Article limit reached. Your FREE plan allows 10 saved articles.'
      )
    })

    it('should save article for PRO user without limit check', async () => {
      const userId = 'user-123'
      const articleId = 'article-1'

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'USER',
        emailVerified: true,
        planType: PlanType.PRO,
        language: 'fr',
        stripeCustomerId: null,
        subscriptionStatus: 'ACTIVE',
        subscriptionId: null,
        currentPeriodEnd: null,
        lastLoginAt: null,
        lastLoginIp: null,
        loginCount: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.savedArticle.create.mockResolvedValue({
        id: 'saved-1',
        userId,
        articleId,
        createdAt: new Date(),
      })

      await articleService.saveArticle(userId, articleId)

      expect(prismaMock.savedArticle.count).not.toHaveBeenCalled()
      expect(prismaMock.savedArticle.create).toHaveBeenCalled()
    })
  })

  describe('unsaveArticle', () => {
    it('should unsave article', async () => {
      const userId = 'user-123'
      const articleId = 'article-1'

      prismaMock.savedArticle.deleteMany.mockResolvedValue({ count: 1 })

      await articleService.unsaveArticle(userId, articleId)

      expect(prismaMock.savedArticle.deleteMany).toHaveBeenCalledWith({
        where: { userId, articleId },
      })
    })
  })

  describe('upsertArticle', () => {
    it('should create new article', async () => {
      const articleData = {
        title: 'Test Article',
        url: 'https://example.com/test',
        excerpt: 'Test excerpt',
        source: 'TechCrunch',
        tags: ['ai', 'tech'],
        publishedAt: new Date(),
      }

      prismaMock.article.upsert.mockResolvedValue({
        id: 'article-1',
        ...articleData,
        createdAt: new Date(),
      })

      const result = await articleService.upsertArticle(articleData)

      expect(result.id).toBe('article-1')
      expect(prismaMock.article.upsert).toHaveBeenCalledWith({
        where: { url: articleData.url },
        update: {},
        create: articleData,
      })
    })
  })
})
