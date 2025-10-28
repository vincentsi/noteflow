import { logger } from '@/utils/logger'
import { RSSService } from '@/services/rss.service'
import { prisma as defaultPrisma } from '@/config/prisma'
import type { PrismaClient } from '@prisma/client'

/**
 * Process RSS feeds and upsert articles
 * This function is exported separately for testing
 */
export async function processRSSFeeds(
  prisma: PrismaClient = defaultPrisma
): Promise<void> {
  const rssService = new RSSService()

  // Fetch all active RSS feeds
  const feeds = await prisma.rSSFeed.findMany({
    where: { active: true },
  })

  logger.info(`Found ${feeds.length} active RSS feeds`)

  let totalArticles = 0

  // Process each feed
  for (const feed of feeds) {
    try {
      logger.info(`Fetching feed: ${feed.name} (${feed.url})`)

      const articles = await rssService.parseFeed(feed.url)

      // Upsert articles into database
      for (const article of articles) {
        // Skip articles older than 90 days to prevent re-creating deleted old articles
        const articleAge = Date.now() - article.publishedAt.getTime()
        const maxAge = 90 * 24 * 60 * 60 * 1000 // 90 days in milliseconds

        if (articleAge > maxAge) {
          logger.debug(`Skipping old article: ${article.title} (published ${article.publishedAt})`)
          continue
        }

        await prisma.article.upsert({
          where: { url: article.url },
          update: {
            imageUrl: article.imageUrl, // Update imageUrl if article already exists
          },
          create: {
            title: article.title,
            url: article.url,
            excerpt: article.excerpt,
            imageUrl: article.imageUrl,
            source: article.source,
            tags: feed.tags, // Use feed tags
            publishedAt: article.publishedAt,
          },
        })
      }

      totalArticles += articles.length

      // Update lastFetchAt
      await prisma.rSSFeed.update({
        where: { id: feed.id },
        data: { lastFetchAt: new Date() },
      })

      logger.info(`✅ Fetched ${articles.length} articles from ${feed.name}`)
    } catch (error) {
      logger.error(
        { error, feedName: feed.name, feedUrl: feed.url },
        `Failed to fetch feed: ${feed.name}`
      )
      // Continue with next feed even if this one fails
    }
  }

  logger.info(`✅ RSS fetch completed: ${totalArticles} total articles processed`)
}
