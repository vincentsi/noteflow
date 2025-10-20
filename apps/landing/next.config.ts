import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  webpack: (config) => {
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    }
    return config
  },
  transpilePackages: ['@radix-ui/react-label', 'class-variance-authority'],
}

export default nextConfig
