/**
 * URL Validation Utilities
 *
 * Provides secure URL validation to prevent open redirect vulnerabilities.
 */

/**
 * Validates if a URL is from Stripe's domain
 * @param url - The URL to validate
 * @returns true if the URL is from Stripe, false otherwise
 */
export function isStripeUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    // Allow checkout.stripe.com and billing.stripe.com
    return (
      parsedUrl.hostname === 'checkout.stripe.com' ||
      parsedUrl.hostname === 'billing.stripe.com'
    )
  } catch {
    return false
  }
}

/**
 * Validates if a URL is an internal route (relative or same origin)
 * @param url - The URL to validate
 * @returns true if the URL is internal, false otherwise
 */
export function isInternalUrl(url: string): boolean {
  // Allow relative URLs (start with /)
  if (url.startsWith('/')) {
    return true
  }

  try {
    const parsedUrl = new URL(url)
    const currentOrigin =
      typeof window !== 'undefined' ? window.location.origin : ''

    return parsedUrl.origin === currentOrigin
  } catch {
    return false
  }
}

/**
 * Safely redirects to a URL after validation
 * @param url - The URL to redirect to
 * @param allowedDomains - Additional allowed domains (e.g., ['example.com'])
 * @throws Error if URL is not valid or not allowed
 */
export function safeRedirect(
  url: string,
  allowedDomains: string[] = []
): void {
  // Allow internal URLs
  if (isInternalUrl(url)) {
    window.location.href = url
    return
  }

  // Allow Stripe URLs
  if (isStripeUrl(url)) {
    window.location.href = url
    return
  }

  // Check additional allowed domains
  if (allowedDomains.length > 0) {
    try {
      const parsedUrl = new URL(url)
      if (allowedDomains.includes(parsedUrl.hostname)) {
        window.location.href = url
        return
      }
    } catch {
      throw new Error('Invalid redirect URL')
    }
  }

  throw new Error(`Redirect to ${url} is not allowed`)
}
