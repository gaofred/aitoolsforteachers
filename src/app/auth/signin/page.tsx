'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

function SignInPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get('message')
    const errorParam = searchParams.get('error')

    if (message) {
      // 显示成功消息
    }

    if (errorParam) {
      setError(errorParam.replace(/_/g, ' '))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      console.log('开始登录请求...')
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('登录响应状态:', response.status)
      console.log('响应headers:', Object.fromEntries(response.headers.entries()))
      
      // 检查响应是否有效
      if (!response.ok) {
        let errorMessage = '登录失败'
        try {
          // 先读取原始文本
          const responseText = await response.text()
          console.log('响应原始文本:', responseText)
          
          // 尝试解析JSON
          let errorData: { error?: string; rawText?: string } = {}
          if (responseText) {
            try {
              errorData = JSON.parse(responseText)
            } catch (e) {
              console.error('JSON解析失败:', e)
              errorData = { rawText: responseText }
            }
          }

          errorMessage = errorData.error || errorMessage
          console.error('登录错误详情:', errorData)
        } catch (parseError) {
          console.error('无法解析错误响应:', parseError)
          errorMessage = `服务器错误 (${response.status})`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('登录成功:', data)

      // 登录成功，重定向到原始请求页面或主页
      const redirectTo = searchParams.get('redirect') || '/'
      window.location.href = redirectTo + (redirectTo.includes('?') ? '&' : '?') + 'signed_in=true'

    } catch (error) {
      console.error('登录异常:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('无法连接到服务器，请检查网络连接或确保开发服务器正在运行')
      } else {
        setError(error instanceof Error ? error.message : '登录失败，请稍后重试')
      }
    } finally {
      setIsLoading(false)
    }
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
          <p className="text-gray-600">登录您的账户</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 成功提示 */}
        {searchParams.get('message') && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">{searchParams.get('message')}</p>
          </div>
        )}

        {/* Google登录按钮 */}
        <GoogleSignInButton />

        {/* 分隔线 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">或使用邮箱登录</span>
          </div>
        </div>

        {/* 邮箱登录表单 */}
        <Card className="p-6 shadow-xl border-0 bg-white/90 backdrop-blur-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入您的邮箱"
                  className="pl-10 w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="pl-10 w-full"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-3 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/signup"
              className="text-purple-600 hover:text-purple-700 hover:underline text-sm"
            >
              还没有账户？立即注册
            </Link>
          </div>
        </Card>

        {/* 页脚信息 */}
        <div className="text-center text-sm text-gray-500">
          <p>登录即表示您同意我们的</p>
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

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  )
}