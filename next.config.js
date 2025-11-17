/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  env: {
    STATIC_URL: isProd ? process.env.STATIC_URL : "",
  },
  assetPrefix: isProd ? process.env.STATIC_URL : "",

  // Serverless 部署配置
  output: 'standalone',

  // 服务器外部包配置（Next.js 15.x）
  serverExternalPackages: ['@supabase/supabase-js'],
  allowedDevOrigins: ["*.preview.same-app.com"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
