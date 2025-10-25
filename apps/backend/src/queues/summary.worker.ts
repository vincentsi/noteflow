import { logger } from '@/utils/logger'
import { AIService } from '@/services/ai.service'
import { CacheService } from '@/services/cache.service'
import { prisma as defaultPrisma } from '@/config/prisma'
import type { PrismaClient } from '@prisma/client'
import type { SummaryJob } from './summary.queue'
import axios from 'axios'
import * as cheerio from 'cheerio'

/**
 * Check if text is a URL
 */
function isURL(text: string): boolean {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Extract Open Graph image from URL
 */
async function extractOGImage(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'NoteFlow/1.0',
      },
    })

    const $ = cheerio.load(response.data)

    // Try multiple meta tags for image
    const ogImage = $('meta[property="og:image"]').attr('content')
    const twitterImage = $('meta[name="twitter:image"]').attr('content')
    const firstImage = $('article img').first().attr('src')

    const imageUrl = ogImage || twitterImage || firstImage

    // Convert relative URLs to absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url)
      return new URL(imageUrl, baseUrl.origin).toString()
    }

    return imageUrl || null
  } catch (error) {
    logger.warn(`Failed to extract OG image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return null
  }
}

/**
 * Fetch and extract text content from URL
 */
async function fetchURLContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'NoteFlow/1.0',
      },
    })

    const $ = cheerio.load(response.data)

    // Remove script and style tags
    $('script').remove()
    $('style').remove()
    $('nav').remove()
    $('header').remove()
    $('footer').remove()

    // Try to get main content
    const article = $('article').text() || $('main').text() || $('body').text()

    // Clean up whitespace
    return article.replace(/\s+/g, ' ').trim()
  } catch (error) {
    throw new Error(`Failed to fetch URL content: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Process summary generation job
 * This function is exported separately for testing
 */
export async function processSummary(
  data: SummaryJob,
  prisma: PrismaClient = defaultPrisma
): Promise<{ summaryId: string }> {
  const { userId, text, style, language } = data

  const aiService = new AIService()

  logger.info(`Generating ${style} summary for user ${userId}`)

  // Check if text is a URL and fetch content if needed
  let contentToSummarize = text
  let coverImage: string | null = null
  const isUrl = isURL(text)

  if (isUrl) {
    logger.info(`Fetching content from URL: ${text}`)
    contentToSummarize = await fetchURLContent(text)

    // Extract image from the article
    logger.info(`Extracting cover image from URL`)
    coverImage = await extractOGImage(text)
  }

  // Generate summary with AI
  const summaryText = await aiService.generateSummary(contentToSummarize, style, language)

  // Generate title from the original content
  logger.info(`Generating title for summary`)
  const title = await aiService.generateTitle(contentToSummarize, language)

  // If no cover image from URL, generate one based on the title
  if (!coverImage) {
    logger.info(`Generating cover image for summary`)
    coverImage = await aiService.generateCoverImage(title)
  }

  // Save to database
  const summary = await prisma.summary.create({
    data: {
      userId,
      title,
      coverImage,
      originalText: text,
      summaryText,
      style,
      language,
    },
  })

  // Increment cache counter for monthly usage
  const now = new Date()
  const cacheKey = `summary-usage:${userId}:${now.getFullYear()}-${now.getMonth()}`
  await CacheService.increment(cacheKey)

  logger.info(`✅ Summary generated and saved for user ${userId} with ID ${summary.id}`)

  // Return the summary ID so it can be used by the status endpoint
  return { summaryId: summary.id }
}
