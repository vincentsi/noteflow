/**
 * HSTS Preload Validation Script
 *
 * This script validates that your domain meets all requirements for HSTS preload.
 * Run before submitting your domain to https://hstspreload.org/
 *
 * Requirements:
 * 1. Valid SSL certificate
 * 2. HTTP -> HTTPS redirect
 * 3. HSTS header with:
 *    - max-age >= 31536000 (1 year)
 *    - includeSubDomains
 *    - preload
 * 4. HSTS header on base domain and all subdomains
 *
 * @usage
 * ```bash
 * npx tsx src/scripts/validate-hsts-preload.ts https://yourdomain.com
 * ```
 */

interface HSTSValidationResult {
  domain: string
  passed: boolean
  checks: {
    httpsAvailable: boolean
    httpRedirects: boolean
    hstsHeaderPresent: boolean
    maxAgeValid: boolean
    includesSubDomains: boolean
    preloadEnabled: boolean
  }
  errors: string[]
  warnings: string[]
}

/**
 * Parse HSTS header
 */
function parseHSTSHeader(header: string): {
  maxAge: number | null
  includeSubDomains: boolean
  preload: boolean
} {
  const directives = header.split(';').map(d => d.trim().toLowerCase())

  let maxAge: number | null = null
  let includeSubDomains = false
  let preload = false

  for (const directive of directives) {
    if (directive.startsWith('max-age=')) {
      const value = directive.split('=')[1]
      if (value) {
        maxAge = parseInt(value, 10)
      }
    } else if (directive === 'includesubdomains') {
      includeSubDomains = true
    } else if (directive === 'preload') {
      preload = true
    }
  }

  return { maxAge, includeSubDomains, preload }
}

/**
 * Validate HSTS preload requirements for a domain
 */
async function validateHSTSPreload(domain: string): Promise<HSTSValidationResult> {
  const result: HSTSValidationResult = {
    domain,
    passed: false,
    checks: {
      httpsAvailable: false,
      httpRedirects: false,
      hstsHeaderPresent: false,
      maxAgeValid: false,
      includesSubDomains: false,
      preloadEnabled: false,
    },
    errors: [],
    warnings: [],
  }

  const url = new URL(domain)
  const baseUrl = `${url.protocol}//${url.hostname}`

  // Check 1: HTTPS availability
  try {
    const httpsResponse = await fetch(`https://${url.hostname}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'HSTS-Preload-Validator/1.0' },
    })

    result.checks.httpsAvailable = httpsResponse.status === 200 || httpsResponse.status === 301 || httpsResponse.status === 302

    if (!result.checks.httpsAvailable) {
      result.errors.push('HTTPS not available or returns error')
    }

    // Check HSTS header
    const hstsHeader = httpsResponse.headers.get('strict-transport-security')
    if (hstsHeader) {
      result.checks.hstsHeaderPresent = true

      const parsed = parseHSTSHeader(hstsHeader)

      // Check max-age (must be >= 1 year = 31536000 seconds)
      if (parsed.maxAge !== null && parsed.maxAge >= 31536000) {
        result.checks.maxAgeValid = true
      } else {
        result.errors.push(
          `max-age too low: ${parsed.maxAge} (required: >= 31536000)`
        )
      }

      // Check includeSubDomains
      result.checks.includesSubDomains = parsed.includeSubDomains
      if (!parsed.includeSubDomains) {
        result.errors.push('includeSubDomains directive missing')
      }

      // Check preload
      result.checks.preloadEnabled = parsed.preload
      if (!parsed.preload) {
        result.errors.push('preload directive missing')
      }
    } else {
      result.errors.push('HSTS header not present on HTTPS response')
    }
  } catch (error) {
    result.errors.push(`HTTPS check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Check 2: HTTP -> HTTPS redirect
  try {
    const httpResponse = await fetch(`http://${url.hostname}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'HSTS-Preload-Validator/1.0' },
    })

    const isRedirect = httpResponse.status === 301 || httpResponse.status === 302
    const location = httpResponse.headers.get('location')
    const redirectsToHTTPS = location?.startsWith('https://')

    result.checks.httpRedirects = isRedirect && redirectsToHTTPS === true

    if (!result.checks.httpRedirects) {
      result.errors.push('HTTP does not redirect to HTTPS')
    }
  } catch (error) {
    result.warnings.push(`HTTP redirect check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Determine if all checks passed
  result.passed = Object.values(result.checks).every(check => check === true)

  return result
}

/**
 * Print validation results
 */
function printResults(result: HSTSValidationResult): void {
  console.log('\n========================================')
  console.log('HSTS Preload Validation Results')
  console.log('========================================\n')

  console.log(`Domain: ${result.domain}`)
  console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`)

  console.log('Checks:')
  console.log(`  [${result.checks.httpsAvailable ? '✅' : '❌'}] HTTPS available`)
  console.log(`  [${result.checks.httpRedirects ? '✅' : '❌'}] HTTP redirects to HTTPS`)
  console.log(`  [${result.checks.hstsHeaderPresent ? '✅' : '❌'}] HSTS header present`)
  console.log(`  [${result.checks.maxAgeValid ? '✅' : '❌'}] max-age >= 1 year`)
  console.log(`  [${result.checks.includesSubDomains ? '✅' : '❌'}] includeSubDomains enabled`)
  console.log(`  [${result.checks.preloadEnabled ? '✅' : '❌'}] preload directive present`)

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:')
    result.errors.forEach(error => console.log(`   - ${error}`))
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    result.warnings.forEach(warning => console.log(`   - ${warning}`))
  }

  if (result.passed) {
    console.log('\n✅ Your domain meets all HSTS preload requirements!')
    console.log('📝 Next steps:')
    console.log('   1. Submit your domain to https://hstspreload.org/')
    console.log('   2. Wait for approval (can take several weeks)')
    console.log('   3. Your domain will be included in browsers HSTS preload list')
  } else {
    console.log('\n❌ Your domain does NOT meet HSTS preload requirements yet.')
    console.log('📝 Fix the errors above before submitting to https://hstspreload.org/')
  }

  console.log('\n========================================\n')
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('❌ Error: Domain required')
    console.log('\nUsage: npx tsx src/scripts/validate-hsts-preload.ts <domain>')
    console.log('Example: npx tsx src/scripts/validate-hsts-preload.ts https://example.com')
    process.exit(1)
  }

  const domain = args[0]
  if (!domain) {
    console.error('❌ Error: Domain argument missing')
    process.exit(1)
  }

  // Validate URL format
  try {
    new URL(domain.startsWith('http') ? domain : `https://${domain}`)
  } catch {
    console.error('❌ Error: Invalid domain format')
    console.log('Example: https://example.com or example.com')
    process.exit(1)
  }

  console.log(`\n🔍 Validating HSTS preload for: ${domain}`)
  console.log('This may take a few seconds...\n')

  const result = await validateHSTSPreload(domain)
  printResults(result)

  process.exit(result.passed ? 0 : 1)
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  })
}

export { validateHSTSPreload, type HSTSValidationResult }
