import { logger } from '@/utils/logger'
import { AIService } from '@/services/ai.service'
import { CacheService } from '@/services/cache.service'
import { prisma as defaultPrisma } from '@/config/prisma'
import type { PrismaClient } from '@prisma/client'
import type { SummaryJob } from './summary.queue'
import { getSummaryUsageCacheKey } from '@/utils/cache-key-helpers'
import { WorkerRateLimiter } from '@/utils/worker-rate-limiter'
import { validateUrlForFetch } from '@/utils/url-validator'
import { sanitizeText } from '@/utils/sanitize'

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
 * SECURITY: Validates URL to prevent SSRF attacks
 */
async function fetchURLContent(url: string): Promise<string> {
  const axios = (await import('axios')).default
  const cheerio = await import('cheerio')
  try {
    // SECURITY: Validate URL before fetching to prevent SSRF
    validateUrlForFetch(url)

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'NoteFlow/1.0',
      },
      maxRedirects: 0, // SECURITY: Prevent redirect-based SSRF
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
    throw new Error(
      `Failed to fetch URL content: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
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
  const { userId, text, style, language, customPrompt } = data

  const aiService = new AIService()

  logger.info(
    `Generating ${style} summary for user ${userId}${customPrompt ? ' (with custom template)' : ''}`
  )

  // Check rate limit for OpenAI API calls
  const allowed = await WorkerRateLimiter.checkRateLimit('openai', userId)
  if (!allowed) {
    throw new Error('OpenAI rate limit exceeded. Please try again in a few minutes.')
  }

  // Check if text is a URL and fetch content if needed
  let contentToSummarize = text
  const isUrl = isURL(text)

  if (isUrl) {
    logger.info(`Fetching content from URL: ${text}`)
    contentToSummarize = await fetchURLContent(text)
  }

  // SECURITY: Sanitize text to prevent XSS attacks
  // Remove all HTML tags and potentially malicious content
  contentToSummarize = sanitizeText(contentToSummarize)

  // Generate summary with AI (rate limited)
  // If custom prompt is provided, use it; otherwise use the default style
  const summaryText = customPrompt
    ? await aiService.generateSummaryWithCustomPrompt(contentToSummarize, customPrompt, language)
    : await aiService.generateSummary(contentToSummarize, style, language)

  // Generate title from the original content
  logger.info(`Generating title for summary`)
  const title = await aiService.generateTitle(contentToSummarize, language)

  // Save to database
  const summary = await prisma.summary.create({
    data: {
      userId,
      title,
      originalText: contentToSummarize, // Store the full content, not the URL
      summaryText,
      style,
      language,
      source: isUrl ? text : null, // Store the URL separately if it was a URL
    },
  })

  // SECURITY: Invalidate cache after summary creation
  // This ensures plan limit enforcement stays accurate
  // Use the summary's creation date to ensure consistency at month boundaries
  const cacheKey = getSummaryUsageCacheKey(userId, summary.createdAt)
  await CacheService.delete(cacheKey)

  logger.info(`✅ Summary generated and saved for user ${userId} with ID ${summary.id}`)

  // Return the summary ID so it can be used by the status endpoint
  return { summaryId: summary.id }
}
