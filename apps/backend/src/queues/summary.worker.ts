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
): Promise<void> {
  const { userId, text, style, language } = data

  const aiService = new AIService()

  logger.info(`Generating ${style} summary for user ${userId}`)

  // Check if text is a URL and fetch content if needed
  let contentToSummarize = text
  if (isURL(text)) {
    logger.info(`Fetching content from URL: ${text}`)
    contentToSummarize = await fetchURLContent(text)
  }

  // Generate summary with AI
  const summaryText = await aiService.generateSummary(contentToSummarize, style, language)

  // Save to database
  await prisma.summary.create({
    data: {
      userId,
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

  logger.info(`✅ Summary generated and saved for user ${userId}`)
}
