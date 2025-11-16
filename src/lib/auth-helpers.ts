import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from './supabase-server'

/**
 * 获取当前认证的用户
 * 用于服务器端API路由中检查用户认证状态
 */
export async function getAuthenticatedUser() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return user
  } catch (error) {
    console.error('获取认证用户失败:', error)
    return null
  }
}

/**
 * 在API路由中使用此函数来要求认证
 * 如果用户未认证，返回401错误
 */
export async function requireAuth(request: NextRequest) {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    return NextResponse.json(
      { error: '未认证 - 请先登录' },
      { status: 401 }
    )
  }
  
  return { user }
}

