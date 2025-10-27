'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, Mail, User, Lock, CheckCircle, Gift } from 'lucide-react'

export function EmailRegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // 检测URL中的邀请码
  useEffect(() => {
    const code = searchParams.get('invite_code')
    if (code) {
      setInviteCode(code)
      console.log('检测到邀请码:', code)

      // 将邀请码存储到localStorage，防止页面刷新丢失
      localStorage.setItem('pending_invite_code', code)
    } else {
      // 检查localStorage中是否有待处理的邀请码
      const storedCode = localStorage.getItem('pending_invite_code')
      if (storedCode) {
        setInviteCode(storedCode)
        console.log('从localStorage恢复邀请码:', storedCode)
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setPasswordError('')

    // 前端验证
    if (!email || !password || !confirmPassword) {
      setError('请填写所有必填字段')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setPasswordError('密码至少需要6个字符')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setPasswordError('两次输入的密码不一致')
      setIsLoading(false)
      return
    }

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

      // 立即刷新页面以获取新的登录状态（重要！）
      console.log('注册成功，即将刷新页面以获取登录状态...')

      // 如果有邀请码，等待一下再刷新，让邀请奖励处理有时间完成
      const storedInviteCode = localStorage.getItem('pending_invite_code')
      if (storedInviteCode) {
        console.log('注册成功，开始处理邀请奖励:', storedInviteCode)

        // 获取用户信息
        try {
          console.log('开始获取用户信息...')
          const userResponse = await fetch('/api/auth/user')
          console.log('用户信息请求状态:', userResponse.status)

          if (userResponse.ok) {
            const userData = await userResponse.json()
            console.log('用户信息获取成功:', userData)

            if (userData.id) {
              console.log('开始处理邀请奖励:', { inviteCode: storedInviteCode, userId: userData.id })

              // 调用简化的邀请奖励处理
              const claimResponse = await fetch('/api/invite/simple-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  inviteCode: storedInviteCode,
                  userId: userData.id
                })
              })

              const claimResult = await claimResponse.json()
              console.log('邀请奖励处理结果:', claimResult)

              if (claimResult.success) {
                // 清除待处理的邀请码
                localStorage.removeItem('pending_invite_code')
                console.log('邀请奖励发放成功:', claimResult.data.pointsAwarded)

                // 刷新页面以更新用户积分显示和登录状态
                setTimeout(() => {
                  window.location.reload()
                }, 1000)
              } else {
                console.error('邀请奖励处理失败:', claimResult.error)
              }
            }
          } else {
            console.error('获取用户信息失败:', userResponse.status)
            const errorData = await userResponse.text()
            console.error('错误详情:', errorData)
          }
        } catch (error) {
          console.error('处理邀请奖励时出错:', error)
        }
      }

      // 3秒后刷新页面以获取登录状态
      setTimeout(() => {
        window.location.href = '/'
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

          {/* 如果有邀请码，显示邀请奖励信息 */}
          {inviteCode && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">邀请奖励已激活！</h3>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                您的朋友 <span className="font-semibold">邀请者</span> 将获得30点积分奖励
              </p>
              <p className="text-xs text-gray-600">
                邀请码：{inviteCode}
              </p>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-6">
            您已获得25个初始积分，首次每日签到再获得20积分
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

      {/* 邀请码提示 */}
      {inviteCode && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-purple-900 text-sm">您正在通过邀请注册</h3>
          </div>
          <p className="text-xs text-gray-700 mb-2">
            注册成功后，您的朋友将获得30点积分奖励
          </p>
          <div className="bg-white/60 rounded px-2 py-1">
            <p className="text-xs font-mono text-purple-700">邀请码：{inviteCode}</p>
          </div>
        </div>
      )}

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
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordError('') // 清除密码错误
              }}
              placeholder="请输入密码 (至少6位)"
              className="pl-10 w-full"
              required
              minLength={6}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            确认密码 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setPasswordError('') // 清除密码错误
              }}
              placeholder="请再次输入密码"
              className={`pl-10 w-full ${passwordError ? 'border-red-500' : ''}`}
              required
              minLength={6}
            />
          </div>
          {passwordError && (
            <p className="mt-1 text-sm text-red-500">{passwordError}</p>
          )}
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