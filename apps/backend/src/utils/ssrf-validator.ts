const ALLOWED_PROTOCOLS = ['http:', 'https:']
const BLOCKED_IPS = [
  '127.0.0.1',
  'localhost',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata
  '::1',
  'fe80::',
]

export function validateUrlForSSRF(urlString: string): URL {
  let url: URL

  try {
    url = new URL(urlString)
  } catch {
    throw new Error('Invalid URL format')
  }

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new Error('Invalid protocol. Only HTTP/HTTPS allowed')
  }

  if (BLOCKED_IPS.some(ip => url.hostname.includes(ip))) {
    throw new Error('Access to internal resources is forbidden')
  }

  const hostname = url.hostname
  if (
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    throw new Error('Access to private networks is forbidden')
  }

  return url
}
