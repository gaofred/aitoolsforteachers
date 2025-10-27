import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";
import { Providers } from "@/components/providers/SessionProvider";

// 主要字体 - Inter (现代、简洁)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

// 等宽字体 - JetBrains Mono (用于代码等特殊内容)
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "英语AI教学工具 - 专业的智能英语教学材料生成平台 | AI工具网",
  description: "专业的英语AI教学工具平台，为英语教师提供阅读分析、语法练习、写作指导、词汇学习等多种智能教学工具。支持B篇、C篇、D篇阅读文章分析，自动生成练习题和教学材料。",
  keywords: [
    "英语AI教学工具",
    "英语教学助手",
    "AI教学材料生成",
    "B篇阅读分析",
    "C篇阅读分析",
    "D篇阅读分析",
    "英语语法练习",
    "英语写作指导",
    "词汇学习工具",
    "阅读理解教学",
    "英语教师工具"
  ],
  authors: [{ name: "英语AI教学工具团队" }],
  creator: "英语AI教学工具",
  publisher: "英语AI教学工具",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://aitoolsforteachers.net'),
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://aitoolsforteachers.net',
  },
  openGraph: {
    title: "英语AI教学工具 - 专业的智能英语教学材料生成平台 | AI工具网",
    description: "专业的英语AI教学工具平台，为英语教师提供智能化的教学材料生成服务，包括阅读分析、语法练习、写作指导等。",
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://aitoolsforteachers.net',
    siteName: "英语AI教学工具",
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '英语AI教学工具 - AI驱动的英语教学材料生成平台',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "英语AI教学工具 - 专业的智能英语教学材料生成平台 | AI工具网",
    description: "专业的英语AI教学工具平台，为英语教师提供智能化的教学材料生成服务。",
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <head>
        {/* 暂时移除same-runtime脚本以解决加载问题 */}
        {/* <Script
          crossOrigin="anonymous"
          src="//unpkg.com/same-runtime/dist/index.global.js"
        /> */}

        {/* 结构化数据 - JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "英语AI教学工具",
              "alternateName": "English AI Teaching Tools",
              "description": "专业的英语AI教学工具平台，为英语教师提供阅读分析、语法练习、写作指导、词汇学习等多种智能教学工具。",
              "url": process.env.NEXT_PUBLIC_SITE_URL || 'https://aitoolsforteachers.net',
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "CNY",
                "description": "免费使用基础功能，高级功能需要积分"
              },
              "creator": {
                "@type": "Organization",
                "name": "英语AI教学工具团队"
              },
              "keywords": [
                "英语AI教学工具",
                "英语教学助手",
                "AI教学材料生成",
                "B篇阅读分析",
                "C篇阅读分析",
                "D篇阅读分析",
                "英语语法练习",
                "英语写作指导",
                "词汇学习工具",
                "阅读理解教学",
                "英语教师工具"
              ],
              "featureList": [
                "B篇阅读文章分析",
                "C篇阅读文章分析",
                "D篇阅读词汇整理",
                "语法练习生成",
                "写作指导",
                "词汇学习工具",
                "图片OCR识别",
                "教学材料导出"
              ],
              "screenshot": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aitoolsforteachers.net'}/screenshot-desktop.jpg`,
              "softwareVersion": "1.0.0",
              "datePublished": "2025-10-25",
              "dateModified": "2025-10-25",
              "inLanguage": "zh-CN"
            })
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <Providers>
          <ClientBody>{children}</ClientBody>
        </Providers>
      </body>
    </html>
  );
}
