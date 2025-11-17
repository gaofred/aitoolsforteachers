/** @type {import('next').NextConfig} */
const path = require('path');
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  env: {
    STATIC_URL: isProd ? process.env.STATIC_URL : "",
  },
  assetPrefix: isProd ? process.env.STATIC_URL : "",

  // Serverless 部署配置 - 使用传统构建模式配合自定义server.js
  // output: 'standalone', // 暂时注释掉，使用自定义server.js

  // 服务器外部包配置（Next.js 15.x）
  serverExternalPackages: ['@supabase/supabase-js'],

  // 编译器优化
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },

  // 实验性功能（如果需要可以取消注释）
  // experimental: {
  //   optimizePackageImports: ['@supabase/supabase-js']
  // },
  allowedDevOrigins: ["*.preview.same-app.com"],
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
  // 简化CSP配置以避免冲突
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: chrome-extension:; style-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: https: http: blob:; font-src 'self' data: https: blob:; connect-src 'self' https: http: ws: wss:; frame-src 'self' https:; object-src 'none';"
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;
