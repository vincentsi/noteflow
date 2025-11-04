import { isIP } from 'net'

/**
 * URL Validator for SSRF Protection
 *
 * Prevents Server-Side Request Forgery (SSRF) attacks by validating URLs
 * before fetching them. Blocks access to:
 * - Internal IPs (localhost, 127.0.0.1, ::1)
 * - Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
 * - AWS metadata endpoint (169.254.169.254)
 * - Non-HTTP protocols (javascript:, file:, data:, etc.)
 * - Link-local addresses (169.254.0.0/16, fe80::/10)
 *
 * SECURITY: Critical for preventing attackers from accessing:
 * - Cloud metadata endpoints (AWS, GCP, Azure)
 * - Internal services (databases, admin panels, etc.)
 * - Local files
 * - Port scanning of internal network
 *
 * @example
 * ```typescript
 * // Valid URLs
 * validateUrlForFetch('https://example.com/page') // ✅ Pass
 * validateUrlForFetch('https://techcrunch.com/feed') // ✅ Pass
 *
 * // Invalid URLs (SSRF attempts)
 * validateUrlForFetch('http://localhost:3000/admin') // ❌ Throws
 * validateUrlForFetch('http://169.254.169.254/metadata') // ❌ Throws
 * validateUrlForFetch('http://10.0.0.1/admin') // ❌ Throws
 * validateUrlForFetch('javascript:alert(1)') // ❌ Throws
 * ```
 */

/**
 * Validates a URL is safe to fetch (SSRF protection)
 *
 * @param urlString - URL to validate
 * @throws Error if URL is unsafe
 */
export function validateUrlForFetch(urlString: string): void {
  let url: URL

  try {
    url = new URL(urlString)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Only allow HTTP/HTTPS protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid protocol. Only HTTP and HTTPS are allowed')
  }

  const hostname = url.hostname.toLowerCase()

  // Block localhost variants
  const localhostVariants = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '::']

  if (localhostVariants.includes(hostname)) {
    throw new Error('Cannot fetch from localhost')
  }

  // Block private IPv4 ranges
  const privateIPv4Ranges = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (link-local, AWS metadata)
  ]

  if (privateIPv4Ranges.some(range => range.test(hostname))) {
    throw new Error('Cannot fetch from private IP ranges')
  }

  // Block private IPv6 ranges
  if (
    hostname.startsWith('fd') || // Unique local addresses (fc00::/7)
    hostname.startsWith('fc') ||
    hostname.startsWith('fe80') || // Link-local addresses (fe80::/10)
    hostname.startsWith('::ffff:') // IPv4-mapped IPv6 addresses
  ) {
    throw new Error('Cannot fetch from private IPv6 ranges')
  }

  // Additional check for IP addresses
  // This catches edge cases like decimal notation (e.g., http://2130706433 = 127.0.0.1)
  const ipVersion = isIP(hostname)
  if (ipVersion !== 0) {
    // It's a valid IP - double-check it's not private
    const ip = hostname

    // Check for loopback
    if (ip.startsWith('127.') || ip === '::1') {
      throw new Error('Cannot fetch from loopback addresses')
    }

    // Check for private ranges (additional validation)
    if (
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
    ) {
      throw new Error('Cannot fetch from private IP ranges')
    }
  }

  // Block common internal hostnames
  const blockedHostnames = [
    'metadata.google.internal', // GCP metadata
    'metadata', // Generic metadata
    'internal',
  ]

  if (blockedHostnames.some(blocked => hostname.includes(blocked))) {
    throw new Error('Cannot fetch from internal hostnames')
  }
}

/**
 * Fetches a URL with SSRF protection
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Response
 * @throws Error if URL validation fails or fetch fails
 *
 * @example
 * ```typescript
 * const html = await safeFetch('https://example.com')
 * const text = await html.text()
 * ```
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  // Validate URL before fetching
  validateUrlForFetch(url)

  // Fetch with security settings
  const response = await fetch(url, {
    ...options,
    redirect: 'manual', // Prevent redirect-based SSRF
    signal: options?.signal ?? AbortSignal.timeout(10000), // 10s timeout
  })

  // Block redirects (prevents redirect-based SSRF)
  if (response.status >= 300 && response.status < 400) {
    throw new Error('Redirects are not allowed for security reasons')
  }

  return response
}
