/**
 * List of disposable/temporary email domains to block
 *
 * These are commonly used for spam, fake accounts, and abuse.
 * Updated periodically based on https://github.com/disposable-email-domains/disposable-email-domains
 *
 * @security Prevents abuse from temporary email services
 */
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Popular temporary email services
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailinator.com',
  'maildrop.cc',
  'temp-mail.org',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'getnada.com',
  'tempmail.net',
  'trashmail.com',
  'dispostable.com',
  'fakeinbox.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'trashmail.de',
  'trashmail.me',
  'trashmail.net',
  'wegwerfmail.de',
  'emailondeck.com',
  'mintemail.com',
  'mytemp.email',
  'getairmail.com',
  'harakirimail.com',
  'spamgourmet.com',
  'mailnesia.com',
  'mailcatch.com',
  'fakemailgenerator.com',
  'throwawaymail.com',
  'burnermail.io',
  'mohmal.com',
  'meltmail.com',
  'tempinbox.com',
  'moakt.com',
  'teml.net',
  'anonbox.net',
  'anonymbox.com',
  'binkmail.com',
  'bobmail.info',
  'jetable.org',
  'mycleaninbox.net',
  'no-spam.ws',
  'nospam.ze.tc',
  'spambox.us',
  'spamfree24.org',
  'superrito.com',
  'thankyou2010.com',
  'trbvm.com',
  'upliftnow.com',
  'viditag.com',
  'whyspam.me',
  'willselfdestruct.com',
  'zoemail.org',

  // Add more as needed
  // Reference: https://github.com/disposable-email-domains/disposable-email-domains/blob/master/disposable_email_blocklist.conf
])

/**
 * Check if an email domain is disposable
 * @param email - Email address to check
 * @returns true if domain is disposable, false otherwise
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1]
  if (!domain) return false // Invalid email format
  return DISPOSABLE_EMAIL_DOMAINS.has(domain)
}
