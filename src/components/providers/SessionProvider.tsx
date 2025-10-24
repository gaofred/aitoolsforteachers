"use client"

import { usePathname } from "next/navigation"
import { UserProvider } from "@/lib/user-context"

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // 如果是admin页面，直接返回children，完全避免NextAuth相关组件
  if (pathname?.startsWith('/admin-7654')) {
    return <>{children}</>
  }

  // 非admin页面，使用UserProvider管理用户状态
  return <UserProvider>{children}</UserProvider>
}