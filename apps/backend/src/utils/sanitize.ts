import sanitizeHtmlLib from 'sanitize-html'

/**
 * XSS Sanitization Utility
 * Uses sanitize-html library to prevent XSS attacks (OWASP recommendation)
 *
 * SECURITY: Replaced custom regex-based sanitization with industry-standard sanitize-html
 * - Handles complex XSS vectors that regex cannot catch
 * - Actively maintained and audited by security community
 * - Configurable sanitization policies
 * - CommonJS compatible (works with Node.js require)
 *
 * @see https://github.com/apostrophecms/sanitize-html
 * @see https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/01-Testing_for_Reflected_Cross_Site_Scripting
 */

/**
 * Sanitize text content to prevent XSS attacks
 * Strips all HTML tags and returns plain text only
 *
 * @param text - Text to sanitize
 * @returns Sanitized plain text (no HTML tags)
 *
 * @example
 * sanitizeText('<script>alert("XSS")</script>Hello')  // Returns: 'Hello'
 * sanitizeText('Hello <b>World</b>')                  // Returns: 'Hello World'
 */
export function sanitizeText(text: string): string {
  // Use sanitize-html with allowedTags: [] to strip all HTML and return plain text
  const sanitized = sanitizeHtmlLib(text, {
    allowedTags: [], // No HTML tags allowed - plain text only
    allowedAttributes: {}, // No attributes allowed
  })

  return sanitized.trim()
}

/**
 * Sanitize HTML content while allowing safe HTML tags
 * Useful for rich text content where some HTML formatting is needed
 *
 * @param html - HTML to sanitize
 * @returns Sanitized HTML with only safe tags
 *
 * @example
 * sanitizeHtml('<p>Hello <script>alert("XSS")</script></p>')
 * // Returns: '<p>Hello </p>'
 */
export function sanitizeHtml(html: string): string {
  // Allow only safe formatting tags
  const sanitized = sanitizeHtmlLib(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
    ],
    allowedAttributes: {
      a: ['href', 'title'], // Only safe attributes for links
    },
    allowedSchemes: ['http', 'https', 'mailto'], // Only http/https/mailto URLs
  })

  return sanitized.trim()
}
