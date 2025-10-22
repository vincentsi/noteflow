import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'

// Enable bundle analyzer with: ANALYZE=true npm run build
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  /**
   *
   * This creates a minimal standalone server in `.next/standalone/`
   * - Reduces image size (~200MB vs ~1GB)
   * - Faster deployments
   * - Only includes necessary dependencies
   *
   * Required for Dockerfile production stage (COPY --from=builder .next/standalone)
   */
  output: 'standalone',

  /**
   * Bundle optimization strategies
   */
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Enable experimental optimizations
  productionBrowserSourceMaps: false, // Disable source maps in production (smaller bundles)
  poweredByHeader: false, // Remove X-Powered-By header (security + smaller headers)

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'], // Modern formats (better compression)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  /**
   * Webpack configuration for better tree-shaking
   * Optimizes @radix-ui and class-variance-authority bundle size
   */
  webpack: (config) => {
    // Enable tree-shaking for specific packages
    config.optimization = {
      ...config.optimization,
      usedExports: true, // Enable tree-shaking
      sideEffects: false, // Assume no side effects for tree-shaking
    }

    return config
  },

  /**
   * Transpile specific packages for better optimization
   * Forces tree-shaking on these dependencies
   */
  transpilePackages: ['@radix-ui/react-label', 'class-variance-authority'],

  /**
   * Security Headers are now handled by middleware.ts
   * This allows for dynamic nonce generation on each request
   * See: middleware.ts for CSP and other security headers
   */
}

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,

  // Upload source maps to Sentry (only in production)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI or when explicitly enabled
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
}

// Wrap config with Sentry and Bundle Analyzer
export default withSentryConfig(bundleAnalyzer(nextConfig), sentryWebpackPluginOptions)
