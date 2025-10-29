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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'files.smashing.media',
      },
      {
        protocol: 'https',
        hostname: 'sg.dev',
      },
      {
        protocol: 'https',
        hostname: 'news.ycombinator.com',
      },
      {
        protocol: 'https',
        hostname: 'media.dev.to',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.pixabay.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
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
   * Security Headers
   * CSP configured here instead of middleware for better Next.js 15 compatibility
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://browser.sentry-cdn.com https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://* blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://sentry.io https://*.sentry.io https://noteflow-backend-production.up.railway.app http://localhost:3001 ws://localhost:3001",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
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
