'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, Mail, User, Lock, CheckCircle } from 'lucide-react'

export function EmailRegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/supabase-basic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
          skipEmailVerification: true
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || '注册失败')
      }

      setIsSuccess(true)

      // 3秒后直接跳转到主页
      setTimeout(() => {
        router.push('/')
      }, 3000)

    } catch (error) {
      setError(error instanceof Error ? error.message : '注册失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="p-8 shadow-xl border-0 bg-white/90 backdrop-blur-lg">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">注册成功！</h2>
          <p className="text-gray-600 mb-4">
            欢迎 <span className="font-semibold text-purple-600">{email}</span> 加入英语AI教学工具
          </p>
          <p className="text-sm text-gray-500 mb-6">
            您已获得25个初始积分，首次每日签到再获得25积分
          </p>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-gray-600">3秒后自动跳转到主页...</span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 shadow-xl border-0 bg-white/90 backdrop-blur-lg">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-purple-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">邮箱注册</h2>
        <p className="text-gray-600 text-sm mt-1">创建您的英语AI教学工具账户</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            姓名 <span className="text-gray-400">(可选)</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的姓名"
              className="pl-10 w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            邮箱地址 <span className="text-red-500">*</span>
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
            密码 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码 (至少6位)"
              className="pl-10 w-full"
              required
              minLength={6}
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
              注册中...
            </>
          ) : (
            '立即注册'
          )}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-center text-sm text-gray-600">
          <p>注册即表示您同意我们的</p>
          <div className="mt-1 space-x-2">
            <a href="#" className="text-purple-600 hover:text-purple-700 hover:underline">服务条款</a>
            <span className="text-gray-400">和</span>
            <a href="#" className="text-purple-600 hover:text-purple-700 hover:underline">隐私政策</a>
          </div>
        </div>
      </div>
    </Card>
  )
}