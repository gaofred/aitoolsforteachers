/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // 服务器外部包配置（Next.js 15.x）
  serverExternalPackages: ['@supabase/supabase-js'],

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    }
    return config
  },
  // distDir: 'build', // 恢复使用默认的 .next 目录以兼容 Vercel
  images: {
    unoptimized: true,
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
        pathname: "/**",
      },
    ],
  },
  // 更灵活的CSP配置以支持各种环境
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' data: blob:;",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' data: blob: chrome-extension: chrome-extension:;",
              "style-src 'self' 'unsafe-inline' data: blob:;",
              "img-src 'self' data: https: http: blob:;",
              "font-src 'self' data: https: blob:;",
              "connect-src 'self' https: http: ws: wss: blob:;",
              "frame-src 'self' https: blob:;",
              "object-src 'none';",
              "base-uri 'self';",
              "form-action 'self';"
            ].join(' ')
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;
