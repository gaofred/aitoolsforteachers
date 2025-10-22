"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"
import { UserMenu } from "@/components/auth/UserMenu"
import { toast } from "react-hot-toast"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // 检查URL参数中的错误信息
    const error = searchParams.get('error')
    if (error) {
      switch (error) {
        case 'auth_failed':
          toast.error('Google认证失败')
          break
        case 'auth_init_failed':
          toast.error('Google登录初始化失败')
          break
        case 'auth_error':
          toast.error('认证过程中发生错误')
          break
        case 'google_signin_failed':
          toast.error('Google登录失败')
          break
        default:
          toast.error('登录失败')
      }
    }

    // 检查是否已经登录
    checkCurrentUser()
  }, [searchParams])

  const checkCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/user')
      if (response.ok) {
        const userData = await response.json()
        setCurrentUser(userData)
      }
    } catch (error) {
      // 用户未登录或其他错误
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("登录失败，请检查邮箱和密码")
      } else {
        toast.success("登录成功！")
        router.push("/")
        router.refresh()
      }
    } catch (error) {
      toast.error("登录失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  // 如果用户已经登录，显示登录成功状态
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <UserMenu />
          </div>
          <Card className="p-8 shadow-xl border-0 bg-white/90 backdrop-blur-lg">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">登录成功</h1>
            <p className="text-gray-600 mb-6">
              欢迎回来，{currentUser.name || currentUser.email}！
            </p>
            <Button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-3 rounded-lg transition-all duration-200"
            >
              进入主页
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-xl">EN</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">欢迎回来</h1>
          <p className="text-gray-600">登录您的英语AI教学工具账户</p>
        </div>

        {/* 登录表单 */}
        <Card className="p-6 shadow-xl border-0 bg-white/90 backdrop-blur-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入您的邮箱"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入您的密码"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">或者</span>
            </div>
          </div>

          <GoogleSignInButton />

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              还没有账户？{" "}
              <Link
                href="/auth/signup"
                className="text-purple-600 hover:text-purple-700 font-medium hover:underline"
              >
                立即注册
              </Link>
            </p>
          </div>
        </Card>

        {/* 底部信息 */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            登录即表示您同意我们的{" "}
            <a href="#" className="text-purple-600 hover:underline">服务条款</a>{" "}
            和{" "}
            <a href="#" className="text-purple-600 hover:underline">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  )
}