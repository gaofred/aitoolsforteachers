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
  // 环境自适应CSP配置
  async headers() {
    const isVercel = !!process.env.VERCEL;
    const isProduction = process.env.NODE_ENV === 'production';

    // Vercel环境使用更宽松的策略（Vercel会自动优化）
    if (isVercel) {
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
      ];
    }

    // 阿里云ECS等自管理服务器环境 - 使用最宽松策略确保兼容性
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' 'inline-speculation-rules' data: blob: chrome-extension: chrome-extension:;",
              "style-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;",
              "img-src 'self' 'unsafe-inline' data: https: http: blob: *;",
              "font-src 'self' 'unsafe-inline' data: https: http: blob: *;",
              "connect-src 'self' 'unsafe-inline' https: http: ws: wss: blob: *;",
              "frame-src 'self' 'unsafe-inline' https: http: blob: *;",
              "object-src 'self' 'unsafe-inline' data: blob:;",
              "media-src 'self' 'unsafe-inline' data: https: http: blob: *;",
              "worker-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;",
              "base-uri 'self';",
              "form-action 'self';"
            ].join(' ')
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
