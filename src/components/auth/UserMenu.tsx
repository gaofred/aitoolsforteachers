'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Star, Gift, Users, Crown, Calendar, Sparkles, Diamond, History } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name?: string
  avatar_url?: string
  role: 'USER' | 'ADMIN'
  user_points?: {
    points: number
    daily_points?: number
    last_reset_date?: string
    is_member?: boolean
    membership_expires_at?: string
  }
  memberships?: {
    membership_type: 'FREE' | 'PREMIUM' | 'PRO'
  }
}

export function UserMenu() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/user')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      console.log('🚪 用户菜单开始登出')
      const response = await fetch('/api/auth/signout', { method: 'POST' })

      if (response.ok) {
        console.log('✅ 登出API调用成功')
        // 清理本地存储
        if (typeof window !== 'undefined') {
          localStorage.removeItem('english_teaching_user')
          localStorage.removeItem('english_teaching_user_points')
          localStorage.removeItem('sb-access-token')
          localStorage.removeItem('sb-refresh-token')
          console.log('🧹 已清理本地存储')
        }

        setUser(null)
        // 刷新页面以确保状态更新
        router.push('/')
        router.refresh()
      } else {
        console.error('❌ 登出API调用失败')
      }
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
    )
  }

  if (!user) {
    return null
  }

  const getMembershipBadge = (isMember: boolean, membershipType: string, expiresAt?: string) => {
    if (!isMember) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
          <span className="text-gray-600 text-xs font-medium">普通用户</span>
        </div>
      )
    }

    switch (membershipType) {
      case 'PRO':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full shadow-sm">
            <Diamond className="h-3 w-3 text-white" />
            <Sparkles className="h-3 w-3 text-yellow-300" />
            <span className="text-white text-xs font-bold">VIP PRO</span>
          </div>
        )
      case 'PREMIUM':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-sm">
            <Crown className="h-3 w-3 text-white" />
            <span className="text-white text-xs font-bold">VIP PREMIUM</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
            <span className="text-gray-600 text-xs font-medium">普通用户</span>
          </div>
        )
    }
  }

  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;

    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return '已过期';
    if (diffDays === 1) return '明天过期';
    if (diffDays <= 7) return `${diffDays}天后过期`;
    return `${diffDays}天后过期`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url} alt={user.name || user.email} />
            <AvatarFallback>
              {(user.name || user.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || '用户'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="flex flex-col space-y-2">
              {/* 点数显示 */}
              <div className="flex items-center gap-2 px-2 py-1 bg-yellow-50 rounded-lg border border-yellow-200">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-700">
                  {user.user_points?.points || 0} 点数
                </span>
              </div>

              {/* 会员徽章 */}
              <div className="flex items-center justify-center">
                {getMembershipBadge(
                  user.user_points?.is_member || false,
                  user.memberships?.membership_type || 'FREE',
                  user.user_points?.membership_expires_at
                )}
              </div>

              {/* 会员到期时间 */}
              {user.user_points?.is_member && user.user_points?.membership_expires_at && (
                <div className="flex items-center justify-center gap-1 px-2 py-1 bg-purple-50 rounded-lg border border-purple-200">
                  <Calendar className="h-3 w-3 text-purple-500" />
                  <span className="text-xs text-purple-700 font-medium">
                    {getDaysRemaining(user.user_points.membership_expires_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/membership')} className="text-purple-600">
          <Crown className="mr-2 h-4 w-4" />
          <span>会员中心</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/invite')} className="text-purple-600">
          <Gift className="mr-2 h-4 w-4" />
          <span>邀请有礼</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/ai-generation-history')} className="text-blue-600">
          <History className="mr-2 h-4 w-4" />
          <span>历史记录</span>
        </DropdownMenuItem>
        {user.role === 'ADMIN' && (
          <DropdownMenuItem onClick={() => router.push('/admin')}>
            <User className="mr-2 h-4 w-4" />
            <span>管理面板</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}