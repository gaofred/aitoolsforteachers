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
import { User, LogOut, Star, Gift, Users, Crown, Calendar } from 'lucide-react'

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
      await fetch('/api/auth/signout', { method: 'POST' })
      setUser(null)
      router.push('/')
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
      return <span className="text-gray-600 text-xs">FREE</span>
    }

    switch (membershipType) {
      case 'PRO':
        return (
          <div className="flex items-center gap-1">
            <Crown className="h-3 w-3 text-purple-600" />
            <span className="text-purple-600 text-xs font-semibold">PRO</span>
          </div>
        )
      case 'PREMIUM':
        return (
          <div className="flex items-center gap-1">
            <Crown className="h-3 w-3 text-blue-600" />
            <span className="text-blue-600 text-xs font-semibold">PREMIUM</span>
          </div>
        )
      default:
        return <span className="text-gray-600 text-xs">FREE</span>
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
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <Star className="h-3 w-3 text-yellow-500" />
                <span className="text-xs">{user.user_points?.points || 0} 积分</span>
                {getMembershipBadge(
                  user.user_points?.is_member || false,
                  user.memberships?.membership_type || 'FREE',
                  user.user_points?.membership_expires_at
                )}
              </div>
              {user.user_points?.is_member && user.user_points?.membership_expires_at && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{getDaysRemaining(user.user_points.membership_expires_at)}</span>
                </div>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>个人资料</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/membership')} className="text-purple-600">
          <Crown className="mr-2 h-4 w-4" />
          <span>会员中心</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/invite')} className="text-purple-600">
          <Gift className="mr-2 h-4 w-4" />
          <span>邀请有礼</span>
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