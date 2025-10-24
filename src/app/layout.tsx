import type { Metadata } from "next";
import { Inter, Roboto, Noto_Sans_SC, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";
import { Providers } from "@/components/providers/SessionProvider";

// 英文字体 - Inter (现代、简洁)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// 中文字体 - Noto Sans SC (思源黑体)
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// 等宽字体 - JetBrains Mono
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "英语AI教学工具",
  description: "为英语教师提供AI驱动的教学材料生成工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${notoSansSC.variable} ${jetBrainsMono.variable}`}>
      <head>
        <Script
          crossOrigin="anonymous"
          src="//unpkg.com/same-runtime/dist/index.global.js"
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
