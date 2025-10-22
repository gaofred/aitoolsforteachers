"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmailRegisterForm } from "@/components/auth/EmailRegisterForm"
import { Loader2, User } from "lucide-react"

function SignUpContent() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkCurrentUser()
  }, [])

  const checkCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/user')
      if (response.ok) {
        const userData = await response.json()
        setCurrentUser(userData)
      }
    } catch (error) {
      // 用户未登录或其他错误
    } finally {
      setIsLoadingUser(false)
    }
  }

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-xl border-0 bg-white/90 backdrop-blur-lg">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              欢迎回来，{currentUser.name || currentUser.email}！
            </h2>
            <p className="text-gray-600 mb-6">您已经登录了账户</p>
            <Button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-3 rounded-lg transition-all duration-200"
            >
              进入主页
            </Button>
                      </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo和标题 */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">AI</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">英语AI教学工具</h1>
          <p className="text-gray-600">创建您的账户</p>
        </div>

        {/* 邮箱注册表单 */}
        <EmailRegisterForm />

        {/* 分隔线 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">或已有账户？</span>
          </div>
        </div>

        {/* 登录链接 */}
        <Card className="p-6 shadow-xl border-0 bg-white/90 backdrop-blur-lg">
          <div className="text-center">
            <p className="text-gray-600 mb-4">已有账户？</p>
            <Link href="/auth/signin">
              <Button
                variant="outline"
                className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 font-medium"
              >
                立即登录
              </Button>
            </Link>
          </div>
        </Card>

        {/* 页脚信息 */}
        <div className="text-center text-sm text-gray-500">
          <p>注册即表示您同意我们的</p>
          <div className="mt-1 space-x-2">
            <Link href="#" className="text-purple-600 hover:text-purple-700 hover:underline">
              服务条款
            </Link>
            <span className="text-gray-400">和</span>
            <Link href="#" className="text-purple-600 hover:text-purple-700 hover:underline">
              隐私政策
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignUp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}