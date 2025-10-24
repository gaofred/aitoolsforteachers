/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.preview.same-app.com"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
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
  // 添加CSP配置来解决白屏问题
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; script-src-elem 'self' 'unsafe-inline' https: http: data: blob:; style-src 'self' 'unsafe-inline' https: http: data: blob:; img-src 'self' data: https: http: blob:; font-src 'self' data: https: http: blob:; connect-src 'self' https: http: ws: wss:; frame-src 'self' https: http:; object-src 'none'; base-uri 'self'; form-action 'self';"
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;
