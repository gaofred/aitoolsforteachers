import { useRouter, usePathname } from 'next/navigation'

/**
 * 处理需要登录的重定向逻辑
 * @param customPath 自定义重定向路径，如果不提供则使用当前路径
 */
export function useAuthRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  const redirectToLogin = (customPath?: string) => {
    const redirectPath = customPath || pathname
    const loginUrl = `/auth/signin?redirect=${encodeURIComponent(redirectPath)}`
    router.push(loginUrl)
  }

  return { redirectToLogin }
}

/**
 * 直接的登录重定向函数（用于服务端或非组件环境）
 * @param targetPath 目标路径
 */
export function getLoginRedirectUrl(targetPath: string): string {
  return `/auth/signin?redirect=${encodeURIComponent(targetPath)}`
}