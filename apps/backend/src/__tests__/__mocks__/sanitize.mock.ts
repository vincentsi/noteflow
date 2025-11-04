// Mock for src/utils/sanitize.ts
// Used in tests to avoid ESM module issues with isomorphic-dompurify

export function sanitizeText(text: string): string {
  // Simple regex-based sanitization for tests
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

export function sanitizeHtml(html: string): string {
  // For tests, just strip all tags
  return sanitizeText(html)
}
