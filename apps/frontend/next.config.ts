import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'
import withPWA from '@ducanh2912/next-pwa'

// Enable bundle analyzer with: ANALYZE=true npm run build
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

// PWA configuration
const pwa = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  sw: '/sw.js',
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
  },
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
  webpack: config => {
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
   *
   * - Restricted img-src to specific domains (removed https://* wildcard)
   * - Changed default-src from 'self' to 'none' (stricter default)
   * - Added upgrade-insecure-requests to force HTTPS
   *
   * Note: 'unsafe-inline' and 'unsafe-eval' are still required for Next.js 15
   * These will be replaced with nonces when Next.js 16 is released (Q2 2025)
   * See plan/docs/CSP-SECURITY-GUIDE.md for detailed explanation
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'none'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://browser.sentry-cdn.com https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.unsplash.com https://*.pixabay.com https://*.amazonaws.com https://*.amazonws.com https://*.cloudfront.net https://*.googleusercontent.com https://images.unsplash.com https://source.unsplash.com https://files.smashing.media https://sg.dev https://news.ycombinator.com https://hnrss.org https://media.dev.to https://media2.dev.to https://res.cloudinary.com https://picsum.photos https://www.01net.com https://platform.theverge.com https://cdn.thenewstack.io https://*.lestechnophiles.com https://www.docker.com https://www.developpez.com https://files.realpython.com https://freecodecamp.org https://stackoverflow.blog https://reactjs.org https://news.vuejs.org https://blog.angular.io https://svelte.dev https://nextjs.org https://nodejs.org https://devblogs.microsoft.com https://go.dev https://blog.rust-lang.org https://openai.com https://www.anthropic.com https://feeds.feedburner.com https://deepmind.google https://huggingface.co https://machinelearningmastery.com https://towardsdatascience.com https://kubernetes.io https://www.cncf.io https://aws.amazon.com https://cloudblog.withgoogle.com https://thenewstack.io https://reactnative.dev https://medium.com https://www.hackingwithswift.com https://css-tricks.com https://www.smashingmagazine.com https://alistapart.com https://tympanus.net https://github.blog https://netflixtechblog.com https://vercel.com https://stripe.com https://www.theverge.com https://feeds.arstechnica.com https://www.technologyreview.com https://www.numerama.com https://www.nextinpact.com https://www.frenchweb.fr",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://sentry.io https://*.sentry.io https://noteflow-backend-production.up.railway.app http://localhost:3001 ws://localhost:3001",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "manifest-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              'upgrade-insecure-requests',
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

// Wrap config with PWA, Sentry and Bundle Analyzer
export default withSentryConfig(pwa(bundleAnalyzer(nextConfig)), sentryWebpackPluginOptions)
