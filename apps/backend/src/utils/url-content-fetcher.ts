import { validateUrlForFetch } from './url-validator'

/**
 * Check if text is a URL
 */
export function isURL(text: string): boolean {
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
 * Returns first 3000 characters for preview
 */
export async function fetchURLContentPreview(
  url: string
): Promise<{ content: string; title: string }> {
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

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled'

    // Remove script and style tags
    $('script').remove()
    $('style').remove()
    $('nav').remove()
    $('header').remove()
    $('footer').remove()

    // Try to get main content
    const article = $('article').text() || $('main').text() || $('body').text()

    // Clean up whitespace
    const fullContent = article.replace(/\s+/g, ' ').trim()

    // Return first 3000 characters for preview
    const content = fullContent.length > 3000 ? fullContent.substring(0, 3000) + '...' : fullContent

    return { content, title }
  } catch (error) {
    throw new Error(
      `Failed to fetch URL content: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
